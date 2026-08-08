import { createContext, useContext, useId, type ReactNode } from 'react';
import './Toggle.css';

interface RadioGroupCtx {
  readonly name: string;
  readonly value?: string;
  readonly onChange?: (value: string) => void;
}
const Ctx = createContext<RadioGroupCtx | null>(null);

export interface RadioGroupProps {
  readonly label?: string;
  readonly name?: string;
  readonly value?: string;
  readonly onChange?: (value: string) => void;
  readonly children: ReactNode;
}

export function RadioGroup({ label, name, value, onChange, children }: RadioGroupProps) {
  const autoName = useId();
  return (
    <div role="radiogroup" aria-label={label} className="lm-radiogroup">
      <Ctx.Provider value={{ name: name ?? autoName, value, onChange }}>{children}</Ctx.Provider>
    </div>
  );
}

export interface RadioProps {
  readonly value: string;
  readonly label: string;
  readonly disabled?: boolean;
}

export function Radio({ value, label, disabled }: RadioProps) {
  const ctx = useContext(Ctx);
  const id = useId();
  return (
    <label className="lm-radio" htmlFor={id}>
      <input
        id={id}
        type="radio"
        className="lm-radio__input"
        name={ctx?.name}
        value={value}
        disabled={disabled}
        checked={ctx?.value != null ? ctx.value === value : undefined}
        onChange={() => ctx?.onChange?.(value)}
      />
      <span className="lm-radio__dot" aria-hidden="true" />
      <span className="lm-check__label">{label}</span>
    </label>
  );
}
