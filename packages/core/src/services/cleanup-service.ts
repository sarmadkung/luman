import type { CleanupAction } from '@luman/domain';
import { AppError } from '../errors';

/**
 * Executes cleanup — but only from an explicit, already-confirmed action.
 * The `confirmed: true` field is a compile-time reminder that unconfirmed
 * cleanup is not representable.
 */
export interface CleanupService {
  requestCleanup(request: {
    readonly findings: readonly string[];
    readonly confirmed: true;
  }): Promise<CleanupAction>;
  /** Past cleanup actions, newest first. */
  getHistory(): Promise<readonly CleanupAction[]>;
}

/** Sprint 1 stub. */
export class StubCleanupService implements CleanupService {
  requestCleanup(): Promise<CleanupAction> {
    throw AppError.notImplemented('Cleanup');
  }
  async getHistory(): Promise<readonly CleanupAction[]> {
    return [];
  }
}
