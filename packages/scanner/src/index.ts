/**
 * @luman/scanner — infrastructure that performs read-only storage analysis.
 *
 * `createScannerService` keeps its original signature: the stub unless real
 * dependencies are supplied. `DefaultScanEngine` (INF-007) drives scanner
 * plugins over the read-only filesystem port; Sprint 05 supplies the plugins.
 */
import type { ScannerService } from '@luman/core';
import { StubScannerService } from '@luman/core';

export * from './scan-engine';

export function createScannerService(): ScannerService {
  return new StubScannerService();
}
