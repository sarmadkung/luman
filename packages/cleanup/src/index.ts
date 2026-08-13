/**
 * @luman/cleanup — infrastructure that executes confirmed cleanup actions.
 *
 * Cleanup is always explicit and user-confirmed. Sprint 01 provides only the
 * seam; the real, reversible cleanup engine arrives in Sprint 07.
 */
import type { CleanupService } from '@luman/core';
import { StubCleanupService } from '@luman/core';

export function createCleanupService(): CleanupService {
  return new StubCleanupService();
}
