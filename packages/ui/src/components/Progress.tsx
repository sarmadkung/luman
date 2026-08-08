import { ProgressBar, type ProgressBarProps } from './ProgressBar';

/**
 * Determinate progress indicator. Thin alias over ProgressBar's single-value
 * mode so "Progress" reads naturally at call sites (Epic 5/7).
 */
export interface ProgressProps {
  /** 0..1 */
  readonly value: number;
  readonly tone?: ProgressBarProps['tone'];
  readonly label?: string;
}

export function Progress({ value, tone = 'accent', label }: ProgressProps) {
  return <ProgressBar value={value} tone={tone} ariaLabel={label} />;
}
