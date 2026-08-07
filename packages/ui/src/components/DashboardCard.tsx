import type { HTMLAttributes, ReactNode } from 'react';
import './DashboardCard.css';

export interface DashboardCardProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  readonly title?: ReactNode;
  readonly subtitle?: ReactNode;
  readonly actions?: ReactNode;
  /** Remove body padding (e.g. for edge-to-edge content). */
  readonly flush?: boolean;
  readonly children: ReactNode;
}

/** The primary container for dashboard widgets: header (title + actions) + body. */
export function DashboardCard({
  title,
  subtitle,
  actions,
  flush = false,
  className,
  children,
  ...rest
}: DashboardCardProps) {
  const hasHeader = title != null || actions != null || subtitle != null;
  return (
    <section className={['lm-dcard', className].filter(Boolean).join(' ')} {...rest}>
      {hasHeader && (
        <header className="lm-dcard__head">
          <div className="lm-dcard__titles">
            {title != null && <h3 className="lm-dcard__title">{title}</h3>}
            {subtitle != null && <p className="lm-dcard__subtitle">{subtitle}</p>}
          </div>
          {actions != null && <div className="lm-dcard__actions">{actions}</div>}
        </header>
      )}
      <div
        className={['lm-dcard__body', flush && 'lm-dcard__body--flush'].filter(Boolean).join(' ')}
      >
        {children}
      </div>
    </section>
  );
}
