import { create } from 'zustand';

/**
 * Top-level application lifecycle state (bootstrapping, fatal init errors).
 * No business logic — just readiness flags the shell reacts to.
 */
export interface ApplicationState {
  ready: boolean;
  initError: string | null;
  setReady: (ready: boolean) => void;
  setInitError: (error: string | null) => void;
}

export const useApplicationStore = create<ApplicationState>((set) => ({
  ready: false,
  initError: null,
  setReady: (ready) => set({ ready }),
  setInitError: (initError) => set({ initError }),
}));
