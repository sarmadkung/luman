export interface QuickAction {
  readonly key: string;
  readonly label: string;
  readonly description: string;
  readonly icon: string;
  readonly path: string;
}

/** Quick Action tiles (Epic 4). Each routes to a real or placeholder page. */
export const QUICK_ACTIONS: readonly QuickAction[] = [
  {
    key: 'smart-scan',
    label: 'Smart Scan',
    description: 'Analyze storage',
    icon: '◎',
    path: '/smart-scan',
  },
  {
    key: 'space-lens',
    label: 'Space Lens',
    description: 'Visualize usage',
    icon: '◔',
    path: '/space-lens',
  },
  {
    key: 'large-files',
    label: 'Large Files',
    description: 'Find big files',
    icon: '⬒',
    path: '/large-files',
  },
  {
    key: 'applications',
    label: 'Applications',
    description: 'Manage apps',
    icon: '▦',
    path: '/applications',
  },
  { key: 'settings', label: 'Settings', description: 'Preferences', icon: '⚙', path: '/settings' },
];
