import { useRef } from 'react';
import { NavLink } from 'react-router-dom';
import { Icon, IconButton } from '@luman/ui';
import { HardDrive, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { NAV_ITEMS, type NavItem } from '../../app/nav-items';
import { useNavigationStore } from '../../stores';
import './Sidebar.css';

const PRIMARY = NAV_ITEMS.filter((i) => i.group === 'primary');
const SECONDARY = NAV_ITEMS.filter((i) => i.group === 'secondary');

/**
 * Left navigation rail on frosted chrome glass. Brand block, primary
 * destinations, then a pinned footer group. Supports active highlight,
 * collapse, and roving arrow-key navigation across every link.
 */
export function Sidebar() {
  const setActive = useNavigationStore((s) => s.setActive);
  const collapsed = useNavigationStore((s) => s.sidebarCollapsed);
  const toggle = useNavigationStore((s) => s.toggleSidebar);
  const navRef = useRef<HTMLElement>(null);

  const onKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    const links = Array.from(navRef.current?.querySelectorAll<HTMLAnchorElement>('a') ?? []);
    const idx = links.findIndex((l) => l === document.activeElement);
    if (idx === -1) return;
    e.preventDefault();
    const next =
      e.key === 'ArrowDown' ? (idx + 1) % links.length : (idx - 1 + links.length) % links.length;
    links[next]?.focus();
  };

  const renderLink = (item: NavItem) => (
    <li key={item.key}>
      <NavLink
        to={item.path}
        end={item.path === '/'}
        title={collapsed ? item.label : undefined}
        className={({ isActive }) =>
          ['lm-sidebar__link', isActive && 'lm-sidebar__link--active'].filter(Boolean).join(' ')
        }
        onClick={() => setActive(item.key)}
      >
        <Icon icon={item.icon} size="sm" />
        {!collapsed && <span>{item.label}</span>}
      </NavLink>
    </li>
  );

  return (
    <div className={['lm-sidebar', collapsed && 'lm-sidebar--collapsed'].filter(Boolean).join(' ')}>
      <nav aria-label="Primary" className="lm-sidebar__nav" ref={navRef} onKeyDown={onKeyDown}>
        <div className="lm-sidebar__brand" data-tauri-drag-region>
          <span className="lm-sidebar__logo" aria-hidden="true">
            <Icon icon={HardDrive} size="md" />
          </span>
          {!collapsed && (
            <span className="lm-sidebar__brand-text">
              <span className="lm-sidebar__name">Luman</span>
              <span className="lm-sidebar__tagline">Storage Intelligence</span>
            </span>
          )}
        </div>

        <ul className="lm-sidebar__list">{PRIMARY.map(renderLink)}</ul>

        <div className="lm-sidebar__footer">
          <ul className="lm-sidebar__footer-nav">{SECONDARY.map(renderLink)}</ul>
          <div className="lm-sidebar__toggle">
            <IconButton
              icon={collapsed ? PanelLeftOpen : PanelLeftClose}
              label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              onClick={toggle}
            />
          </div>
        </div>
      </nav>
    </div>
  );
}
