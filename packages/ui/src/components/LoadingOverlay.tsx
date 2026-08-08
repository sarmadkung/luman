import { Spinner } from './Spinner';
import './LoadingOverlay.css';

export interface LoadingOverlayProps {
  readonly visible: boolean;
  readonly label?: string;
  /** Cover the whole viewport instead of the nearest positioned ancestor. */
  readonly fullscreen?: boolean;
}

/** Blocks interaction while work is in progress. */
export function LoadingOverlay({
  visible,
  label = 'Working…',
  fullscreen = false,
}: LoadingOverlayProps) {
  if (!visible) return null;
  return (
    <div
      className={['lm-overlay', fullscreen && 'lm-overlay--fullscreen'].filter(Boolean).join(' ')}
      role="status"
      aria-live="polite"
    >
      <Spinner label={label} />
    </div>
  );
}
