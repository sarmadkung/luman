import type { Scan, ScanProgress } from '@luman/domain';
import { AppError } from '../errors';
import type { Unsubscribe } from './event-bus';
import type { ScanOptions } from './types';

/** What to scan. Roots are advisory — the safety boundary still filters them. */
export interface ScanRequest extends ScanOptions {
  /**
   * Absolute paths to enumerate. Empty means "the default set for this
   * platform". Listing a path here does **not** grant access to it: INF-012's
   * safety gate rejects protected locations regardless of what is requested.
   */
  readonly roots?: readonly string[];
}

/**
 * A running scan.
 *
 * `run()` returns this rather than a bare `Promise<Scan>` because progress and
 * cancellation (INF-008) need something to attach to while the scan is still in
 * flight — a promise alone gives a caller no handle until it has already
 * settled.
 *
 * The handle carries no filesystem capability. `cancel` is the only thing it
 * can make happen, and cancelling is always safe.
 */
export interface ScanRunHandle {
  readonly scanId: string;
  /** The scan record as created, before any work completed. */
  readonly scan: Scan;
  /** Resolves when the scan settles — completed, cancelled, or failed. */
  settled(): Promise<Scan>;
  /** Cooperative cancellation. Safe to call after the scan has settled. */
  cancel(): Promise<void>;
}

/**
 * Orchestrates read-only scans.
 *
 * Structurally incapable of modifying the filesystem: nothing here returns a
 * writable handle, and there is no delete, move, or trash method. Per AGENTS.md
 * §6.3 that absence is the enforcement — not a comment, not a runtime check.
 */
export interface ScanEngine {
  /** Start a scan. Throws if the engine cannot start one at all. */
  run(request?: ScanRequest): Promise<ScanRunHandle>;
  /** Cancel by id, for callers that did not keep the handle. */
  cancel(scanId: string): Promise<void>;
  /**
   * Observe progress. Returns an unsubscribe function. Subscribing to an
   * unknown or finished scan is not an error — the listener is simply never
   * called.
   */
  subscribeProgress(scanId: string, listener: (progress: ScanProgress) => void): Unsubscribe;
}

/**
 * Sprint 04 stub. `run` is an action and throws; `cancel` is safe to call
 * against a scan that does not exist, so it resolves; `subscribeProgress` is a
 * read-only observation and hands back a working unsubscribe. Real
 * orchestration lands in INF-007.
 */
export class StubScanEngine implements ScanEngine {
  run(): Promise<ScanRunHandle> {
    throw AppError.notImplemented('Scan engine');
  }
  async cancel(): Promise<void> {
    // Cancelling a scan that was never started is a no-op, not a failure.
  }
  subscribeProgress(): Unsubscribe {
    return () => {
      // Nothing was ever registered.
    };
  }
}
