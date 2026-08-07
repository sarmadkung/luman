import type { Id } from '@luman/shared';

/** How strongly the app suggests acting on a recommendation. */
export type RecommendationSeverity = 'info' | 'suggested' | 'important';

/**
 * An explainable suggestion surfaced to the user. Every recommendation must be
 * explainable ("Explain every recommendation" — product principle).
 */
export interface Recommendation {
  readonly id: Id;
  readonly title: string;
  /** Plain-language explanation of *why* this is recommended. */
  readonly rationale: string;
  readonly severity: RecommendationSeverity;
  /** Estimated reclaimable bytes, if applicable. */
  readonly estimatedBytes: number | null;
  /** Findings this recommendation is based on. */
  readonly findings: readonly Id[];
}
