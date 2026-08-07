import { Button } from '@luman/ui';
import './ErrorDialog.css';

export interface ErrorDialogProps {
  readonly title?: string;
  readonly message: string;
  readonly detail?: string;
  readonly onRetry?: () => void;
  readonly onDismiss?: () => void;
}

/** User-friendly, non-technical error surface. */
export function ErrorDialog({
  title = 'Something went wrong',
  message,
  detail,
  onRetry,
  onDismiss,
}: ErrorDialogProps) {
  return (
    <div className="lm-errdialog__backdrop" role="alertdialog" aria-modal="true" aria-label={title}>
      <div className="lm-errdialog">
        <h2 className="lm-errdialog__title">{title}</h2>
        <p className="lm-errdialog__message">{message}</p>
        {detail != null && (
          <details className="lm-errdialog__detail">
            <summary>Technical details</summary>
            <pre>{detail}</pre>
          </details>
        )}
        <div className="lm-errdialog__actions">
          {onDismiss && (
            <Button variant="ghost" onClick={onDismiss}>
              Dismiss
            </Button>
          )}
          {onRetry && (
            <Button variant="primary" onClick={onRetry}>
              Try again
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
