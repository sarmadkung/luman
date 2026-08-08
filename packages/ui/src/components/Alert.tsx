import type { ReactNode } from 'react';
import { Info, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { Icon, type LucideIcon } from './Icon';
import './Alert.css';

export type AlertTone = 'info' | 'success' | 'warning' | 'danger';

export interface AlertProps {
  readonly tone?: AlertTone;
  readonly title?: string;
  readonly children: ReactNode;
}

const TONE_ICON: Record<AlertTone, LucideIcon> = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: XCircle,
};

/** Inline, contextual message. Not a toast — lives within the content flow. */
export function Alert({ tone = 'info', title, children }: AlertProps) {
  return (
    <div className={`lm-alert lm-alert--${tone}`} role={tone === 'danger' ? 'alert' : 'status'}>
      <span className="lm-alert__icon">
        <Icon icon={TONE_ICON[tone]} size="sm" />
      </span>
      <div className="lm-alert__content">
        {title != null && <div className="lm-alert__title">{title}</div>}
        <div className="lm-alert__body">{children}</div>
      </div>
    </div>
  );
}
