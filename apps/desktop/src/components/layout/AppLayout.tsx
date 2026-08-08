import { Outlet } from 'react-router-dom';
import { Aurora, ScrollableArea } from '@luman/ui';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { Toolbar } from './Toolbar';
import { StatusBar } from './StatusBar';
import './AppLayout.css';

/** The application shell: aurora + sidebar + header + toolbar + content + status. */
export function AppLayout() {
  return (
    <>
      <Aurora />
      <div className="lm-shell">
        <Sidebar />
        <div className="lm-shell__main">
          <Header />
          <Toolbar />
          <ScrollableArea className="lm-shell__content">
            <Outlet />
          </ScrollableArea>
          <StatusBar />
        </div>
      </div>
    </>
  );
}
