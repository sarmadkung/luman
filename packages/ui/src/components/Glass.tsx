import type { HTMLAttributes, ReactNode } from 'react';
import './Glass.css';

export type GlassVariant = 'chrome' | 'surface';

export interface GlassProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * `chrome` — window furniture: sidebar, header, dialog, popover, toast.
   * Heavy blur, strong presence.
   * `surface` — content cards. Lighter blur so text stays crisp over the aurora.
   */
  readonly variant?: GlassVariant;
  /** Stronger blur for larger chrome surfaces (dialogs). */
  readonly strong?: boolean;
  readonly children: ReactNode;
}

/**
 * Frosted-glass surface. Content cards are permitted via `variant="surface"` —
 * see docs/design-system/09_GLASS_SYSTEM.md. Text contrast over the aurora is
 * enforced by the automated gate in src/styles/tokens.test.ts.
 */
export function Glass({
  variant = 'chrome',
  strong = false,
  className,
  children,
  ...rest
}: GlassProps) {
  return (
    <div
      className={['lm-glass', `lm-glass--${variant}`, strong && 'lm-glass--strong', className]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {children}
    </div>
  );
}
