import type { ResolvedTheme, ThemeMode } from '@luman/ui';

/** Pure resolution of a mode to a concrete appearance, given the OS preference. */
export function resolveTheme(mode: ThemeMode, systemPrefersDark: boolean): ResolvedTheme {
  if (mode === 'system') return systemPrefersDark ? 'dark' : 'light';
  return mode;
}
