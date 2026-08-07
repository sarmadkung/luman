import { useNavigate } from 'react-router-dom';
import { DashboardCard, RecommendationCard, StateView, type ViewStatus } from '@luman/ui';
import { useServices } from '../../services';
import { useAsync } from './use-async';
import { toRecommendationView, topRecommendations } from './recommendation-view';

/** Recommendation cards (max 5, highest priority first). */
export function RecommendationsWidget() {
  const { recommendations } = useServices();
  const navigate = useNavigate();
  const { status, data, reload } = useAsync(() => recommendations.getRecommendations(), []);

  const items = data ? topRecommendations(data, 5).map(toRecommendationView) : [];
  const viewStatus: ViewStatus =
    status === 'loading'
      ? 'loading'
      : status === 'error'
        ? 'error'
        : items.length > 0
          ? 'success'
          : 'empty';

  return (
    <DashboardCard title="Recommendations" subtitle="Safe ways to reclaim space">
      <StateView
        status={viewStatus}
        loadingLabel="Finding recommendations…"
        emptyTitle="You're all set"
        emptyDescription="There are no recommendations right now."
        error={{ title: 'Could not load recommendations', onRetry: reload }}
      >
        <div className="lm-recommendations">
          {items.map((item) => (
            <RecommendationCard
              key={item.id}
              icon={item.icon}
              title={item.title}
              description={item.description}
              estimatedRecovery={item.estimatedRecovery}
              priority={item.priority}
              onAction={() => navigate('/smart-scan')}
            />
          ))}
        </div>
      </StateView>
    </DashboardCard>
  );
}
