import type { NavKey } from '../stores';

export interface NavItem {
  readonly key: NavKey;
  readonly label: string;
  readonly path: string;
  /** Simple glyph placeholder; a real icon set arrives with the design system. */
  readonly glyph: string;
}

/** Primary navigation destinations (Design Spec sidebar order). */
export const NAV_ITEMS: readonly NavItem[] = [
  { key: 'dashboard', label: 'Dashboard', path: '/', glyph: '◱' },
  { key: 'smart-scan', label: 'Smart Scan', path: '/smart-scan', glyph: '◎' },
  { key: 'space-lens', label: 'Space Lens', path: '/space-lens', glyph: '◔' },
  { key: 'history', label: 'History', path: '/history', glyph: '↺' },
  { key: 'settings', label: 'Settings', path: '/settings', glyph: '⚙' },
];
