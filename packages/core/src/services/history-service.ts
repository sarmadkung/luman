/** A compact summary of recent activity for the dashboard. */
export interface ActivitySummary {
  /** ISO-8601 time of the last completed scan, or null if none. */
  readonly lastScanAt: string | null;
  /** ISO-8601 time of the last completed cleanup, or null if none. */
  readonly lastCleanupAt: string | null;
  /** Total bytes reclaimed across all cleanups. */
  readonly totalRecoveredBytes: number;
}

/** Reports historical activity. Read-only. */
export interface HistoryService {
  /** The activity summary, or null when nothing has happened yet. */
  getActivitySummary(): Promise<ActivitySummary | null>;
}

/** Sprint 1/stub: no activity yet. */
export class StubHistoryService implements HistoryService {
  async getActivitySummary(): Promise<ActivitySummary | null> {
    return null;
  }
}
