import type { StorageOverview } from '@luman/core';
import { useServices } from '../../services';
import { useAsync } from './use-async';

/**
 * Shared accessor for the storage overview. The hero, the Storage Used card and
 * the Health card all read the same figures; funnelling them through one hook
 * keeps their loading and error handling identical.
 */
export function useStorageOverview() {
  const { storage } = useServices();
  return useAsync<StorageOverview | null>(() => storage.getOverview(), []);
}
