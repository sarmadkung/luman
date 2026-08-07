import type { ReactNode } from 'react';
import { Button } from './Button';
import './ErrorState.css';

export interface ErrorStateProps {
  readonly title?: string;
  readonly description?: string;
  readonly onRetry?: () => void;
  readonly retryLabel?: string;
  readonly icon?: ReactNode;
}

/** Inline error surface for widgets (distinct from the global ErrorDialog). */
export function ErrorState({
  title = 'Something went wrong',
  description = 'This section could not be loaded.',
  onRetry,
  retryLabel = 'Try again',
  icon = '⚠',
}: ErrorStateProps) {
  return (
    <div className="lm-errorstate" role="alert">
      <div className="lm-errorstate__icon" aria-hidden="true">
        {icon}
      </div>
      <h4 className="lm-errorstate__title">{title}</h4>
      <p className="lm-errorstate__desc">{description}</p>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          {retryLabel}
        </Button>
      )}
    </div>
  );
}
