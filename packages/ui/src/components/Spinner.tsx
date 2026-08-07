import './Spinner.css';

export interface SpinnerProps {
  readonly label?: string;
  readonly size?: number;
}

export function Spinner({ label = 'Loading…', size = 20 }: SpinnerProps) {
  return (
    <span className="lm-spinner" role="status" aria-live="polite">
      <span className="lm-spinner__ring" style={{ width: size, height: size }} aria-hidden="true" />
      <span className="lm-spinner__label">{label}</span>
    </span>
  );
}
