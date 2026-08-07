import { useEffect, useMemo, type ReactNode } from 'react';
import { AppError } from '@luman/core';
import { ServicesContext } from './ServicesContext';
import { bootstrap } from './bootstrap';
import { createAppServices } from './create-services';
import { logger } from '../error/logger';
import { useApplicationStore } from '../stores';

/**
 * Constructs the service graph once and runs bootstrap on mount, recording
 * readiness / fatal init errors into the application store.
 */
export function ServicesProvider({ children }: { children: ReactNode }) {
  const services = useMemo(() => createAppServices(logger), []);
  const setReady = useApplicationStore((s) => s.setReady);
  const setInitError = useApplicationStore((s) => s.setInitError);

  useEffect(() => {
    let cancelled = false;
    bootstrap(services)
      .then(() => {
        if (!cancelled) setReady(true);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        const appError = AppError.from(error);
        logger.error('Bootstrap failed', { code: appError.code, message: appError.message });
        setInitError(appError.userMessage);
      });
    return () => {
      cancelled = true;
    };
  }, [services, setReady, setInitError]);

  return <ServicesContext.Provider value={services}>{children}</ServicesContext.Provider>;
}
