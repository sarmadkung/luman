import { Glass, IconButton, Tooltip } from '@luman/ui';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useThemeStore } from '../../theme';
import type { ThemeMode } from '@luman/ui';
import './Toolbar.css';

const NEXT_MODE: Record<ThemeMode, ThemeMode> = { light: 'dark', dark: 'system', system: 'light' };
const MODE_ICON = { light: Sun, dark: Moon, system: Monitor } as const;

/** Slim window toolbar on a glass surface (glass allowed). Hosts quick actions. */
export function Toolbar() {
  const mode = useThemeStore((s) => s.mode);
  const setMode = useThemeStore((s) => s.setMode);
  return (
    <Glass className="lm-toolbar">
      <div className="lm-toolbar__inner">
        <div className="lm-toolbar__spacer" />
        <Tooltip content={`Theme: ${mode}`}>
          <IconButton
            icon={MODE_ICON[mode]}
            label={`Switch theme (current: ${mode})`}
            onClick={() => setMode(NEXT_MODE[mode])}
          />
        </Tooltip>
      </div>
    </Glass>
  );
}
