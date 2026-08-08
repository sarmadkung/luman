import type { ReactNode } from 'react';
import './Panel.css';

export interface PanelProps {
  readonly title?: ReactNode;
  readonly children: ReactNode;
  readonly className?: string;
}

/** A simple opaque titled container (never glass — content surface). */
export function Panel({ title, children, className }: PanelProps) {
  return (
    <div className={['lm-panel', className].filter(Boolean).join(' ')}>
      {title != null && <div className="lm-panel__title">{title}</div>}
      <div className="lm-panel__body">{children}</div>
    </div>
  );
}
