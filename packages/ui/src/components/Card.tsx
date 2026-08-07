import type { HTMLAttributes, ReactNode } from 'react';
import './Card.css';

export interface CardProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  readonly title?: ReactNode;
  readonly children: ReactNode;
}

export function Card({ title, children, className, ...rest }: CardProps) {
  return (
    <section className={['lm-card', className].filter(Boolean).join(' ')} {...rest}>
      {title != null && <header className="lm-card__title">{title}</header>}
      <div className="lm-card__body">{children}</div>
    </section>
  );
}
