import type { ReactNode } from 'react';
import './Page.css';

export interface PageProps {
  /**
   * Optional. Omit when the page supplies its own heading — the dashboard's
   * hero is its <h1>, so a second heading block here would duplicate it.
   */
  readonly title?: string;
  readonly description?: string;
  readonly actions?: ReactNode;
  readonly children: ReactNode;
}

/** Consistent page frame with an optional heading block. */
export function Page({ title, description, actions, children }: PageProps) {
  const hasHead = title != null || actions != null;
  return (
    <div className="lm-page">
      {hasHead && (
        <div className="lm-page__head">
          <div>
            {title != null && <h1 className="lm-page__title">{title}</h1>}
            {description != null && <p className="lm-page__desc">{description}</p>}
          </div>
          {actions != null && <div className="lm-page__actions">{actions}</div>}
        </div>
      )}
      <div className="lm-page__body">{children}</div>
    </div>
  );
}
