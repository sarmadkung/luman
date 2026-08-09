import './BreakdownList.css';

export interface BreakdownRow {
  readonly key: string;
  readonly label: string;
  /** Preformatted display value, e.g. "45.2 GB". This component never formats. */
  readonly value: string;
  /** 1-based category color slot; values above 5 wrap. */
  readonly colorIndex: number;
}

export interface BreakdownListProps {
  readonly rows: readonly BreakdownRow[];
  readonly ariaLabel?: string;
}

const CATEGORY_SLOTS = 5;

/** Legend-style list of categories: color dot, label, and size. */
export function BreakdownList({ rows, ariaLabel }: BreakdownListProps) {
  return (
    <ul className="lm-breakdown" aria-label={ariaLabel}>
      {rows.map((row) => {
        const slot = ((row.colorIndex - 1) % CATEGORY_SLOTS) + 1;
        return (
          <li className="lm-breakdown__row" key={row.key}>
            <span className={`lm-breakdown__dot lm-breakdown__dot--${slot}`} aria-hidden="true" />
            <span className="lm-breakdown__label">{row.label}</span>
            <span className="lm-breakdown__value">{row.value}</span>
          </li>
        );
      })}
    </ul>
  );
}
