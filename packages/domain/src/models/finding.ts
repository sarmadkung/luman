import type { Id } from '@luman/shared';

/** Coarse classification of what a finding represents. */
export type FindingCategory =
  | 'cache'
  | 'logs'
  | 'temporary'
  | 'trash'
  | 'downloads'
  | 'application'
  | 'large-file'
  | 'duplicate'
  | 'other';

/**
 * How safe it is to delete a finding. This drives whether a confirmation is
 * required. The domain never decides deletion on its own — see business rules.
 *
 * Distinct from `PathClassification` in `./path-classification`, despite both
 * having `'safe'` and `'caution'`. This classifies a *finding* — how risky
 * deleting that item is. `PathClassification` classifies a *location*. A
 * finding may be `safe` while the path it points at is protected, in which case
 * the path wins and the finding is not actionable. This field is persisted as
 * the `findings.safety` column; `PathClassification` is not stored.
 */
export type SafetyLevel = 'safe' | 'caution' | 'unsafe';

/** One reclaimable (or noteworthy) item discovered during a scan. */
export interface Finding {
  readonly id: Id;
  readonly scanId: Id;
  readonly category: FindingCategory;
  /** Absolute path this finding refers to. */
  readonly path: string;
  /** Size in bytes. */
  readonly size: number;
  /** Convenience flag; must be consistent with `safety`. */
  readonly safeToDelete: boolean;
  readonly safety: SafetyLevel;
  /** Id of the plugin that produced this finding. */
  readonly plugin: Id;
}
