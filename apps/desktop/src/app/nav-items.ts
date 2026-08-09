import {
  LayoutDashboard,
  ScanSearch,
  Sparkles,
  PieChart,
  LayoutGrid,
  Terminal,
  Clock,
  Settings,
  Palette,
  type LucideIcon,
} from 'lucide-react';
import type { NavKey } from '../stores';

/** `primary` renders in the main list; `secondary` pins to the sidebar footer. */
export type NavGroup = 'primary' | 'secondary';

export interface NavItem {
  readonly key: NavKey;
  readonly label: string;
  readonly path: string;
  readonly icon: LucideIcon;
  readonly group: NavGroup;
}

/** Primary navigation destinations, in redesign order. */
export const NAV_ITEMS: readonly NavItem[] = [
  { key: 'dashboard', label: 'Dashboard', path: '/', icon: LayoutDashboard, group: 'primary' },
  {
    key: 'smart-scan',
    label: 'Smart Scan',
    path: '/smart-scan',
    icon: ScanSearch,
    group: 'primary',
  },
  { key: 'cleanup', label: 'Cleanup', path: '/cleanup', icon: Sparkles, group: 'primary' },
  { key: 'space-lens', label: 'Space Lens', path: '/space-lens', icon: PieChart, group: 'primary' },
  {
    key: 'applications',
    label: 'Applications',
    path: '/applications',
    icon: LayoutGrid,
    group: 'primary',
  },
  {
    key: 'developer-center',
    label: 'Developer Center',
    path: '/developer-center',
    icon: Terminal,
    group: 'primary',
  },
  { key: 'history', label: 'History', path: '/history', icon: Clock, group: 'primary' },
  {
    key: 'playground',
    label: 'Playground',
    path: '/playground',
    icon: Palette,
    group: 'secondary',
  },
  { key: 'settings', label: 'Settings', path: '/settings', icon: Settings, group: 'secondary' },
];
