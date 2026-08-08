import { useId } from 'react';
import './Toggle.css';

export interface SwitchProps {
  readonly checked: boolean;
  readonly onChange: (checked: boolean) => void;
  readonly label?: string;
  readonly disabled?: boolean;
  readonly id?: string;
}

export function Switch({ checked, onChange, label, disabled, id }: SwitchProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <label className="lm-switch" htmlFor={inputId}>
      <input
        id={inputId}
        type="checkbox"
        role="switch"
        className="lm-switch__input"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="lm-switch__track" aria-hidden="true">
        <span className="lm-switch__thumb" />
      </span>
      {label != null && <span className="lm-check__label">{label}</span>}
    </label>
  );
}
