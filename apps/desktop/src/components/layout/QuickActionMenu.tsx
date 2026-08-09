import { useNavigate } from 'react-router-dom';
import { Popover, Icon } from '@luman/ui';
import { QUICK_ACTIONS } from '../../app/quick-actions';

/**
 * The header's primary action. A menu rather than a single button so that
 * Large Files stays reachable — it has no sidebar entry in the redesigned nav.
 */
export function QuickActionMenu() {
  const navigate = useNavigate();

  return (
    <Popover
      align="end"
      trigger={(props) => (
        <button type="button" className="lm-button lm-button--primary" {...props}>
          Quick Action
        </button>
      )}
    >
      <ul className="lm-quickmenu">
        {QUICK_ACTIONS.map((action) => (
          <li key={action.key}>
            <button
              type="button"
              className="lm-quickmenu__item"
              onClick={() => navigate(action.path)}
            >
              <Icon icon={action.icon} size="sm" />
              <span className="lm-quickmenu__text">
                <span className="lm-quickmenu__label">{action.label}</span>
                <span className="lm-quickmenu__desc">{action.description}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </Popover>
  );
}
