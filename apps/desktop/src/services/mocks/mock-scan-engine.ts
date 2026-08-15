import type { Finding, Scan, ScanProgress } from '@luman/domain';
import { AppError, type ScanEngine, type ScanRunHandle, type Unsubscribe } from '@luman/core';
import { FIXTURE_SIZES, FIXTURE_TIMES } from './synthetic-tree';

export interface MockScanEngineOptions {
  /** Delay before the scan settles, so the Scanning state stays demonstrable. */
  readonly delayMs?: number;
  /** Findings to report. Empty exercises the Empty state. */
  readonly findings?: readonly Finding[];
  /** Force a failure to exercise the Error state. */
  readonly failWith?: AppError;
  /** Progress snapshots to emit before settling. */
  readonly progress?: readonly ScanProgress[];
}

/** Fixed findings — every field a literal, so two runs are identical. */
export const MOCK_FINDINGS: readonly Finding[] = [
  {
    id: 'finding-cache-001',
    scanId: 'scan-fixture-001',
    category: 'cache',
    path: '/tmp/example-build-cache/chunk-01.tmp',
    size: FIXTURE_SIZES.tempChunk,
    safeToDelete: true,
    safety: 'safe',
    plugin: 'plugin-temp',
  },
  {
    id: 'finding-log-001',
    scanId: 'scan-fixture-001',
    category: 'logs',
    path: '/Users/example/projects/demo/build.log',
    size: FIXTURE_SIZES.logFile,
    safeToDelete: true,
    safety: 'safe',
    plugin: 'plugin-logs',
  },
  {
    id: 'finding-large-001',
    scanId: 'scan-fixture-001',
    category: 'large-file',
    path: '/Users/example/projects/media/render.mov',
    size: FIXTURE_SIZES.largeVideo,
    // Large is not the same as disposable — a render could be the only copy.
    safeToDelete: false,
    safety: 'caution',
    plugin: 'plugin-large-files',
  },
];

export const MOCK_PROGRESS: readonly ScanProgress[] = [
  { phase: 'queued', itemsSeen: 0, bytesSeen: 0, currentPath: null, fraction: null },
  {
    phase: 'enumerating',
    itemsSeen: 120,
    bytesSeen: FIXTURE_SIZES.cacheBlob,
    currentPath: '/Users/example/projects/demo',
    fraction: null, // Total unknown during discovery.
  },
  {
    phase: 'analyzing',
    itemsSeen: 240,
    bytesSeen: FIXTURE_SIZES.largeVideo,
    currentPath: '/Users/example/projects/media',
    fraction: 0.75,
  },
  {
    phase: 'finalizing',
    itemsSeen: 240,
    bytesSeen: FIXTURE_SIZES.largeVideo,
    currentPath: null,
    fraction: 1,
  },
];

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Mock `ScanEngine`.
 *
 * Drives the Scanning state through fixed progress snapshots and settles into
 * Success, Empty, Error, or Cancelled. Timestamps are literals from
 * `FIXTURE_TIMES`, so a scan run twice produces identical records.
 *
 * Like every other scan path in this sprint, it cannot delete anything: it
 * reports findings and holds no capability beyond that.
 */
export class MockScanEngine implements ScanEngine {
  readonly #options: MockScanEngineOptions;
  readonly #listeners = new Map<string, Set<(progress: ScanProgress) => void>>();
  #cancelled = new Set<string>();

  constructor(options: MockScanEngineOptions = {}) {
    this.#options = options;
  }

  async run(): Promise<ScanRunHandle> {
    const scanId = 'scan-fixture-001';
    this.#cancelled.delete(scanId);

    const scan: Scan = {
      id: scanId,
      startedAt: FIXTURE_TIMES.recent,
      completedAt: null,
      status: 'running',
      plugins: ['plugin-temp', 'plugin-logs', 'plugin-large-files'],
    };

    const settled = this.#execute(scan);

    return {
      scanId,
      scan,
      settled: () => settled,
      cancel: async () => {
        await this.cancel(scanId);
      },
    };
  }

  async cancel(scanId: string): Promise<void> {
    this.#cancelled.add(scanId);
  }

  subscribeProgress(scanId: string, listener: (progress: ScanProgress) => void): Unsubscribe {
    const set = this.#listeners.get(scanId) ?? new Set();
    set.add(listener);
    this.#listeners.set(scanId, set);
    return () => {
      set.delete(listener);
      if (set.size === 0) this.#listeners.delete(scanId);
    };
  }

  /** The findings this scan would report, for tests and Sprint 06. */
  findings(): readonly Finding[] {
    return this.#options.findings ?? MOCK_FINDINGS;
  }

  async #execute(scan: Scan): Promise<Scan> {
    for (const snapshot of this.#options.progress ?? MOCK_PROGRESS) {
      if (this.#cancelled.has(scan.id)) break;
      for (const listener of this.#listeners.get(scan.id) ?? []) listener(snapshot);
    }

    await delay(this.#options.delayMs ?? 0);

    if (this.#cancelled.has(scan.id)) {
      return { ...scan, status: 'cancelled', completedAt: FIXTURE_TIMES.newest };
    }
    if (this.#options.failWith) {
      return { ...scan, status: 'failed', completedAt: FIXTURE_TIMES.newest };
    }
    return { ...scan, status: 'completed', completedAt: FIXTURE_TIMES.newest };
  }
}

/** The Error state, ready to drop into a test. */
export const scanFailedError = (): AppError =>
  new AppError('Scan failed', {
    code: 'SCAN_FAILED',
    userMessage: 'Luman could not finish that scan.',
  });
