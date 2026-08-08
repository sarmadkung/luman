import { useRef } from 'react';
import { NavLink } from 'react-router-dom';
import { Glass, Icon, IconButton } from '@luman/ui';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { NAV_ITEMS } from '../../app/nav-items';
import { useNavigationStore } from '../../stores';
import './Sidebar.css';

/**
 * Left navigation rail on a frosted-glass surface (glass is allowed here).
 * Supports active highlight, hover, collapse, and roving arrow-key navigation.
 */
export function Sidebar() {
  const setActive = useNavigationStore((s) => s.setActive);
  const collapsed = useNavigationStore((s) => s.sidebarCollapsed);
  const toggle = useNavigationStore((s) => s.toggleSidebar);
  const listRef = useRef<HTMLUListElement>(null);

  const onKeyDown = (e: React.KeyboardEvent<HTMLUListElement>) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    const links = Array.from(listRef.current?.querySelectorAll<HTMLAnchorElement>('a') ?? []);
    const idx = links.findIndex((l) => l === document.activeElement);
    if (idx === -1) return;
    e.preventDefault();
    const next =
      e.key === 'ArrowDown' ? (idx + 1) % links.length : (idx - 1 + links.length) % links.length;
    links[next]?.focus();
  };

  return (
    <Glass
      className={['lm-sidebar', collapsed && 'lm-sidebar--collapsed'].filter(Boolean).join(' ')}
      // Glass renders a div; nav semantics provided by the inner <nav>.
    >
      <nav aria-label="Primary" className="lm-sidebar__nav">
        <div className="lm-sidebar__brand" data-tauri-drag-region>
          <span className="lm-sidebar__logo" aria-hidden="true">
            ◈
          </span>
          {!collapsed && <span className="lm-sidebar__name">Luman</span>}
        </div>
        <ul className="lm-sidebar__list" ref={listRef} onKeyDown={onKeyDown}>
          {NAV_ITEMS.map((item) => (
            <li key={item.key}>
              <NavLink
                to={item.path}
                end={item.path === '/'}
                title={collapsed ? item.label : undefined}
                className={({ isActive }) =>
                  ['lm-sidebar__link', isActive && 'lm-sidebar__link--active']
                    .filter(Boolean)
                    .join(' ')
                }
                onClick={() => setActive(item.key)}
              >
                <Icon icon={item.icon} size="sm" />
                {!collapsed && <span>{item.label}</span>}
              </NavLink>
            </li>
          ))}
        </ul>
        <div className="lm-sidebar__footer">
          <IconButton
            icon={collapsed ? PanelLeftOpen : PanelLeftClose}
            label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            onClick={toggle}
          />
        </div>
      </nav>
    </Glass>
  );
}
