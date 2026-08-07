import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { useThemeStore } from './theme-store';
import { resolveTheme } from './resolve-theme';

const DARK_QUERY = '(prefers-color-scheme: dark)';

/**
 * Applies the resolved theme to <html data-theme> and keeps it in sync with the
 * OS appearance while the user is in `system` mode.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const mode = useThemeStore((s) => s.mode);
  const setResolved = useThemeStore((s) => s.setResolved);

  useEffect(() => {
    const mql = window.matchMedia(DARK_QUERY);
    const apply = () => {
      const resolved = resolveTheme(mode, mql.matches);
      document.documentElement.setAttribute('data-theme', resolved);
      setResolved(resolved);
    };
    apply();
    mql.addEventListener('change', apply);
    return () => mql.removeEventListener('change', apply);
  }, [mode, setResolved]);

  return <>{children}</>;
}
