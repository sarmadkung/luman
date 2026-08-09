import { useNavigate } from 'react-router-dom';
import {
  Button,
  BreakdownList,
  DashboardCard,
  StateView,
  type BreakdownRow,
  type ViewStatus,
} from '@luman/ui';
import { formatBytes } from '@luman/shared';
import { useServices } from '../../services';
import { useAsync } from './use-async';

/** Bento card: used storage split by category. Read-only. */
export function StorageBreakdownWidget() {
  const { storage } = useServices();
  const navigate = useNavigate();
  const { status, data, reload } = useAsync(() => storage.getBreakdown(), []);

  const hasRows = !!data && data.length > 0;
  const viewStatus: ViewStatus =
    status === 'loading' ? 'loading' : status === 'error' ? 'error' : hasRows ? 'success' : 'empty';

  const rows: BreakdownRow[] = (data ?? []).map((category, index) => ({
    key: category.key,
    label: category.label,
    value: formatBytes(category.bytes),
    colorIndex: index + 1,
  }));

  return (
    <DashboardCard
      title="Storage Breakdown"
      actions={
        <Button variant="ghost" onClick={() => navigate('/space-lens')}>
          Details
        </Button>
      }
    >
      <StateView
        status={viewStatus}
        loadingLabel="Reading categories…"
        emptyTitle="No breakdown yet"
        emptyDescription="Run a Smart Scan to see how your storage is used."
        error={{ title: 'Could not read the breakdown', onRetry: reload }}
      >
        <BreakdownList rows={rows} ariaLabel="Storage by category" />
      </StateView>
    </DashboardCard>
  );
}
