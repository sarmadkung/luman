import { useId, type ReactElement, type ReactNode } from 'react';
import './Tooltip.css';

export type TooltipPlacement = 'top' | 'bottom' | 'left' | 'right';

export interface TooltipProps {
  readonly content: ReactNode;
  readonly placement?: TooltipPlacement;
  readonly children: ReactElement;
}

/**
 * Lightweight tooltip shown on hover and keyboard focus. The trigger is wrapped
 * so both pointer and keyboard users get the hint (Epic 13).
 */
export function Tooltip({ content, placement = 'top', children }: TooltipProps) {
  const id = useId();
  return (
    <span className="lm-tooltip" aria-describedby={id}>
      {children}
      <span role="tooltip" id={id} className={`lm-tooltip__pop lm-tooltip__pop--${placement}`}>
        {content}
      </span>
    </span>
  );
}
