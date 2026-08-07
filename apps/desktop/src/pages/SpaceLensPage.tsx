import { EmptyState } from '@luman/ui';
import { Page } from '../components/common';

/** Placeholder for the Space Lens visualizer. */
export function SpaceLensPage() {
  return (
    <Page title="Space Lens" description="Visualize what is using your disk.">
      <EmptyState
        icon="◔"
        title="Space Lens is coming soon"
        description="Interactive storage visualization arrives in a later sprint."
      />
    </Page>
  );
}
