import type { StorageService, StorageOverview } from '@luman/core';

export interface MockStorageOptions {
  /** Simulated latency in ms. */
  readonly delayMs?: number;
  /** Force an error to exercise the error state. */
  readonly failWith?: Error;
  /** Return null to exercise the empty/missing state. */
  readonly overview?: StorageOverview | null;
}

const DEFAULT_OVERVIEW: StorageOverview = {
  volume: 'Macintosh HD',
  totalBytes: 494_384_795_648, // ~460 GB
  usedBytes: 356_241_000_000, // ~331 GB
  freeBytes: 138_143_795_648, // ~128 GB
  reclaimableBytes: 48_318_382_080, // ~45 GB
};

/**
 * Mock StorageService — returns realistic figures so the dashboard can be built
 * and reviewed before real storage introspection exists (Sprint 3). Implements
 * the Sprint 1 StorageService contract exactly.
 */
export class MockStorageService implements StorageService {
  constructor(private readonly options: MockStorageOptions = {}) {}

  async getOverview(): Promise<StorageOverview | null> {
    await delay(this.options.delayMs);
    if (this.options.failWith) throw this.options.failWith;
    return this.options.overview === undefined ? DEFAULT_OVERVIEW : this.options.overview;
  }
}

function delay(ms?: number): Promise<void> {
  if (!ms) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}
