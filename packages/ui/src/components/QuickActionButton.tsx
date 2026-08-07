import type { ReactNode } from 'react';
import './QuickActionButton.css';

export interface QuickActionButtonProps {
  readonly icon: ReactNode;
  readonly label: string;
  readonly description?: string;
  readonly onClick?: () => void;
  readonly disabled?: boolean;
}

/** A large tappable tile used in the Quick Actions grid. Presentational only. */
export function QuickActionButton({
  icon,
  label,
  description,
  onClick,
  disabled = false,
}: QuickActionButtonProps) {
  return (
    <button type="button" className="lm-qab" onClick={onClick} disabled={disabled}>
      <span className="lm-qab__icon" aria-hidden="true">
        {icon}
      </span>
      <span className="lm-qab__label">{label}</span>
      {description != null && <span className="lm-qab__desc">{description}</span>}
    </button>
  );
}
