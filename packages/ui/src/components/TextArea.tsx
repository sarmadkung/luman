import { forwardRef, useId, type TextareaHTMLAttributes } from 'react';
import './Input.css';

export interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  readonly label?: string;
  readonly error?: string;
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(function TextArea(
  { label, error, id, className, rows = 4, ...rest },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <div className={['lm-field', className].filter(Boolean).join(' ')}>
      {label != null && (
        <label className="lm-field__label" htmlFor={inputId}>
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        id={inputId}
        rows={rows}
        className={['lm-input', 'lm-textarea', error && 'lm-input--error']
          .filter(Boolean)
          .join(' ')}
        aria-invalid={error ? true : undefined}
        {...rest}
      />
      {error != null && <span className="lm-field__error">{error}</span>}
    </div>
  );
});
