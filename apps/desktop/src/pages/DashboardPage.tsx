import { Page } from '../components/common';
import {
  DashboardHero,
  StorageUsedWidget,
  HealthWidget,
  StorageBreakdownWidget,
  RecommendationsWidget,
  RecentActivityWidget,
} from '../components/dashboard';
import '../components/dashboard/Dashboard.css';

/**
 * Home screen. Hero, then a two-up metrics row, then the bento grid. All data
 * flows through service interfaces; this page contains no business logic and
 * never starts a scan or cleanup. The hero supplies the page's <h1>, so no
 * Page title is passed.
 */
export function DashboardPage() {
  return (
    <Page>
      <DashboardHero />

      <section className="lm-dashboard__metrics">
        <StorageUsedWidget />
        <HealthWidget />
      </section>

      <section className="lm-dashboard">
        <div className="lm-dashboard__wide">
          <StorageBreakdownWidget />
        </div>
        <RecommendationsWidget />
        <div className="lm-dashboard__full">
          <RecentActivityWidget />
        </div>
      </section>
    </Page>
  );
}
