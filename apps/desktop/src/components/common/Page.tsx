import type { ReactNode } from 'react';
import './Page.css';

export interface PageProps {
  readonly title: string;
  readonly description?: string;
  readonly actions?: ReactNode;
  readonly children: ReactNode;
}

/** Consistent page frame with a heading block. */
export function Page({ title, description, actions, children }: PageProps) {
  return (
    <div className="lm-page">
      <div className="lm-page__head">
        <div>
          <h2 className="lm-page__title">{title}</h2>
          {description != null && <p className="lm-page__desc">{description}</p>}
        </div>
        {actions != null && <div className="lm-page__actions">{actions}</div>}
      </div>
      <div className="lm-page__body">{children}</div>
    </div>
  );
}
