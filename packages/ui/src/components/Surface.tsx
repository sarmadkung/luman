import type { HTMLAttributes, ReactNode } from 'react';
import './Surface.css';

export type SurfaceElevation = 'flat' | 'raised' | 'overlay';

export interface SurfaceProps extends HTMLAttributes<HTMLDivElement> {
  readonly elevation?: SurfaceElevation;
  readonly padded?: boolean;
  readonly children: ReactNode;
}

/** A neutral themed container. The base building block for opaque panels. */
export function Surface({
  elevation = 'flat',
  padded = false,
  className,
  children,
  ...rest
}: SurfaceProps) {
  return (
    <div
      className={[
        'lm-surface',
        `lm-surface--${elevation}`,
        padded && 'lm-surface--padded',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {children}
    </div>
  );
}
