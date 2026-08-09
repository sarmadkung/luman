import { EmptyState } from '@luman/ui';
import { Page } from '../components/common';

/** Placeholder for guided cleanup (implemented in a later sprint). */
export function CleanupPage() {
  return (
    <Page title="Cleanup" description="Review and reclaim space safely.">
      <EmptyState
        icon="🧹"
        title="Cleanup is coming soon"
        description="Guided cleanup depends on the scanning engine, which arrives in a later sprint. Nothing is ever deleted without your explicit confirmation."
      />
    </Page>
  );
}
