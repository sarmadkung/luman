import type { Id } from '@luman/shared';

/** Lifecycle of a cleanup operation. Cleanup is always explicit + confirmed. */
export type CleanupStatus = 'pending' | 'confirmed' | 'running' | 'completed' | 'failed';

/** A user-initiated, confirmed request to remove a set of findings. */
export interface CleanupAction {
  readonly id: Id;
  /** Findings the user chose to act on. */
  readonly findings: readonly Id[];
  readonly status: CleanupStatus;
  /** Bytes actually reclaimed once completed; 0 until then. */
  readonly reclaimedBytes: number;
  /** ISO-8601 timestamp when the action completed; null otherwise. */
  readonly completedAt: string | null;
}
