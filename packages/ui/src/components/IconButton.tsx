import type { ButtonHTMLAttributes } from 'react';
import { Icon, type LucideIcon, type IconSize } from './Icon';
import './IconButton.css';

export type IconButtonVariant = 'ghost' | 'solid' | 'danger';

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly icon: LucideIcon;
  /** Required accessible label — icon-only buttons must be labelled. */
  readonly label: string;
  readonly variant?: IconButtonVariant;
  readonly size?: IconSize;
}

export function IconButton({
  icon,
  label,
  variant = 'ghost',
  size = 'md',
  className,
  ...rest
}: IconButtonProps) {
  return (
    <button
      type="button"
      className={['lm-iconbtn', `lm-iconbtn--${variant}`, `lm-iconbtn--${size}`, className]
        .filter(Boolean)
        .join(' ')}
      aria-label={label}
      title={label}
      {...rest}
    >
      <Icon icon={icon} size={size} />
    </button>
  );
}
