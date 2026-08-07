import type { HistoryService, ActivitySummary } from '@luman/core';

export interface MockHistoryOptions {
  readonly delayMs?: number;
  readonly failWith?: Error;
  readonly summary?: ActivitySummary | null;
}

const DEFAULT_SUMMARY: ActivitySummary = {
  lastScanAt: '2026-08-06T21:14:00.000Z',
  lastCleanupAt: '2026-08-01T09:32:00.000Z',
  totalRecoveredBytes: 132_070_244_352, // ~123 GB lifetime
};

/** Mock HistoryService implementing the HistoryService contract. */
export class MockHistoryService implements HistoryService {
  constructor(private readonly options: MockHistoryOptions = {}) {}

  async getActivitySummary(): Promise<ActivitySummary | null> {
    await delay(this.options.delayMs);
    if (this.options.failWith) throw this.options.failWith;
    return this.options.summary === undefined ? DEFAULT_SUMMARY : this.options.summary;
  }
}

function delay(ms?: number): Promise<void> {
  if (!ms) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}
