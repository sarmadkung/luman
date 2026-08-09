import { useNavigate } from 'react-router-dom';
import { Button, HeroBanner, Icon, StorageOrb } from '@luman/ui';
import { Zap } from 'lucide-react';
import { useStorageOverview } from './use-storage-overview';
import { heroCopy, type HeroState } from './hero-copy';

/**
 * The dashboard's hero band. Copy is derived from live figures. The CTA routes
 * to Smart Scan — it never starts a scan, per the dashboard's read-only rule.
 */
export function DashboardHero() {
  const navigate = useNavigate();
  const { status, data } = useStorageOverview();

  const state: HeroState =
    status === 'loading' ? 'loading' : status === 'error' ? 'error' : data ? 'ready' : 'no-data';
  const { headline, subhead } = heroCopy(state, data);

  return (
    <HeroBanner
      headline={headline}
      subhead={subhead}
      action={
        <Button variant="primary" onClick={() => navigate('/smart-scan')}>
          <Icon icon={Zap} size="sm" />
          Smart Scan
        </Button>
      }
      visual={<StorageOrb size={300} />}
    />
  );
}
