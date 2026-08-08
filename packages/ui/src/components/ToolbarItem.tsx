import type { ReactNode } from 'react';
import './ToolbarItem.css';

export interface ToolbarItemProps {
  readonly children: ReactNode;
  readonly className?: string;
}

/** A slot within a toolbar. Use `ToolbarSpacer` to push items apart. */
export function ToolbarItem({ children, className }: ToolbarItemProps) {
  return <div className={['lm-toolitem', className].filter(Boolean).join(' ')}>{children}</div>;
}

export function ToolbarSpacer() {
  return <div className="lm-toolitem__spacer" aria-hidden="true" />;
}
