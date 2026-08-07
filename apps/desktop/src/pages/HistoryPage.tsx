import { useEffect, useState } from 'react';
import { StateView, type ViewStatus } from '@luman/ui';
import type { CleanupAction } from '@luman/domain';
import { Page } from '../components/common';
import { useServices } from '../services';

/** Past cleanup actions. Empty in Sprint 1 (no cleanup has run). */
export function HistoryPage() {
  const { cleanup } = useServices();
  const [status, setStatus] = useState<ViewStatus>('loading');

  useEffect(() => {
    let active = true;
    cleanup
      .getHistory()
      .then((items: readonly CleanupAction[]) => {
        if (active) setStatus(items.length > 0 ? 'success' : 'empty');
      })
      .catch(() => active && setStatus('error'));
    return () => {
      active = false;
    };
  }, [cleanup]);

  return (
    <Page title="History" description="A record of past cleanups.">
      <StateView
        status={status}
        loadingLabel="Loading history…"
        emptyTitle="No history yet"
        emptyDescription="Cleanups you run will appear here, including how much space you reclaimed."
        error={{ title: 'Could not load history' }}
      />
    </Page>
  );
}
