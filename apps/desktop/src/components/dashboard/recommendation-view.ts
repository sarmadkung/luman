import type { Recommendation, RecommendationSeverity } from '@luman/domain';
import type { RecommendationPriority } from '@luman/ui';
import { formatBytes } from '@luman/shared';

const SEVERITY_TO_PRIORITY: Record<RecommendationSeverity, RecommendationPriority> = {
  important: 'high',
  suggested: 'medium',
  info: 'low',
};

const SEVERITY_RANK: Record<RecommendationSeverity, number> = {
  important: 3,
  suggested: 2,
  info: 1,
};

const SEVERITY_ICON: Record<RecommendationSeverity, string> = {
  important: '⚠',
  suggested: '↑',
  info: 'ℹ',
};

export interface RecommendationView {
  readonly id: string;
  readonly icon: string;
  readonly title: string;
  readonly description: string;
  readonly estimatedRecovery?: string;
  readonly priority: RecommendationPriority;
}

/** Convert a domain Recommendation into presentational card props. Pure. */
export function toRecommendationView(rec: Recommendation): RecommendationView {
  return {
    id: rec.id,
    icon: SEVERITY_ICON[rec.severity],
    title: rec.title,
    description: rec.rationale,
    estimatedRecovery: rec.estimatedBytes != null ? formatBytes(rec.estimatedBytes) : undefined,
    priority: SEVERITY_TO_PRIORITY[rec.severity],
  };
}

/** Sort by severity (highest first) and cap the list. Pure. */
export function topRecommendations(
  recs: readonly Recommendation[],
  max = 5,
): readonly Recommendation[] {
  return [...recs]
    .sort((a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity])
    .slice(0, max);
}
