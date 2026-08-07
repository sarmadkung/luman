import { useNavigate } from 'react-router-dom';
import { DashboardCard, QuickActionButton } from '@luman/ui';
import { QUICK_ACTIONS } from './quick-actions';

/** Quick Actions grid. Each tile routes to its destination. */
export function QuickActionsWidget() {
  const navigate = useNavigate();
  return (
    <DashboardCard title="Quick Actions">
      <div className="lm-quickactions">
        {QUICK_ACTIONS.map((action) => (
          <QuickActionButton
            key={action.key}
            icon={action.icon}
            label={action.label}
            description={action.description}
            onClick={() => navigate(action.path)}
          />
        ))}
      </div>
    </DashboardCard>
  );
}
