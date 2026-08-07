import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Persisted user preferences (excluding theme, which has its own store).
 * Sprint 1 carries only safety-relevant defaults; no behavior is wired yet.
 */
export interface SettingsState {
  /** Cleanup must be confirmed. This default is intentionally conservative. */
  confirmBeforeCleanup: boolean;
  /** Reduce non-essential motion/animation. */
  reduceMotion: boolean;
  setConfirmBeforeCleanup: (value: boolean) => void;
  setReduceMotion: (value: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      confirmBeforeCleanup: true,
      reduceMotion: false,
      setConfirmBeforeCleanup: (confirmBeforeCleanup) => set({ confirmBeforeCleanup }),
      setReduceMotion: (reduceMotion) => set({ reduceMotion }),
    }),
    { name: 'luman.settings' },
  ),
);
