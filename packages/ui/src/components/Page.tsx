import type { ReactNode } from 'react';
import { Text } from './Text';
import './Page.css';

export interface PageProps {
  readonly title?: string;
  readonly description?: string;
  readonly actions?: ReactNode;
  readonly children: ReactNode;
}

/** Generic page frame with an optional heading block. */
export function Page({ title, description, actions, children }: PageProps) {
  return (
    <div className="lm-page">
      {(title != null || actions != null) && (
        <div className="lm-page__head">
          <div>
            {title != null && <Text variant="large-title">{title}</Text>}
            {description != null && (
              <Text variant="body" tone="secondary">
                {description}
              </Text>
            )}
          </div>
          {actions != null && <div className="lm-page__actions">{actions}</div>}
        </div>
      )}
      <div className="lm-page__body">{children}</div>
    </div>
  );
}
