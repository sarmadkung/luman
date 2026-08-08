import {
  LayoutDashboard,
  ScanSearch,
  PieChart,
  Clock,
  Settings,
  Palette,
  type LucideIcon,
} from 'lucide-react';
import type { NavKey } from '../stores';

export interface NavItem {
  readonly key: NavKey;
  readonly label: string;
  readonly path: string;
  readonly icon: LucideIcon;
}

/** Primary navigation destinations (Design Spec sidebar order). */
export const NAV_ITEMS: readonly NavItem[] = [
  { key: 'dashboard', label: 'Dashboard', path: '/', icon: LayoutDashboard },
  { key: 'smart-scan', label: 'Smart Scan', path: '/smart-scan', icon: ScanSearch },
  { key: 'space-lens', label: 'Space Lens', path: '/space-lens', icon: PieChart },
  { key: 'history', label: 'History', path: '/history', icon: Clock },
  { key: 'settings', label: 'Settings', path: '/settings', icon: Settings },
  { key: 'playground', label: 'Playground', path: '/playground', icon: Palette },
];
