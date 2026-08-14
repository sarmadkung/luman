import type { CleanupAction, Finding, Scan } from '@luman/domain';
import { AppError } from '../errors';

/**
 * Persistence contracts for Luman's own SQLite database (INF-010).
 *
 * These deliberately *do* have save methods — they write rows, never files.
 * Nothing here can touch the user's filesystem, and no repository exposes a way
 * to remove a user's data from disk. `delete` methods are scoped to Luman's own
 * records and exist so the app can forget history the user asked it to forget.
 */

/** Scan records. */
export interface ScanRepository {
  save(scan: Scan): Promise<void>;
  getById(scanId: string): Promise<Scan | null>;
  /** Most recent first. `limit` is advisory; implementations may cap it. */
  list(limit?: number): Promise<readonly Scan[]>;
  getLatest(): Promise<Scan | null>;
}

/** Findings produced by a scan. */
export interface FindingRepository {
  /** Bulk insert. Chunked by the implementation — SQLite caps parameters. */
  saveAll(findings: readonly Finding[]): Promise<void>;
  listByScan(scanId: string): Promise<readonly Finding[]>;
  getById(findingId: string): Promise<Finding | null>;
}

/** Completed cleanup actions, for the history screen. */
export interface CleanupHistoryRepository {
  record(action: CleanupAction): Promise<void>;
  list(limit?: number): Promise<readonly CleanupAction[]>;
  /** Total bytes reclaimed across every recorded cleanup. */
  totalReclaimedBytes(): Promise<number>;
}

/**
 * User settings. String-keyed so new settings do not require a migration; the
 * typed view over these lives in the UI layer.
 */
export interface SettingsRepository {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  all(): Promise<Readonly<Record<string, string>>>;
}

/**
 * Sprint 04 stubs. Reads return the empty answer so the shell renders empty
 * states; writes throw, because silently discarding data the caller believes
 * was persisted is worse than a clear failure. Real implementations land in
 * INF-010.
 */
export class StubScanRepository implements ScanRepository {
  save(): Promise<void> {
    throw AppError.notImplemented('Scan persistence');
  }
  async getById(): Promise<Scan | null> {
    return null;
  }
  async list(): Promise<readonly Scan[]> {
    return [];
  }
  async getLatest(): Promise<Scan | null> {
    return null;
  }
}

export class StubFindingRepository implements FindingRepository {
  saveAll(): Promise<void> {
    throw AppError.notImplemented('Finding persistence');
  }
  async listByScan(): Promise<readonly Finding[]> {
    return [];
  }
  async getById(): Promise<Finding | null> {
    return null;
  }
}

export class StubCleanupHistoryRepository implements CleanupHistoryRepository {
  record(): Promise<void> {
    throw AppError.notImplemented('Cleanup history');
  }
  async list(): Promise<readonly CleanupAction[]> {
    return [];
  }
  async totalReclaimedBytes(): Promise<number> {
    return 0;
  }
}

export class StubSettingsRepository implements SettingsRepository {
  async get(): Promise<string | null> {
    return null;
  }
  set(): Promise<void> {
    throw AppError.notImplemented('Settings persistence');
  }
  async all(): Promise<Readonly<Record<string, string>>> {
    return {};
  }
}
