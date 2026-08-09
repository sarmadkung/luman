import { MetricCard, StateView, type MetricTone, type ViewStatus } from '@luman/ui';
import { computeHealthScore, type HealthBand } from '@luman/domain';
import { HeartPulse } from 'lucide-react';
import { useStorageOverview } from './use-storage-overview';

const TONE_FOR_BAND: Record<HealthBand, MetricTone> = {
  healthy: 'success',
  attention: 'warning',
  low: 'danger',
};

/** Metrics-row card: a derived storage health score. Never reads SMART data. */
export function HealthWidget() {
  const { status, data, reload } = useStorageOverview();

  const viewStatus: ViewStatus =
    status === 'loading' ? 'loading' : status === 'error' ? 'error' : data ? 'success' : 'empty';

  if (viewStatus !== 'success' || !data) {
    return (
      <MetricCard label="Health" value="—" icon={HeartPulse}>
        <StateView
          status={viewStatus}
          loadingLabel="Assessing…"
          emptyTitle="Health is unknown"
          emptyDescription="Run a Smart Scan so Luman can assess your storage."
          error={{ title: 'Could not assess health', onRetry: reload }}
        />
      </MetricCard>
    );
  }

  const health = computeHealthScore(data);

  return (
    <MetricCard
      label="Health"
      value={`${health.score}%`}
      caption={health.description}
      icon={HeartPulse}
      tone={TONE_FOR_BAND[health.band]}
    />
  );
}
