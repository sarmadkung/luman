import type { ReactNode } from 'react';
import { Icon, type LucideIcon } from './Icon';
import './MetricCard.css';

export type MetricTone = 'default' | 'accent' | 'success' | 'warning' | 'danger';

export interface MetricCardProps {
  readonly label: string;
  readonly value: ReactNode;
  /** Rendered smaller, immediately after the value (e.g. "GB"). */
  readonly unit?: ReactNode;
  /** Rendered muted, after the unit (e.g. "/ 512 GB"). */
  readonly secondary?: ReactNode;
  /** One supporting line beneath the value. */
  readonly caption?: ReactNode;
  /** Decorative icon in the top-right corner. */
  readonly icon?: LucideIcon;
  readonly tone?: MetricTone;
  /** Slot beneath the value — typically a ProgressBar. */
  readonly children?: ReactNode;
}

/** A large headline metric tile, as used in the dashboard's metrics row. */
export function MetricCard({
  label,
  value,
  unit,
  secondary,
  caption,
  icon,
  tone = 'default',
  children,
}: MetricCardProps) {
  return (
    <section className={`lm-metric lm-metric--${tone}`}>
      <header className="lm-metric__head">
        <h3 className="lm-metric__label">{label}</h3>
        {icon != null && (
          <span className="lm-metric__icon">
            <Icon icon={icon} size="md" />
          </span>
        )}
      </header>

      <p className="lm-metric__value">
        {value}
        {unit != null && <span className="lm-metric__unit">{unit}</span>}
        {secondary != null && <span className="lm-metric__secondary">{secondary}</span>}
      </p>

      {caption != null && <p className="lm-metric__caption">{caption}</p>}
      {children != null && <div className="lm-metric__slot">{children}</div>}
    </section>
  );
}
