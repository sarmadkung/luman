import { useCallback, useEffect, useState } from 'react';

export type AsyncStatus = 'loading' | 'success' | 'error';

export interface AsyncState<T> {
  readonly status: AsyncStatus;
  readonly data: T | null;
  readonly error: unknown;
  readonly reload: () => void;
}

/**
 * Runs an async loader, tracking loading/success/error and supporting reload.
 * Cancels state updates after unmount. Keeps widgets free of imperative
 * plumbing so they can focus on rendering states.
 */
export function useAsync<T>(
  loader: () => Promise<T>,
  deps: readonly unknown[] = [],
): AsyncState<T> {
  const [status, setStatus] = useState<AsyncStatus>('loading');
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [nonce, setNonce] = useState(0);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    let active = true;
    setStatus('loading');
    setError(null);
    loader()
      .then((result) => {
        if (!active) return;
        setData(result);
        setStatus('success');
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(err);
        setStatus('error');
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce]);

  return { status, data, error, reload };
}
