import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { StatusBar } from './StatusBar';
import './AppLayout.css';

/** The application shell: sidebar + header + routed content + status bar. */
export function AppLayout() {
  return (
    <div className="lm-shell">
      <Sidebar />
      <div className="lm-shell__main">
        <Header />
        <main className="lm-shell__content">
          <Outlet />
        </main>
        <StatusBar />
      </div>
    </div>
  );
}
