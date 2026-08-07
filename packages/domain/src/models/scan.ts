import type { Id } from '@luman/shared';

/** Lifecycle of a scan. Scans are always read-only. */
export type ScanStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

/** A single storage-analysis run. */
export interface Scan {
  readonly id: Id;
  /** ISO-8601 timestamp. */
  readonly startedAt: string;
  /** ISO-8601 timestamp; null while running or if it never finished. */
  readonly completedAt: string | null;
  readonly status: ScanStatus;
  /** Identifiers of scanner plugins that participated in this scan. */
  readonly plugins: readonly Id[];
}
