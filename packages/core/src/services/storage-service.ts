import type { StorageOverview, StorageCategory } from './types';

/** Reports high-level storage figures for the dashboard. Read-only. */
export interface StorageService {
  /** Current overview, or null when it is not yet known (no scan / no data). */
  getOverview(): Promise<StorageOverview | null>;
  /**
   * Per-category usage for the breakdown, or null when unknown.
   * Categories sum to the overview's `usedBytes`.
   */
  getBreakdown(): Promise<readonly StorageCategory[] | null>;
}

/** Sprint 1 stub — no real figures yet, so the dashboard shows "No Scan". */
export class StubStorageService implements StorageService {
  async getOverview(): Promise<StorageOverview | null> {
    return null;
  }

  async getBreakdown(): Promise<readonly StorageCategory[] | null> {
    return null;
  }
}
