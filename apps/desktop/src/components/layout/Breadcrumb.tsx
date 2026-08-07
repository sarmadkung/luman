import { useLocation } from 'react-router-dom';
import './Breadcrumb.css';

const LABELS: Record<string, string> = {
  '': 'Dashboard',
  'smart-scan': 'Smart Scan',
  'space-lens': 'Space Lens',
  'large-files': 'Large Files',
  applications: 'Applications',
  history: 'History',
  settings: 'Settings',
};

/** Simple breadcrumb: Luman / <current section>. */
export function Breadcrumb() {
  const { pathname } = useLocation();
  const segment = pathname.replace(/^\//, '').split('/')[0] ?? '';
  const current = LABELS[segment] ?? 'Dashboard';
  return (
    <nav className="lm-breadcrumb" aria-label="Breadcrumb">
      <ol>
        <li className="lm-breadcrumb__root">Luman</li>
        <li className="lm-breadcrumb__sep" aria-hidden="true">
          /
        </li>
        <li aria-current="page">{current}</li>
      </ol>
    </nav>
  );
}
