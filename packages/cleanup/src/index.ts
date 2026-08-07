/**
 * @luman/cleanup — infrastructure that executes confirmed cleanup actions.
 *
 * Cleanup is always explicit and user-confirmed. Sprint 1 provides only the
 * seam; the real, reversible cleanup engine arrives in Sprint 2.
 */
import type { CleanupService } from '@luman/core';
import { StubCleanupService } from '@luman/core';

export function createCleanupService(): CleanupService {
  return new StubCleanupService();
}
