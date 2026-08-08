import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react';
import './Input.css';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  readonly label?: string;
  readonly hint?: ReactNode;
  readonly error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, id, className, ...rest },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const describedBy = error ? `${inputId}-err` : hint ? `${inputId}-hint` : undefined;
  return (
    <div className={['lm-field', className].filter(Boolean).join(' ')}>
      {label != null && (
        <label className="lm-field__label" htmlFor={inputId}>
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        className={['lm-input', error && 'lm-input--error'].filter(Boolean).join(' ')}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        {...rest}
      />
      {error ? (
        <span id={`${inputId}-err`} className="lm-field__error">
          {error}
        </span>
      ) : hint != null ? (
        <span id={`${inputId}-hint`} className="lm-field__hint">
          {hint}
        </span>
      ) : null}
    </div>
  );
});
