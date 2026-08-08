import type { ReactNode } from 'react';
import './Badge.css';

export type BadgeTone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'info';

export interface BadgeProps {
  readonly tone?: BadgeTone;
  readonly children: ReactNode;
}

export function Badge({ tone = 'neutral', children }: BadgeProps) {
  return <span className={`lm-badge lm-badge--${tone}`}>{children}</span>;
}
