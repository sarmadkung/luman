import type { Finding, Scan, SafetyLevel, ScanProgress } from '@luman/domain';
import type { ScannerPlugin } from '@luman/plugin-sdk';
import type {
  EventBus,
  Logger,
  PathGuard,
  ScanEngine,
  ScanRequest,
  ScanRunHandle,
  Unsubscribe,
} from '@luman/core';
import { AppError } from '@luman/core';
import { ProgressReporter } from './progress-reporter';

/**
 * Severity order. **The most cautious value wins** on a dedup collision — a
 * duplicate must never become more permissive than its most careful sighting.
 */
const SEVERITY_ORDER: Record<SafetyLevel, number> = { safe: 0, caution: 1, unsafe: 2 };

export interface PluginFailure {
  readonly pluginId: string;
  readonly reason: string;
}

export interface ScanOutcome {
  readonly scan: Scan;
  readonly findings: readonly Finding[];
  readonly failures: readonly PluginFailure[];
}

export interface DefaultScanEngineOptions {
  readonly plugins: readonly ScannerPlugin[];
  /**
   * The guard every reported path passes through. It carries the `FileSystem`
   * port itself, which is why the engine takes no separate filesystem: one
   * component owning the read capability is easier to reason about than two.
   */
  readonly guard: PathGuard;
  readonly events: EventBus;
  readonly logger: Logger;
  /** Per-plugin timeout. A hung plugin must not hang the scan. */
  readonly pluginTimeoutMs?: number;
  /** How many plugins run at once. Bounded so a scan cannot swamp the machine. */
  readonly concurrency?: number;
  /** Injected so ids and timestamps stay deterministic in tests. */
  readonly now?: () => string;
  readonly createId?: () => string;
  /** Minimum gap between progress emissions. See PROGRESS_THROTTLE_MS. */
  readonly progressThrottleMs?: number;
  /** Monotonic clock for throttling. Injected so tests can drive it. */
  readonly monotonic?: () => number;
}

const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_CONCURRENCY = 4;

/**
 * Drives scanner plugins over the filesystem port.
 *
 * ## What it cannot do
 *
 * The engine hands plugins only the `ScanContext` the SDK defines —
 * `{ scan, logger, signal }`, with **no filesystem field**. Widening that
 * context to carry the port would silently grant every plugin a broader
 * capability than the SDK documents, so plugins report paths and the engine
 * checks them.
 *
 * Read access lives entirely in `PathGuard`, which owns the `FileSystem` port —
 * and that port has no mutation method, so nothing in this pipeline can modify
 * anything.
 *
 * ## Resilience
 *
 * A plugin that throws is recorded as a failure and the scan continues with
 * partial results. A plugin that hangs is timed out. "Every plugin failed" is a
 * `failed` scan; "no plugins registered" is a `completed` scan with no findings
 * — an empty toolbox is not an error.
 */
export class DefaultScanEngine implements ScanEngine {
  readonly #plugins: readonly ScannerPlugin[];
  readonly #guard: PathGuard;
  readonly #events: EventBus;
  readonly #logger: Logger;
  readonly #timeoutMs: number;
  readonly #concurrency: number;
  readonly #now: () => string;
  readonly #createId: () => string;
  readonly #progressThrottleMs: number | undefined;
  readonly #monotonic: (() => number) | undefined;
  readonly #controllers = new Map<string, AbortController>();

  constructor(options: DefaultScanEngineOptions) {
    this.#plugins = options.plugins;
    this.#guard = options.guard;
    this.#events = options.events;
    this.#logger = options.logger;
    this.#timeoutMs = options.pluginTimeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.#concurrency = Math.max(1, options.concurrency ?? DEFAULT_CONCURRENCY);
    this.#now = options.now ?? (() => new Date().toISOString());
    this.#createId = options.createId ?? (() => globalThis.crypto.randomUUID());
    this.#progressThrottleMs = options.progressThrottleMs;
    this.#monotonic = options.monotonic;
  }

