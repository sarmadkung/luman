import './Skeleton.css';

export interface SkeletonProps {
  readonly width?: string | number;
  readonly height?: string | number;
  readonly radius?: string;
  readonly className?: string;
}

/** Loading placeholder with a subtle shimmer (disabled under reduced motion). */
export function Skeleton({ width = '100%', height = 16, radius, className }: SkeletonProps) {
  return (
    <span
      className={['lm-skeleton', className].filter(Boolean).join(' ')}
      style={{ width, height, borderRadius: radius }}
      aria-hidden="true"
    />
  );
}
