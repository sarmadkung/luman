import { forwardRef, useId, type SelectHTMLAttributes } from 'react';
import './Select.css';

export interface SelectOption {
  readonly value: string;
  readonly label: string;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  readonly label?: string;
  readonly options: readonly SelectOption[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, options, id, className, ...rest },
  ref,
) {
  const autoId = useId();
  const selectId = id ?? autoId;
  return (
    <div className={['lm-field', className].filter(Boolean).join(' ')}>
      {label != null && (
        <label className="lm-field__label" htmlFor={selectId}>
          {label}
        </label>
      )}
      <div className="lm-select">
        <select ref={ref} id={selectId} className="lm-select__el" {...rest}>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <span className="lm-select__chevron" aria-hidden="true">
          ⌄
        </span>
      </div>
    </div>
  );
});
