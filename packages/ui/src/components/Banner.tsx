import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { IconButton } from './IconButton';
import './Banner.css';

export type BannerTone = 'info' | 'warning' | 'danger' | 'accent';

export interface BannerProps {
  readonly tone?: BannerTone;
  readonly children: ReactNode;
  readonly action?: ReactNode;
  readonly onDismiss?: () => void;
}

/** Full-width, prominent message pinned above content. */
export function Banner({ tone = 'info', children, action, onDismiss }: BannerProps) {
  return (
    <div className={`lm-banner lm-banner--${tone}`} role="status">
      <div className="lm-banner__content">{children}</div>
      {action != null && <div className="lm-banner__action">{action}</div>}
      {onDismiss && <IconButton icon={X} label="Dismiss" size="sm" onClick={onDismiss} />}
    </div>
  );
}
