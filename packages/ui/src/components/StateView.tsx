import type { ReactNode } from 'react';
import { LoadingState } from './LoadingState';
import { EmptyState } from './EmptyState';
import { ErrorState } from './ErrorState';

/**
 * Every screen must define Loading, Empty, Error and Success states, plus a
 * Permission-Required state where access is involved (Design Spec + Sprint 2
 * Epic 7). `StateView` makes satisfying that contract consistent.
 */
export type ViewStatus = 'loading' | 'empty' | 'permission' | 'error' | 'success';

export interface StateViewProps {
  readonly status: ViewStatus;
  readonly loadingLabel?: string;
  readonly emptyTitle?: string;
  readonly emptyDescription?: string;
  readonly emptyAction?: ReactNode;
  readonly permission?: { title?: string; description?: string; action?: ReactNode };
  readonly error?: { title?: string; description?: string; onRetry?: () => void };
  readonly children?: ReactNode;
}

export function StateView({
  status,
  loadingLabel,
  emptyTitle = 'Nothing here yet',
  emptyDescription,
  emptyAction,
  permission,
  error,
  children,
}: StateViewProps) {
  if (status === 'loading') {
    return <LoadingState label={loadingLabel} />;
  }
  if (status === 'empty') {
    return <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} />;
  }
  if (status === 'permission') {
    return (
      <EmptyState
        icon="🔒"
        title={permission?.title ?? 'Permission required'}
        description={
          permission?.description ??
          'Luman needs permission to access this location. You can grant access to continue.'
        }
        action={permission?.action}
      />
    );
  }
  if (status === 'error') {
    return (
      <ErrorState title={error?.title} description={error?.description} onRetry={error?.onRetry} />
    );
  }
  return <>{children}</>;
}
