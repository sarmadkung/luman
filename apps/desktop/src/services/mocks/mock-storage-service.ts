import type { StorageService, StorageOverview, StorageCategory } from '@luman/core';

export interface MockStorageOptions {
  /** Simulated latency in ms. */
  readonly delayMs?: number;
  /** Force an error to exercise the error state. */
  readonly failWith?: Error;
  /** Return null to exercise the empty/missing state. */
  readonly overview?: StorageOverview | null;
  /** Return null to exercise the breakdown's empty state. */
  readonly breakdown?: readonly StorageCategory[] | null;
}

const DEFAULT_OVERVIEW: StorageOverview = {
  volume: 'Macintosh HD',
  totalBytes: 494_384_795_648, // ~460 GB
  usedBytes: 356_241_000_000, // ~331 GB
  freeBytes: 138_143_795_648, // ~128 GB
  reclaimableBytes: 48_318_382_080, // ~45 GB
};

/**
 * Categories MUST sum to DEFAULT_OVERVIEW.usedBytes — the breakdown and the
 * Storage Used card are on screen together and must not contradict each other.
 * `other` absorbs the remainder so the invariant holds exactly; a unit test
 * enforces it.
 */
const NAMED_CATEGORIES: readonly StorageCategory[] = [
  { key: 'system', label: 'System', bytes: 48_530_000_000 },
  { key: 'apps', label: 'Apps', bytes: 129_400_000_000 },
  { key: 'documents', label: 'Documents', bytes: 86_010_000_000 },
  { key: 'media', label: 'Media', bytes: 61_200_000_000 },
];

const DEFAULT_BREAKDOWN: readonly StorageCategory[] = [
  ...NAMED_CATEGORIES,
  {
    key: 'other',
    label: 'Other',
    bytes: DEFAULT_OVERVIEW.usedBytes - NAMED_CATEGORIES.reduce((sum, c) => sum + c.bytes, 0),
  },
];

/**
 * Mock StorageService — returns realistic figures so the dashboard can be built
 * and reviewed before real storage introspection exists. Implements the
 * StorageService contract exactly.
 */
export class MockStorageService implements StorageService {
  constructor(private readonly options: MockStorageOptions = {}) {}

  async getOverview(): Promise<StorageOverview | null> {
    await delay(this.options.delayMs);
    if (this.options.failWith) throw this.options.failWith;
    return this.options.overview === undefined ? DEFAULT_OVERVIEW : this.options.overview;
  }

  async getBreakdown(): Promise<readonly StorageCategory[] | null> {
    await delay(this.options.delayMs);
    if (this.options.failWith) throw this.options.failWith;
    return this.options.breakdown === undefined ? DEFAULT_BREAKDOWN : this.options.breakdown;
  }
}

function delay(ms?: number): Promise<void> {
  if (!ms) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}
