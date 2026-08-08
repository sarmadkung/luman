import { forwardRef, useId, type InputHTMLAttributes } from 'react';
import './Toggle.css';

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  readonly label?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { label, id, className, ...rest },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <label className={['lm-check', className].filter(Boolean).join(' ')} htmlFor={inputId}>
      <input ref={ref} id={inputId} type="checkbox" className="lm-check__input" {...rest} />
      <span className="lm-check__box" aria-hidden="true" />
      {label != null && <span className="lm-check__label">{label}</span>}
    </label>
  );
});
