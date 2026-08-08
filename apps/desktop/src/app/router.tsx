import type { ReactNode } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { AppLayout } from '../components/layout';
import { PageTransition } from '../components/common';
import {
  ApplicationsPage,
  DashboardPage,
  HistoryPage,
  LargeFilesPage,
  NotFoundPage,
  PlaygroundPage,
  SettingsPage,
  SmartScanPage,
  SpaceLensPage,
} from '../pages';

const withTransition = (node: ReactNode) => <PageTransition>{node}</PageTransition>;

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: withTransition(<DashboardPage />) },
      { path: 'smart-scan', element: withTransition(<SmartScanPage />) },
      { path: 'space-lens', element: withTransition(<SpaceLensPage />) },
      { path: 'large-files', element: withTransition(<LargeFilesPage />) },
      { path: 'applications', element: withTransition(<ApplicationsPage />) },
      { path: 'history', element: withTransition(<HistoryPage />) },
      { path: 'settings', element: withTransition(<SettingsPage />) },
      { path: 'playground', element: withTransition(<PlaygroundPage />) },
      { path: '*', element: withTransition(<NotFoundPage />) },
    ],
  },
]);
