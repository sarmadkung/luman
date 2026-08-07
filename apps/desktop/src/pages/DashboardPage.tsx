import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, StateView, type ViewStatus } from '@luman/ui';
import type { StorageOverview } from '@luman/core';
import { formatBytes } from '@luman/shared';
import { Page } from '../components/common';
import { useServices } from '../services';

/**
 * Home screen. Read-only: it shows the latest storage overview (none yet in
 * Sprint 1, so it renders the "No Scan" empty state) and entry points. It never
 * starts a scan or cleanup automatically.
 */
export function DashboardPage() {
  const { storage } = useServices();
  const navigate = useNavigate();
  const [status, setStatus] = useState<ViewStatus>('loading');
  const [overview, setOverview] = useState<StorageOverview | null>(null);

  useEffect(() => {
    let active = true;
    storage
      .getOverview()
      .then((result) => {
        if (!active) return;
        setOverview(result);
        setStatus(result ? 'success' : 'empty');
      })
      .catch(() => active && setStatus('error'));
    return () => {
      active = false;
    };
  }, [storage]);

  return (
    <Page title="Dashboard" description="Storage health at a glance.">
      <StateView
        status={status}
        loadingLabel="Checking storage…"
        emptyTitle="No scan yet"
        emptyDescription="Run your first Smart Scan to see how much space you can safely reclaim."
        emptyAction={
          <Button variant="primary" onClick={() => navigate('/smart-scan')}>
            Start Smart Scan
          </Button>
        }
        error={{ title: 'Could not load storage', description: 'Please try again.' }}
      >
        {overview && (
          <Card title="Storage overview">
            <p>
              {formatBytes(overview.usedBytes)} used of {formatBytes(overview.totalBytes)} ·{' '}
              {formatBytes(overview.reclaimableBytes)} reclaimable
            </p>
          </Card>
        )}
      </StateView>

      <Card title="Quick actions">
        <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
          <Button onClick={() => navigate('/smart-scan')}>Smart Scan</Button>
          <Button onClick={() => navigate('/space-lens')}>Space Lens</Button>
          <Button onClick={() => navigate('/settings')}>Settings</Button>
        </div>
      </Card>
    </Page>
  );
}
