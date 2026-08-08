import { create } from 'zustand';

/** Ids of the primary navigation destinations. */
export type NavKey =
  'dashboard' | 'smart-scan' | 'space-lens' | 'history' | 'settings' | 'playground';

/**
 * Lightweight navigation UI state. The router remains the source of truth for
 * the URL; this store tracks the active item and sidebar collapse for the shell.
 */
export interface NavigationState {
  active: NavKey;
  sidebarCollapsed: boolean;
  setActive: (key: NavKey) => void;
  toggleSidebar: () => void;
}

export const useNavigationStore = create<NavigationState>((set) => ({
  active: 'dashboard',
  sidebarCollapsed: false,
  setActive: (active) => set({ active }),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
}));
