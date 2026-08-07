import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ResolvedTheme, ThemeMode } from '@luman/ui';

/**
 * Theme state (Epic 3). Persists the user's chosen mode. `resolved` is the
 * concrete light/dark actually applied after evaluating `system`.
 */
export interface ThemeState {
  mode: ThemeMode;
  resolved: ResolvedTheme;
  setMode: (mode: ThemeMode) => void;
  setResolved: (resolved: ResolvedTheme) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      mode: 'system',
      resolved: 'light',
      setMode: (mode) => set({ mode }),
      setResolved: (resolved) => set({ resolved }),
    }),
    { name: 'luman.theme', partialize: (s) => ({ mode: s.mode }) },
  ),
);
