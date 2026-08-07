import { useNavigate } from 'react-router-dom';
import { Button, DashboardCard, StateView, type ViewStatus } from '@luman/ui';
import { formatBytes } from '@luman/shared';
import { useServices } from '../../services';
import { useAsync } from './use-async';
import { formatRelativeTime } from './format-time';

interface RecoverableData {
  readonly reclaimableBytes: number | null;
  readonly lastScanAt: string | null;
}

/** Recoverable Space widget: reclaimable size + last scan time (or empty). */
export function RecoverableSpaceWidget() {
  const { storage, history } = useServices();
  const navigate = useNavigate();

  const { status, data, reload } = useAsync<RecoverableData>(async () => {
    const [overview, summary] = await Promise.all([
      storage.getOverview(),
      history.getActivitySummary(),
    ]);
    return {
      reclaimableBytes: overview?.reclaimableBytes ?? null,
      lastScanAt: summary?.lastScanAt ?? null,
    };
  }, []);

  const hasScan = !!data?.lastScanAt;
  const viewStatus: ViewStatus =
    status === 'loading' ? 'loading' : status === 'error' ? 'error' : hasScan ? 'success' : 'empty';

  return (
    <DashboardCard title="Recoverable Space">
      <StateView
        status={viewStatus}
        loadingLabel="Checking…"
        emptyTitle="No scan has been performed."
        emptyDescription="Run a Smart Scan to find space you can safely reclaim."
        emptyAction={
          <Button variant="primary" onClick={() => navigate('/smart-scan')}>
            Run Smart Scan
          </Button>
        }
        error={{ title: 'Could not load recoverable space', onRetry: reload }}
      >
        {data && (
          <div className="lm-recoverable">
            <div className="lm-recoverable__value">
              {data.reclaimableBytes != null ? formatBytes(data.reclaimableBytes) : '—'}
            </div>
            <div className="lm-recoverable__meta">
              Last scan {formatRelativeTime(data.lastScanAt)}
            </div>
            <Button variant="primary" onClick={() => navigate('/smart-scan')}>
              Run Smart Scan
            </Button>
          </div>
        )}
      </StateView>
    </DashboardCard>
  );
}
