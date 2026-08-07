import { useLocation } from 'react-router-dom';
import { NAV_ITEMS } from '../../app/nav-items';
import './Header.css';

function titleForPath(pathname: string): string {
  const match = NAV_ITEMS.find((i) =>
    i.path === '/' ? pathname === '/' : pathname.startsWith(i.path),
  );
  return match?.label ?? 'Luman';
}

/** Top bar showing the current section title. */
export function Header() {
  const { pathname } = useLocation();
  return (
    <header className="lm-header" data-tauri-drag-region>
      <h1 className="lm-header__title">{titleForPath(pathname)}</h1>
    </header>
  );
}
