import { useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import './PageTransition.css';

/** Re-mounts + fades content on route change for a subtle page transition. */
export function PageTransition({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  return (
    <div key={pathname} className="lm-transition">
      {children}
    </div>
  );
}
