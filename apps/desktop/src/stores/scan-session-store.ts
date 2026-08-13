import { create } from 'zustand';

/** Transient state for an in-flight scan. Populated by Sprint 05; empty now. */
export type ScanSessionStatus = 'idle' | 'scanning' | 'completed' | 'error';

export interface ScanSessionState {
  status: ScanSessionStatus;
  activeScanId: string | null;
  /** 0..1 progress. */
  progress: number;
  reset: () => void;
}

export const useScanSessionStore = create<ScanSessionState>((set) => ({
  status: 'idle',
  activeScanId: null,
  progress: 0,
  reset: () => set({ status: 'idle', activeScanId: null, progress: 0 }),
}));
