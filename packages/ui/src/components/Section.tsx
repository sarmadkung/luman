import type { ReactNode } from 'react';
import { SectionHeader } from './SectionHeader';
import './Section.css';

export interface SectionProps {
  readonly title?: string;
  readonly description?: string;
  readonly action?: ReactNode;
  readonly children: ReactNode;
}

export function Section({ title, description, action, children }: SectionProps) {
  return (
    <section className="lm-section">
      {title != null && <SectionHeader title={title} description={description} action={action} />}
      <div>{children}</div>
    </section>
  );
}
