import type { ReactNode } from 'react';
import './SectionHeader.css';

export interface SectionHeaderProps {
  readonly title: string;
  readonly description?: string;
  readonly action?: ReactNode;
}

/** A titled section divider with an optional trailing action. */
export function SectionHeader({ title, description, action }: SectionHeaderProps) {
  return (
    <div className="lm-sectionheader">
      <div>
        <h3 className="lm-sectionheader__title">{title}</h3>
        {description != null && <p className="lm-sectionheader__desc">{description}</p>}
      </div>
      {action != null && <div className="lm-sectionheader__action">{action}</div>}
    </div>
  );
}
