import './ProgressBar.css';

export type ProgressTone = 'accent' | 'success' | 'warning' | 'danger' | 'muted';

export interface ProgressSegment {
  /** Fraction of the whole, 0..1. */
  readonly fraction: number;
  readonly tone: ProgressTone;
  readonly label?: string;
}

export interface ProgressBarProps {
  /** Single-value mode, 0..1. Ignored when `segments` is provided. */
  readonly value?: number;
  readonly tone?: ProgressTone;
  /** Stacked mode: multiple contiguous segments. */
  readonly segments?: readonly ProgressSegment[];
  readonly ariaLabel?: string;
}

const clamp = (n: number) => Math.max(0, Math.min(1, Number.isFinite(n) ? n : 0));

/** Accessible progress/utilization bar supporting single or stacked segments. */
export function ProgressBar({ value = 0, tone = 'accent', segments, ariaLabel }: ProgressBarProps) {
  if (segments && segments.length > 0) {
    return (
      <div className="lm-progress" role="img" aria-label={ariaLabel}>
        {segments.map((seg, i) => (
          <span
            key={i}
            className={`lm-progress__seg lm-progress__seg--${seg.tone}`}
            style={{ width: `${clamp(seg.fraction) * 100}%` }}
            title={seg.label}
          />
        ))}
      </div>
    );
  }
  const pct = clamp(value);
  return (
    <div
      className="lm-progress"
      role="progressbar"
      aria-valuenow={Math.round(pct * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={ariaLabel}
    >
      <span
        className={`lm-progress__seg lm-progress__seg--${tone}`}
        style={{ width: `${pct * 100}%` }}
      />
    </div>
  );
}
