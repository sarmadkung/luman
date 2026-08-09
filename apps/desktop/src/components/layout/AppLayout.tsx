import { useLocation } from 'react-router-dom';
import { Outlet } from 'react-router-dom';
import { Aurora, ScrollableArea } from '@luman/ui';
import { NAV_ITEMS } from '../../app/nav-items';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { StatusBar } from './StatusBar';
import './AppLayout.css';

/**
 * Which route's colour the window is wearing. Paths without a nav entry
 * (e.g. /large-files) inherit the dashboard hue rather than flashing a
 * default, so the surface never blanks out mid-navigation.
 */
function routeKeyFor(pathname: string): string {
  const match = NAV_ITEMS.find((i) =>
    i.path === '/' ? pathname === '/' : pathname.startsWith(i.path),
  );
  return match?.key ?? 'dashboard';
}

/**
 * The application shell. Sidebar, header and status bar are transparent and
 * share ONE continuous background — they are regions of a single lit surface,
 * not separate panels stacked against each other.
 */
export function AppLayout() {
  const { pathname } = useLocation();

  return (
    <div className="lm-shell" data-route={routeKeyFor(pathname)}>
      <Aurora />
      <div className="lm-shell__frame">
        <Sidebar />
        <div className="lm-shell__main">
          <Header />
          <ScrollableArea className="lm-shell__content">
            <div className="lm-shell__container">
              <Outlet />
            </div>
          </ScrollableArea>
          <StatusBar />
        </div>
      </div>
    </div>
  );
}
