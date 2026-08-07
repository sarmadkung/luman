import { EmptyState } from '@luman/ui';
import { Page } from '../components/common';

/** Placeholder for the Large Files finder (implemented in a later sprint). */
export function LargeFilesPage() {
  return (
    <Page title="Large Files" description="Find the biggest files on your disk.">
      <EmptyState
        icon="⬒"
        title="Large Files is coming soon"
        description="Locating large files depends on the scanning engine, which arrives in a later sprint."
      />
    </Page>
  );
}
