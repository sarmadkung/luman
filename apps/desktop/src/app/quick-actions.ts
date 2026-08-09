import {
  ScanSearch,
  PieChart,
  FileStack,
  LayoutGrid,
  Settings,
  type LucideIcon,
} from 'lucide-react';

export interface QuickAction {
  readonly key: string;
  readonly label: string;
  readonly description: string;
  readonly icon: LucideIcon;
  readonly path: string;
}

/**
 * Actions offered by the header's Quick Action menu. Large Files has no sidebar
 * entry in the redesigned nav, so this menu is its only in-app route.
 */
export const QUICK_ACTIONS: readonly QuickAction[] = [
  {
    key: 'smart-scan',
    label: 'Smart Scan',
    description: 'Analyze storage',
    icon: ScanSearch,
    path: '/smart-scan',
  },
  {
    key: 'space-lens',
    label: 'Space Lens',
    description: 'Visualize usage',
    icon: PieChart,
    path: '/space-lens',
  },
  {
    key: 'large-files',
    label: 'Large Files',
    description: 'Find big files',
    icon: FileStack,
    path: '/large-files',
  },
  {
    key: 'applications',
    label: 'Applications',
    description: 'Manage apps',
    icon: LayoutGrid,
    path: '/applications',
  },
  {
    key: 'settings',
    label: 'Settings',
    description: 'Preferences',
    icon: Settings,
    path: '/settings',
  },
];
