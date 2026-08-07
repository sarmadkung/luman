import type { Scan } from '@luman/domain';
import { AppError } from '../errors';
import type { ScanOptions } from './types';

/** Read-only storage analysis. Starting a scan never mutates the filesystem. */
export interface ScannerService {
  /** Begin a scan. Returns the created (running) scan record. */
  startScan(options?: ScanOptions): Promise<Scan>;
  /** Cooperatively cancel a running scan. */
  cancelScan(scanId: string): Promise<void>;
  /** The most recent completed scan, or null if none exist. */
  getLatestScan(): Promise<Scan | null>;
}

/**
 * Sprint 1 stub. Actions are explicitly not implemented; read-only lookups
 * return the "empty" answer so the shell can render its empty states.
 */
export class StubScannerService implements ScannerService {
  startScan(): Promise<Scan> {
    throw AppError.notImplemented('Smart Scan');
  }
  cancelScan(): Promise<void> {
    throw AppError.notImplemented('Cancel scan');
  }
  async getLatestScan(): Promise<Scan | null> {
    return null;
  }
}
