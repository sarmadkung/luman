import { Outlet } from 'react-router-dom';
import { Aurora, ScrollableArea } from '@luman/ui';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { StatusBar } from './StatusBar';
import './AppLayout.css';

/** The application shell: aurora + sidebar + header + content + status. */
export function AppLayout() {
  return (
    <>
      <Aurora />
      <div className="lm-shell">
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
    </>
  );
}
