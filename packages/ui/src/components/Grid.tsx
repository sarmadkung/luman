import type { CSSProperties, ReactNode } from 'react';

export type SpaceStep = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export interface GridProps {
  /** Fixed column count, or 'auto' to auto-fit by `minColumnWidth`. */
  readonly columns?: number | 'auto';
  readonly minColumnWidth?: number;
  readonly gap?: SpaceStep;
  readonly children: ReactNode;
  readonly className?: string;
}

/** Token-spaced CSS grid. Never hardcode gaps — pass a spacing step. */
export function Grid({
  columns = 'auto',
  minColumnWidth = 220,
  gap = 4,
  children,
  className,
}: GridProps) {
  const style: CSSProperties = {
    display: 'grid',
    gap: `var(--space-${gap})`,
    gridTemplateColumns:
      columns === 'auto'
        ? `repeat(auto-fit, minmax(${minColumnWidth}px, 1fr))`
        : `repeat(${columns}, minmax(0, 1fr))`,
  };
  return (
    <div style={style} className={className}>
      {children}
    </div>
  );
}
