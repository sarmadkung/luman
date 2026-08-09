import {
  MetricCard,
  ProgressBar,
  StateView,
  type ProgressSegment,
  type ViewStatus,
} from '@luman/ui';
import { formatBytes } from '@luman/shared';
import { HardDrive } from 'lucide-react';
import { useStorageOverview } from './use-storage-overview';

/** Metrics-row card: used vs total storage, with a utilization bar. */
export function StorageUsedWidget() {
  const { status, data, reload } = useStorageOverview();

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
      ]
    : [];

  if (viewStatus !== 'success' || !data) {
    return (
      <MetricCard label="Storage Used" value="—" icon={HardDrive}>
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
        />
      </MetricCard>
    );
  }

  return (
    <MetricCard
      label="Storage Used"
      value={formatBytes(data.usedBytes)}
      secondary={`/ ${formatBytes(data.totalBytes)}`}
      icon={HardDrive}
    >
      <ProgressBar segments={segments} ariaLabel="Storage utilization" />
    </MetricCard>
  );
}
