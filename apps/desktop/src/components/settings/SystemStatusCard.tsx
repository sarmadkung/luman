import { Card } from '@luman/ui';
import { useServices } from '../../services';
import { useApplicationStore } from '../../stores';
import { useThemeStore } from '../../theme';
import './SystemStatus.css';

interface StatusRow {
  readonly label: string;
  readonly value: string;
  readonly ok: boolean;
}

/**
 * Diagnostics: readiness, database, plugins, appearance, version. This lives in
 * Settings rather than on the dashboard — it reports on the app, not on storage.
 */
export function SystemStatusCard() {
  const { plugins } = useServices();
  const ready = useApplicationStore((s) => s.ready);
  const initError = useApplicationStore((s) => s.initError);
  const resolved = useThemeStore((s) => s.resolved);

  const rows: StatusRow[] = [
    { label: 'Application', value: ready ? 'Ready' : 'Starting…', ok: ready },
    { label: 'Database', value: initError ? 'Error' : 'Initialized', ok: !initError },
    { label: 'Plugins', value: `${plugins.list().length} registered`, ok: true },
    { label: 'Appearance', value: resolved === 'dark' ? 'Dark' : 'Light', ok: true },
    { label: 'Version', value: '0.1.0', ok: true },
  ];

  return (
    <Card title="System">
      <ul className="lm-sysstatus">
        {rows.map((row) => (
          <li key={row.label} className="lm-sysstatus__row">
            <span
              className={['lm-dot', row.ok ? 'lm-dot--success' : 'lm-dot--danger'].join(' ')}
              aria-hidden="true"
            />
            <span className="lm-sysstatus__label">{row.label}</span>
            <span className="lm-sysstatus__value">{row.value}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
