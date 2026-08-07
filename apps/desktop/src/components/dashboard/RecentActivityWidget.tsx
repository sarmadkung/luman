import { DashboardCard, StatCard, StateView, type ViewStatus } from '@luman/ui';
import { formatBytes } from '@luman/shared';
import { useServices } from '../../services';
import { useAsync } from './use-async';
import { formatRelativeTime } from './format-time';

/** Recent Activity: last scan, last cleanup, total recovered. */
export function RecentActivityWidget() {
  const { history } = useServices();
  const { status, data, reload } = useAsync(() => history.getActivitySummary(), []);

  const viewStatus: ViewStatus =
    status === 'loading' ? 'loading' : status === 'error' ? 'error' : data ? 'success' : 'empty';

  return (
    <DashboardCard title="Recent Activity">
      <StateView
        status={viewStatus}
        loadingLabel="Loading activity…"
        emptyTitle="No activity yet."
        emptyDescription="Your scans and cleanups will show up here."
        error={{ title: 'Could not load activity', onRetry: reload }}
      >
        {data && (
          <div className="lm-activity">
            <StatCard label="Last Scan" value={formatRelativeTime(data.lastScanAt)} />
            <StatCard label="Last Cleanup" value={formatRelativeTime(data.lastCleanupAt)} />
            <StatCard
              label="Total Recovered"
              value={formatBytes(data.totalRecoveredBytes)}
              tone="success"
            />
          </div>
        )}
      </StateView>
    </DashboardCard>
  );
}
