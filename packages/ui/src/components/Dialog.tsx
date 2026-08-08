import { useEffect, useRef, type ReactNode } from 'react';
import { Glass } from './Glass';
import { IconButton } from './IconButton';
import { X } from 'lucide-react';
import { useDismiss } from '../hooks/use-dismiss';
import './Dialog.css';

export interface DialogProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly title: string;
  readonly description?: string;
  readonly children?: ReactNode;
  readonly footer?: ReactNode;
  /** Prevent closing on backdrop/escape (e.g. required confirmations). */
  readonly dismissable?: boolean;
}

/** Accessible modal dialog on a frosted-glass panel (glass is allowed here). */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  dismissable = true,
}: DialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  useDismiss(panelRef, () => dismissable && onClose(), open);

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();
    return () => previouslyFocused?.focus?.();
  }, [open]);

  if (!open) return null;
  return (
    <div className="lm-dialog__backdrop">
      <Glass strong>
        <div
          ref={panelRef}
          className="lm-dialog"
          role="dialog"
          aria-modal="true"
          aria-label={title}
          tabIndex={-1}
        >
          <header className="lm-dialog__head">
            <h2 className="lm-dialog__title">{title}</h2>
            {dismissable && <IconButton icon={X} label="Close" onClick={onClose} />}
          </header>
          {description != null && <p className="lm-dialog__desc">{description}</p>}
          {children != null && <div className="lm-dialog__body">{children}</div>}
          {footer != null && <footer className="lm-dialog__footer">{footer}</footer>}
        </div>
      </Glass>
    </div>
  );
}
