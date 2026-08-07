import type { ReactNode } from 'react';
import './RecommendationCard.css';

export type RecommendationPriority = 'low' | 'medium' | 'high';

export interface RecommendationCardProps {
  readonly icon: ReactNode;
  readonly title: string;
  readonly description: string;
  /** Pre-formatted estimated recovery, e.g. "21 GB". */
  readonly estimatedRecovery?: string;
  readonly priority: RecommendationPriority;
  readonly onAction?: () => void;
  readonly actionLabel?: string;
}

const PRIORITY_LABEL: Record<RecommendationPriority, string> = {
  high: 'High priority',
  medium: 'Suggested',
  low: 'Optional',
};

/** A single explainable recommendation. Presentational only. */
export function RecommendationCard({
  icon,
  title,
  description,
  estimatedRecovery,
  priority,
  onAction,
  actionLabel = 'Review',
}: RecommendationCardProps) {
  return (
    <article className="lm-rec">
      <div className="lm-rec__icon" aria-hidden="true">
        {icon}
      </div>
      <div className="lm-rec__main">
        <div className="lm-rec__headline">
          <h4 className="lm-rec__title">{title}</h4>
          <span className={`lm-rec__badge lm-rec__badge--${priority}`}>
            {PRIORITY_LABEL[priority]}
          </span>
        </div>
        <p className="lm-rec__desc">{description}</p>
        <div className="lm-rec__footer">
          {estimatedRecovery != null && (
            <span className="lm-rec__estimate">~{estimatedRecovery} recoverable</span>
          )}
          {onAction && (
            <button type="button" className="lm-rec__action" onClick={onAction}>
              {actionLabel}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
