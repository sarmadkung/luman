import { EmptyState } from '@luman/ui';
import { Page } from '../components/common';

/** Placeholder for developer tooling caches (implemented in a later sprint). */
export function DeveloperCenterPage() {
  return (
    <Page title="Developer Center" description="Reclaim space from developer tooling.">
      <EmptyState
        icon="⌘"
        title="Developer Center is coming soon"
        description="Caches from Xcode, npm, and other toolchains will be listed here once the scanning engine lands."
      />
    </Page>
  );
}
