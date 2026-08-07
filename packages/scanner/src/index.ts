/**
 * @luman/scanner — infrastructure that performs read-only storage analysis.
 *
 * Sprint 1 provides only the seam: `createScannerService` returns the current
 * (stub) implementation from the application layer. Sprint 2 replaces the body
 * with a real, plugin-driven scanner without changing this signature or any UI.
 */
import type { ScannerService } from '@luman/core';
import { StubScannerService } from '@luman/core';

export function createScannerService(): ScannerService {
  return new StubScannerService();
}
