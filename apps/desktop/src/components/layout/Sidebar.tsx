import { NavLink } from 'react-router-dom';
import { NAV_ITEMS } from '../../app/nav-items';
import { useNavigationStore } from '../../stores';
import './Sidebar.css';

/** Left navigation rail. Active item is highlighted via NavLink's aria-current. */
export function Sidebar() {
  const setActive = useNavigationStore((s) => s.setActive);

  return (
    <nav className="lm-sidebar" aria-label="Primary">
      <div className="lm-sidebar__brand" data-tauri-drag-region>
        <span className="lm-sidebar__logo" aria-hidden="true">
          ◈
        </span>
        <span className="lm-sidebar__name">Luman</span>
      </div>
      <ul className="lm-sidebar__list">
        {NAV_ITEMS.map((item) => (
          <li key={item.key}>
            <NavLink
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                ['lm-sidebar__link', isActive && 'lm-sidebar__link--active']
                  .filter(Boolean)
                  .join(' ')
              }
              onClick={() => setActive(item.key)}
            >
              <span className="lm-sidebar__glyph" aria-hidden="true">
                {item.glyph}
              </span>
              <span>{item.label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
