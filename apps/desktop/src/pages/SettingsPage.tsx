import { Card } from '@luman/ui';
import { THEME_MODES, type ThemeMode } from '@luman/ui';
import { Page } from '../components/common';
import { useThemeStore } from '../theme';
import { useSettingsStore } from '../stores';
import { SystemStatusCard } from '../components/settings';
import './SettingsPage.css';

/** Settings: theme selection (Epic 3) and conservative safety defaults. */
export function SettingsPage() {
  const mode = useThemeStore((s) => s.mode);
  const setMode = useThemeStore((s) => s.setMode);
  const confirmBeforeCleanup = useSettingsStore((s) => s.confirmBeforeCleanup);
  const setConfirmBeforeCleanup = useSettingsStore((s) => s.setConfirmBeforeCleanup);

  return (
    <Page title="Settings" description="Personalize Luman.">
      <Card title="Appearance">
        <div className="lm-settings__row">
          <label htmlFor="theme-mode">Theme</label>
          <select
            id="theme-mode"
            className="lm-settings__select"
            value={mode}
            onChange={(e) => setMode(e.target.value as ThemeMode)}
          >
            {THEME_MODES.map((m) => (
              <option key={m} value={m}>
                {m[0]?.toUpperCase()}
                {m.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </Card>

      <Card title="Safety">
        <label className="lm-settings__row lm-settings__row--check">
          <input
            type="checkbox"
            checked={confirmBeforeCleanup}
            onChange={(e) => setConfirmBeforeCleanup(e.target.checked)}
          />
          <span>Always confirm before deleting anything</span>
        </label>
        <p className="lm-settings__hint">
          Cleanup is always explicit. This safeguard cannot be bypassed by automation.
        </p>
      </Card>

      <SystemStatusCard />
    </Page>
  );
}
