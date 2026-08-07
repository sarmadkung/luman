import { createContext, useContext } from 'react';
import type { Services } from '@luman/core';

export const ServicesContext = createContext<Services | null>(null);

/** Access the application service graph. Throws if used outside the provider. */
export function useServices(): Services {
  const ctx = useContext(ServicesContext);
  if (!ctx) throw new Error('useServices must be used within <ServicesProvider>.');
  return ctx;
}
