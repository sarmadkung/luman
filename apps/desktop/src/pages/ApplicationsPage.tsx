import { EmptyState } from '@luman/ui';
import { Page } from '../components/common';

/** Placeholder for the Applications manager (implemented in a later sprint). */
export function ApplicationsPage() {
  return (
    <Page title="Applications" description="Manage installed apps and their leftovers.">
      <EmptyState
        icon="▦"
        title="Applications is coming soon"
        description="Application management builds on the scanner and cleanup engine from later sprints."
      />
    </Page>
  );
}
