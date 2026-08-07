import { Spinner } from './Spinner';
import './LoadingState.css';

export interface LoadingStateProps {
  readonly label?: string;
  /** Vertical padding size. */
  readonly compact?: boolean;
}

/** Centered loading indicator for use inside cards/widgets. */
export function LoadingState({ label = 'Loading…', compact = false }: LoadingStateProps) {
  return (
    <div className={['lm-loading', compact && 'lm-loading--compact'].filter(Boolean).join(' ')}>
      <Spinner label={label} />
    </div>
  );
}
