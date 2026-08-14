import type { ScanPhase, ScanProgress } from '@luman/domain';
import { computeFraction } from '@luman/domain';

/**
 * Minimum gap between emitted progress updates, in milliseconds.
 *
 * `docs/features/01_dashboard.md` requires the dashboard never to freeze during
 * a scan, and a scan enumerating tens of thousands of entries would otherwise
 * publish an event per entry — flooding the bus and forcing a React render per
 * file. 100ms is roughly six frames: frequent enough to look live, rare enough
 * that emission cost stays negligible.
 */
export const PROGRESS_THROTTLE_MS = 100;

export interface ProgressReporterOptions {
  readonly emit: (progress: ScanProgress) => void;
  /** Injected so tests can drive time deterministically. */
  readonly now?: () => number;
  readonly throttleMs?: number;
}

/**
 * Accumulates scan progress and emits it at a bounded rate.
 *
 * ## Guarantees
 *
 * - **Counters never decrease.** `itemsSeen` and `bytesSeen` only accumulate; a
 *   progress bar that goes backwards reads as a bug to the user.
 * - **`fraction` is `null` until a total is genuinely known.** It is never
 *   fabricated from items-seen-so-far — a denominator that grows as discovery
 *   proceeds makes the bar jump backwards, which is worse than an indeterminate
 *   one (see `ScanProgress.fraction`).
 * - **Nothing is emitted after `finish()`.** A plugin that ignored its
 *   cancellation signal and reports late cannot resurrect a settled scan.
 * - **No timers.** Throttling is by timestamp comparison, so there is no
 *   interval to leak and nothing to clean up on settle.
 */
export class ProgressReporter {
  readonly #emit: (progress: ScanProgress) => void;
  readonly #now: () => number;
  readonly #throttleMs: number;

  #phase: ScanPhase = 'queued';
  #itemsSeen = 0;
  #bytesSeen = 0;
  #currentPath: string | null = null;
  #total: number | null = null;
  #lastEmitAt = Number.NEGATIVE_INFINITY;
  #finished = false;

  constructor(options: ProgressReporterOptions) {
    this.#emit = options.emit;
    this.#now = options.now ?? (() => Date.now());
    this.#throttleMs = options.throttleMs ?? PROGRESS_THROTTLE_MS;
  }

  /** A phase change is always emitted — they are rare and meaningful. */
  setPhase(phase: ScanPhase): void {
    if (this.#finished || phase === this.#phase) return;
    this.#phase = phase;
    this.#publish(true);
  }

  /**
   * Record work done. Emits at most once per throttle window.
   *
   * Negative deltas are ignored rather than subtracted, so a miscounting plugin
   * cannot make the counters go backwards.
   */
  advance(input: { items?: number; bytes?: number; path?: string | null }): void {
    if (this.#finished) return;

    this.#itemsSeen += Math.max(0, input.items ?? 0);
    this.#bytesSeen += Math.max(0, input.bytes ?? 0);
    if (input.path !== undefined) this.#currentPath = input.path;

    this.#publish(false);
  }

  /**
   * Declare the total once it is genuinely known.
   *
   * A non-positive or non-finite total is ignored: `computeFraction` would
   * report `null` for it anyway, and accepting it would only make the state
   * harder to reason about.
   */
  setTotal(total: number): void {
    if (this.#finished || !Number.isFinite(total) || total <= 0) return;
    this.#total = total;
  }

  /** Final emission, bypassing the throttle. Further calls do nothing. */
  finish(phase: ScanPhase = 'finalizing'): void {
    if (this.#finished) return;
    this.#phase = phase;
    this.#currentPath = null;
    this.#publish(true);
    this.#finished = true;
  }

  /** Current state, without emitting. */
  snapshot(): ScanProgress {
    return {
      phase: this.#phase,
      itemsSeen: this.#itemsSeen,
      bytesSeen: this.#bytesSeen,
      currentPath: this.#currentPath,
      fraction: computeFraction(this.#itemsSeen, this.#total),
    };
  }

  get finished(): boolean {
    return this.#finished;
  }

  #publish(force: boolean): void {
    const now = this.#now();
    if (!force && now - this.#lastEmitAt < this.#throttleMs) return;
    this.#lastEmitAt = now;
    this.#emit(this.snapshot());
  }
}
