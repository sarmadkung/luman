import { useRef, useState, type ReactNode } from 'react';
import { Glass } from './Glass';
import { useDismiss } from '../hooks/use-dismiss';
import './Popover.css';

export interface PopoverProps {
  /** Render-prop trigger; receives props to spread onto a button. */
  readonly trigger: (props: { onClick: () => void; 'aria-expanded': boolean }) => ReactNode;
  readonly children: ReactNode;
  readonly align?: 'start' | 'end';
}

/** Click-triggered popover on a glass surface. Closes on outside click/Escape. */
export function Popover({ trigger, children, align = 'start' }: PopoverProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useDismiss(ref, () => setOpen(false), open);

  return (
    <div className="lm-popover" ref={ref}>
      {trigger({ onClick: () => setOpen((v) => !v), 'aria-expanded': open })}
      {open && (
        <div className={`lm-popover__panel lm-popover__panel--${align}`} role="dialog">
          <Glass>
            <div className="lm-popover__inner">{children}</div>
          </Glass>
        </div>
      )}
    </div>
  );
}
