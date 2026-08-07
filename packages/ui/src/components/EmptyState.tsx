import type { ReactNode } from 'react';
import './EmptyState.css';

export interface EmptyStateProps {
  readonly title: string;
  readonly description?: string;
  readonly icon?: ReactNode;
  readonly action?: ReactNode;
}

export function EmptyState({ title, description, icon, action }: EmptyStateProps) {
  return (
    <div className="lm-empty">
      {icon != null && (
        <div className="lm-empty__icon" aria-hidden="true">
          {icon}
        </div>
      )}
      <h3 className="lm-empty__title">{title}</h3>
      {description != null && <p className="lm-empty__desc">{description}</p>}
      {action != null && <div className="lm-empty__action">{action}</div>}
    </div>
  );
}
