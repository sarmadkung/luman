import { Button, EmptyState } from '@luman/ui';
import { Page } from '../components/common';

/** Placeholder for the Smart Scan feature (implemented in a later sprint). */
export function SmartScanPage() {
  return (
    <Page title="Smart Scan" description="Analyze your storage safely and read-only.">
      <EmptyState
        icon="◎"
        title="Smart Scan is coming soon"
        description="The scanning engine is not part of the Sprint 1 foundation. The screen, routing, and safety guarantees are in place, ready for the scan implementation."
        action={
          <Button variant="primary" disabled>
            Start scan
          </Button>
        }
      />
    </Page>
  );
}
