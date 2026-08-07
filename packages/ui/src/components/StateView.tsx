import type { ReactNode } from 'react';
import { Spinner } from './Spinner';
import { EmptyState } from './EmptyState';

/**
 * Every screen must define Loading, Empty, Error and Success states
 * (Design Spec). `StateView` makes that contract easy to satisfy consistently.
 */
export type ViewStatus = 'loading' | 'empty' | 'error' | 'success';

export interface StateViewProps {
  readonly status: ViewStatus;
  readonly loadingLabel?: string;
  readonly emptyTitle?: string;
  readonly emptyDescription?: string;
  readonly emptyAction?: ReactNode;
  readonly error?: { title: string; description?: string; action?: ReactNode };
  readonly children?: ReactNode;
}

export function StateView({
  status,
  loadingLabel,
  emptyTitle = 'Nothing here yet',
  emptyDescription,
  emptyAction,
  error,
  children,
}: StateViewProps) {
  if (status === 'loading') {
    return (
      <div className="lm-stateview lm-stateview--loading">
        <Spinner label={loadingLabel} />
      </div>
    );
  }
  if (status === 'empty') {
    return <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} />;
  }
  if (status === 'error') {
    return (
      <EmptyState
        title={error?.title ?? 'Something went wrong'}
        description={error?.description}
        action={error?.action}
      />
    );
  }
  return <>{children}</>;
}
