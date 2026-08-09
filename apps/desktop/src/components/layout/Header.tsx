import { useLocation, useNavigate } from 'react-router-dom';
import { Icon, IconButton, type ThemeMode } from '@luman/ui';
import { Search, Sun, Moon, Monitor, Settings } from 'lucide-react';
import { NAV_ITEMS } from '../../app/nav-items';
import { useThemeStore } from '../../theme';
import { Breadcrumb } from './Breadcrumb';
import { QuickActionMenu } from './QuickActionMenu';
import './Header.css';

const EXTRA_TITLES: Record<string, string> = {
  '/large-files': 'Large Files',
};

const NEXT_MODE: Record<ThemeMode, ThemeMode> = { light: 'dark', dark: 'system', system: 'light' };
const MODE_ICON = { light: Sun, dark: Moon, system: Monitor } as const;

function titleForPath(pathname: string): string {
  const navMatch = NAV_ITEMS.find((i) =>
    i.path === '/' ? pathname === '/' : pathname.startsWith(i.path),
  );
  if (navMatch) return navMatch.label;
  const extra = Object.keys(EXTRA_TITLES).find((p) => pathname.startsWith(p));
  return extra ? EXTRA_TITLES[extra]! : 'Luman';
}

/**
 * Top bar: section title + breadcrumb, a search affordance, the Quick Action
 * menu, and the icon cluster (theme toggle, settings). Search is deliberately
 * disabled — an enabled box that does nothing is worse than one marked pending.
 */
export function Header() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const mode = useThemeStore((s) => s.mode);
  const setMode = useThemeStore((s) => s.setMode);

  return (
    <header className="lm-header" data-tauri-drag-region>
      {/*
        Deliberately not a heading element. The page content owns the document's
        single <h1> — on the dashboard that is the hero. A heading here would
        duplicate it and break the heading hierarchy.
      */}
      <div className="lm-header__titles">
        <div className="lm-header__title">{titleForPath(pathname)}</div>
        <Breadcrumb />
      </div>

      <div className="lm-header__search" title="Search is coming soon">
        <span className="lm-header__search-icon" aria-hidden="true">
          <Icon icon={Search} size="sm" />
        </span>
        <input
          type="search"
          className="lm-header__search-input"
          placeholder="Search files, apps…"
          aria-label="Search (coming soon)"
          disabled
        />
      </div>

      <div className="lm-header__actions">
        <QuickActionMenu />
        <IconButton
          icon={MODE_ICON[mode]}
          label={`Switch theme (current: ${mode})`}
          onClick={() => setMode(NEXT_MODE[mode])}
        />
        <IconButton icon={Settings} label="Open settings" onClick={() => navigate('/settings')} />
      </div>
    </header>
  );
}
