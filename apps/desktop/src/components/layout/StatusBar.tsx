import { useApplicationStore } from '../../stores';
import { useThemeStore } from '../../theme';
import './StatusBar.css';

/** Bottom status strip. Reflects readiness and current appearance. */
export function StatusBar() {
  const ready = useApplicationStore((s) => s.ready);
  const resolved = useThemeStore((s) => s.resolved);
  return (
    <footer className="lm-statusbar">
      <span
        className={['lm-statusbar__dot', ready && 'lm-statusbar__dot--ready']
          .filter(Boolean)
          .join(' ')}
        aria-hidden="true"
      />
      <span>{ready ? 'Ready' : 'Starting…'}</span>
      <span className="lm-statusbar__spacer" />
      <span className="lm-statusbar__muted">Luman 0.1.0 · {resolved}</span>
    </footer>
  );
}
