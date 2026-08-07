/** The three theme modes the user can choose. */
export type ThemeMode = 'light' | 'dark' | 'system';

/** The concrete appearance actually applied after resolving `system`. */
export type ResolvedTheme = 'light' | 'dark';

export const THEME_MODES: readonly ThemeMode[] = ['light', 'dark', 'system'];
