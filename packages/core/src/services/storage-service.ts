import type { StorageOverview } from './types';

/** Reports high-level storage figures for the dashboard. Read-only. */
export interface StorageService {
  /** Current overview, or null when it is not yet known (no scan / no data). */
  getOverview(): Promise<StorageOverview | null>;
}

/** Sprint 1 stub — no real figures yet, so the dashboard shows "No Scan". */
export class StubStorageService implements StorageService {
  async getOverview(): Promise<StorageOverview | null> {
    return null;
  }
}
