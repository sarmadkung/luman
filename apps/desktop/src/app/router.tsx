import { createBrowserRouter } from 'react-router-dom';
import { AppLayout } from '../components/layout';
import { PageTransition } from '../components/common';
import {
  DashboardPage,
  HistoryPage,
  NotFoundPage,
  SettingsPage,
  SmartScanPage,
  SpaceLensPage,
} from '../pages';

const withTransition = (node: React.ReactNode) => <PageTransition>{node}</PageTransition>;

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: withTransition(<DashboardPage />) },
      { path: 'smart-scan', element: withTransition(<SmartScanPage />) },
      { path: 'space-lens', element: withTransition(<SpaceLensPage />) },
      { path: 'history', element: withTransition(<HistoryPage />) },
      { path: 'settings', element: withTransition(<SettingsPage />) },
      { path: '*', element: withTransition(<NotFoundPage />) },
    ],
  },
]);
