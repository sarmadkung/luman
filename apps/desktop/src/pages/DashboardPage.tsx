import { Page } from '../components/common';
import {
  StorageOverviewWidget,
  RecoverableSpaceWidget,
  QuickActionsWidget,
  RecommendationsWidget,
  RecentActivityWidget,
  SystemStatusWidget,
} from '../components/dashboard';
import '../components/dashboard/Dashboard.css';

/**
 * Home screen (Sprint 2). Composes storage, recoverable-space, quick-actions,
 * recommendations, recent-activity and system-status widgets in a responsive
 * grid. All data flows through service interfaces (mocked in Sprint 2); this
 * page contains no business logic and never starts a scan or cleanup on its own.
 */
export function DashboardPage() {
  return (
    <Page title="Dashboard" description="Your storage at a glance.">
      <div className="lm-dashboard">
        <div className="lm-dashboard__wide">
          <StorageOverviewWidget />
        </div>
        <RecoverableSpaceWidget />

        <div className="lm-dashboard__full">
          <QuickActionsWidget />
        </div>

        <div className="lm-dashboard__wide">
          <RecommendationsWidget />
        </div>
        <RecentActivityWidget />

        <div className="lm-dashboard__full">
          <SystemStatusWidget />
        </div>
      </div>
    </Page>
  );
}
