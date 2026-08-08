import type { HTMLAttributes, ReactNode } from 'react';
import './Glass.css';

export interface GlassProps extends HTMLAttributes<HTMLDivElement> {
  /** Stronger blur for larger surfaces (dialogs). */
  readonly strong?: boolean;
  readonly children: ReactNode;
}

/**
 * Frosted-glass surface (Epic 8). ALLOWED only for sidebar, toolbar, dialog,
 * popover, and toast. Never use for dashboard cards, tables, lists, or main
 * content. Very subtle blur + a thin border for a native appearance.
 */
export function Glass({ strong = false, className, children, ...rest }: GlassProps) {
  return (
    <div
      className={['lm-glass', strong && 'lm-glass--strong', className].filter(Boolean).join(' ')}
      {...rest}
    >
      {children}
    </div>
  );
}
