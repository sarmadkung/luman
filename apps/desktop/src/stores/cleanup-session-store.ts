import { create } from 'zustand';

/** Transient state for a cleanup the user is assembling. No logic yet. */
export type CleanupSessionStatus = 'idle' | 'reviewing' | 'cleaning' | 'completed' | 'error';

export interface CleanupSessionState {
  status: CleanupSessionStatus;
  selectedFindingIds: readonly string[];
  reset: () => void;
}

export const useCleanupSessionStore = create<CleanupSessionState>((set) => ({
  status: 'idle',
  selectedFindingIds: [],
  reset: () => set({ status: 'idle', selectedFindingIds: [] }),
}));
