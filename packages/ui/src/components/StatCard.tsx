import type { ReactNode } from 'react';
import './StatCard.css';

export type StatTone = 'default' | 'accent' | 'success' | 'warning' | 'danger';

export interface StatCardProps {
  readonly label: string;
  readonly value: ReactNode;
  readonly sublabel?: ReactNode;
  readonly icon?: ReactNode;
  readonly tone?: StatTone;
}

/** A compact labelled metric tile. */
export function StatCard({ label, value, sublabel, icon, tone = 'default' }: StatCardProps) {
  return (
    <div className={`lm-stat lm-stat--${tone}`}>
      <div className="lm-stat__top">
        <span className="lm-stat__label">{label}</span>
        {icon != null && (
          <span className="lm-stat__icon" aria-hidden="true">
            {icon}
          </span>
        )}
      </div>
      <div className="lm-stat__value">{value}</div>
      {sublabel != null && <div className="lm-stat__sublabel">{sublabel}</div>}
    </div>
  );
}