  async run(request: ScanRequest = {}): Promise<ScanRunHandle> {
    const scanId = this.#createId();
    const controller = new AbortController();
    this.#controllers.set(scanId, controller);

    const scan: Scan = {
      id: scanId,
      startedAt: this.#now(),
      completedAt: null,
      status: 'running',
      plugins: this.#selected(request).map((plugin) => plugin.metadata.id),
    };

    this.#events.publish('ScanRequested', { scanId, roots: request.roots ?? [] });

    const settled = this.#execute(scan, request, controller);

    return {
      scanId,
      scan,
      settled: async () => (await settled).scan,
      cancel: async () => {
        await this.cancel(scanId);
      },
    };
  }

  async cancel(scanId: string): Promise<void> {
    // Cancelling an unknown or finished scan is a no-op, never a failure.
    this.#controllers.get(scanId)?.abort();
  }

  /**
   * Observe one scan's progress.
   *
   * A thin filter over the bus rather than a second delivery mechanism — one
   * source of truth for progress means the UI and any other subscriber cannot
   * disagree. Subscribing to an unknown or finished scan is not an error; the
   * listener is simply never called.
   */
  subscribeProgress(scanId: string, listener: (progress: ScanProgress) => void): Unsubscribe {
    return this.#events.subscribe('ScanProgressed', (payload) => {
      if (payload.scanId === scanId) listener(payload.progress);
    });
  }

  /** The full outcome, for callers that need findings rather than just a Scan. */
  async runToCompletion(request: ScanRequest = {}): Promise<ScanOutcome> {
    const handle = await this.run(request);
    await handle.settled();
    const outcome = this.#outcomes.get(handle.scanId);
    if (outcome === undefined) throw new AppError('Scan outcome missing', { code: 'SCAN_FAILED' });
    return outcome;
  }

  /** The recorded outcome for a settled scan, or undefined if still running. */
  outcomeOf(scanId: string): ScanOutcome | undefined {
    return this.#outcomes.get(scanId);
  }

  readonly #outcomes = new Map<string, ScanOutcome>();

  #selected(request: ScanRequest): readonly ScannerPlugin[] {
    const ids = request.pluginIds;
    if (ids === undefined || ids.length === 0) return this.#plugins;
    return this.#plugins.filter((plugin) => ids.includes(plugin.metadata.id));
  }

  async #execute(
    scan: Scan,
    request: ScanRequest,
    controller: AbortController,
  ): Promise<ScanOutcome> {
    const plugins = this.#selected(request);
    const collected: Finding[] = [];
    const failures: PluginFailure[] = [];

    const progress = new ProgressReporter({
      emit: (snapshot) => {
        this.#events.publish('ScanProgressed', { scanId: scan.id, progress: snapshot });
      },
      throttleMs: this.#progressThrottleMs,
      now: this.#monotonic,
    });
    // The plugin count is a real total: each one completing is a known unit of
    // work. Discovery within a plugin has no knowable total, so `fraction`
    // stays null until this is set.
    progress.setTotal(plugins.length);
    progress.setPhase('enumerating');

    await this.#forEachBounded(plugins, async (plugin) => {
      try {
        const findings = await this.#runPlugin(plugin, scan, controller.signal);
        collected.push(...findings);
        progress.advance({
          items: 1,
          bytes: findings.reduce((sum, item) => sum + item.size, 0),
        });
      } catch (error) {
        // One plugin failing must not fail the scan.
        failures.push({ pluginId: plugin.metadata.id, reason: describe(error) });
        progress.advance({ items: 1 });
        this.#logger.warn('Scanner plugin failed', {
          plugin: plugin.metadata.id,
          reason: describe(error),
        });
      }
    });

    const cancelled = controller.signal.aborted;
    progress.setPhase('analyzing');

    // A cancelled scan discards everything it gathered. Persisting partial
    // results would later make it indistinguishable from a completed scan to
    // `getLatestScan()`, which is how a user ends up acting on half a picture.
    const findings = cancelled ? [] : dedupe(await this.#admit(collected));

    const status = resolveStatus({
      cancelled,
      pluginCount: plugins.length,
      failureCount: failures.length,
    });

    // Final emission, then the reporter refuses everything — a plugin that
    // ignored its signal cannot report progress into a settled scan.
    progress.finish();

    const finished: Scan = { ...scan, status, completedAt: this.#now() };
    this.#controllers.delete(scan.id);

    if (status === 'cancelled') {
      this.#events.publish('ScanCancelled', { scanId: scan.id });
    } else if (status === 'failed') {
      this.#events.publish('ScanFailed', { scanId: scan.id, code: 'SCAN_FAILED' });
    } else {
      this.#events.publish('ScanCompleted', { scanId: scan.id, findingCount: findings.length });
    }

    const outcome: ScanOutcome = { scan: finished, findings, failures };
    this.#outcomes.set(scan.id, outcome);
    return outcome;
  }

  /**
   * Run one plugin under a timeout.
   *
   * The timer is cleared on every path — a leaked handle keeps a test process
   * alive and turns a fast suite into a hanging one.
   */
  async #runPlugin(
    plugin: ScannerPlugin,
    scan: Scan,
    signal: AbortSignal,
  ): Promise<readonly Finding[]> {
    let timer: ReturnType<typeof setTimeout> | undefined;

    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        reject(
          new AppError(`Scanner plugin timed out: ${plugin.metadata.id}`, {
            code: 'SCAN_FAILED',
            context: { plugin: plugin.metadata.id, timeoutMs: this.#timeoutMs },
          }),
        );
      }, this.#timeoutMs);
    });

    try {
      // ScanContext is exactly what the SDK defines. No filesystem field.
      return await Promise.race([plugin.scan({ scan, logger: this.#logger, signal }), timeout]);
    } finally {
      if (timer !== undefined) clearTimeout(timer);
    }
  }

  /**
   * Drop any finding whose path the guard refuses.
   *
   * A rejected path is logged and dropped, never surfaced: a plugin reporting a
   * protected location must not be able to put it in front of the user.
   */
  async #admit(findings: readonly Finding[]): Promise<readonly Finding[]> {
    const admitted: Finding[] = [];

    for (const finding of findings) {
      const resolved = await this.#guard.resolve(finding.path);
      if (!resolved.ok) {
        this.#logger.debug('Dropped a finding the guard refused', {
          plugin: finding.plugin,
          reason: String(resolved.error.context?.reason ?? resolved.error.code),
        });
        continue;
      }
      // Carry the resolved path forward so dedup compares real locations.
      admitted.push({ ...finding, path: resolved.value });
    }

    return admitted;
  }

  /** Run tasks with a bounded number in flight. */
  async #forEachBounded<T>(items: readonly T[], run: (item: T) => Promise<void>): Promise<void> {
    const queue = [...items];
    const workers = Array.from({ length: Math.min(this.#concurrency, queue.length) }, async () => {
      for (;;) {
        const next = queue.shift();
        if (next === undefined) return;
        await run(next);
      }
    });
    await Promise.all(workers);
  }
}

