import { useLocation } from 'react-router-dom';
import { NAV_ITEMS } from '../../app/nav-items';
import { Breadcrumb } from './Breadcrumb';
import './Header.css';

const EXTRA_TITLES: Record<string, string> = {
  '/large-files': 'Large Files',
  '/applications': 'Applications',
};

function titleForPath(pathname: string): string {
  const navMatch = NAV_ITEMS.find((i) =>
    i.path === '/' ? pathname === '/' : pathname.startsWith(i.path),
  );
  if (navMatch) return navMatch.label;
  const extra = Object.keys(EXTRA_TITLES).find((p) => pathname.startsWith(p));
  return extra ? EXTRA_TITLES[extra]! : 'Luman';
}

/** Top bar: current section title + breadcrumb. */
export function Header() {
  const { pathname } = useLocation();
  return (
    <header className="lm-header" data-tauri-drag-region>
      <div className="lm-header__titles">
        <h1 className="lm-header__title">{titleForPath(pathname)}</h1>
        <Breadcrumb />
      </div>
    </header>
  );
}
