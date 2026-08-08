import type { HTMLAttributes, ReactNode } from 'react';
import './ScrollableArea.css';

export interface ScrollableAreaProps extends HTMLAttributes<HTMLDivElement> {
  readonly children: ReactNode;
}

/** Overflow container with themed, unobtrusive scrollbars and smooth scrolling. */
export function ScrollableArea({ className, children, ...rest }: ScrollableAreaProps) {
  return (
    <div className={['lm-scroll', className].filter(Boolean).join(' ')} {...rest}>
      {children}
    </div>
  );
}