/**
 * Collapse duplicates by resolved path.
 *
 * Keyed on the **resolved** path, not the reported one, or two plugins
 * reporting the same file through different symlinks would both survive. On a
 * collision the most cautious safety level wins.
 */
function dedupe(findings: readonly Finding[]): readonly Finding[] {
  const byPath = new Map<string, Finding>();

  for (const finding of findings) {
    const existing = byPath.get(finding.path);
    if (existing === undefined) {
      byPath.set(finding.path, finding);
      continue;
    }
    if (SEVERITY_ORDER[finding.safety] > SEVERITY_ORDER[existing.safety]) {
      byPath.set(finding.path, finding);
    }
  }

  return [...byPath.values()];
}

/**
 * Final status.
 *
 * "Every plugin failed" and "no plugins registered" are different outcomes: the
 * first is a failure, the second is a completed scan that found nothing. An
 * empty toolbox is not an error.
 */
function resolveStatus(input: {
  readonly cancelled: boolean;
  readonly pluginCount: number;
  readonly failureCount: number;
}): Scan['status'] {
  if (input.cancelled) return 'cancelled';
  if (input.pluginCount === 0) return 'completed';
  return input.failureCount === input.pluginCount ? 'failed' : 'completed';
}

function describe(error: unknown): string {
  if (error instanceof AppError) return error.code;
  if (error instanceof Error) return error.name;
  return 'unknown';
}
