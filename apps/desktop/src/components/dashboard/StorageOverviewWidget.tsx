import { useNavigate } from 'react-router-dom';
import {
  Button,
  DashboardCard,
  ProgressBar,
  StatCard,
  StateView,
  type ProgressSegment,
  type ViewStatus,
} from '@luman/ui';
import { formatBytes } from '@luman/shared';
import { useServices } from '../../services';
import { useAsync } from './use-async';

/** Storage Overview widget: total/used/free with a utilization bar. */
export function StorageOverviewWidget() {
  const { storage } = useServices();
  const navigate = useNavigate();
  const { status, data, reload } = useAsync(() => storage.getOverview(), []);

  const viewStatus: ViewStatus =
    status === 'loading' ? 'loading' : status === 'error' ? 'error' : data ? 'success' : 'empty';

  const segments: ProgressSegment[] = data
    ? [
        {
          fraction: (data.usedBytes - data.reclaimableBytes) / data.totalBytes,
          tone: 'accent',
          label: 'In use',
        },
        {
          fraction: data.reclaimableBytes / data.totalBytes,
          tone: 'warning',
          label: 'Reclaimable',
        },
        { fraction: data.freeBytes / data.totalBytes, tone: 'muted', label: 'Free' },
      ]
    : [];

  return (
    <DashboardCard
      title="Storage Overview"
      subtitle={data?.volume}
      actions={
        <>
          <Button variant="ghost" onClick={() => navigate('/space-lens')}>
            Open Space Lens
          </Button>
          <Button variant="secondary" onClick={reload} disabled={status === 'loading'}>
            Refresh
          </Button>
        </>
      }
    >
      <StateView
        status={viewStatus}
        loadingLabel="Reading storage…"
        emptyTitle="Storage information unavailable"
        emptyDescription="We couldn't determine your storage usage. Try refreshing."
        error={{
          title: 'Could not read storage',
          description: 'Something went wrong while reading storage usage.',
          onRetry: reload,
        }}
      >
        {data && (
          <div className="lm-storage">
            <ProgressBar segments={segments} ariaLabel="Storage utilization" />
            <div className="lm-storage__legend">
              <span>
                <i className="lm-dot lm-dot--accent" /> In use
              </span>
              <span>
                <i className="lm-dot lm-dot--warning" /> Reclaimable
              </span>
              <span>
                <i className="lm-dot lm-dot--muted" /> Free
              </span>
            </div>
            <div className="lm-storage__stats">
              <StatCard label="Total" value={formatBytes(data.totalBytes)} />
              <StatCard label="Used" value={formatBytes(data.usedBytes)} tone="accent" />
              <StatCard label="Free" value={formatBytes(data.freeBytes)} tone="success" />
            </div>
          </div>
        )}
      </StateView>
    </DashboardCard>
  );
}
