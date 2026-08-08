import type { LucideIcon } from 'lucide-react';
import './Icon.css';

export type IconSize = 'sm' | 'md' | 'lg';

export interface IconProps {
  /** A Lucide icon component. Import from '@luman/ui' re-exports or lucide-react. */
  readonly icon: LucideIcon;
  readonly size?: IconSize;
  /** Accessible label. Omit for purely decorative icons (aria-hidden). */
  readonly label?: string;
  readonly className?: string;
}

const SIZE_PX: Record<IconSize, number> = { sm: 14, md: 18, lg: 24 };

/**
 * The only sanctioned way to render an icon. Wrapping Lucide keeps sizing,
 * color (currentColor), and accessibility consistent — no direct icon usage.
 */
export function Icon({ icon: LucideComp, size = 'md', label, className }: IconProps) {
  const px = SIZE_PX[size];
  return (
    <LucideComp
      className={['lm-icon', className].filter(Boolean).join(' ')}
      width={px}
      height={px}
      strokeWidth={2}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? 'img' : undefined}
      focusable="false"
    />
  );
}

export type { LucideIcon };
