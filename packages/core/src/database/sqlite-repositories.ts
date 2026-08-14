import type { CleanupAction, Finding, Scan } from '@luman/domain';
import { AppError } from '../errors';
import type {
  CleanupHistoryRepository,
  FindingRepository,
  ScanRepository,
  SettingsRepository,
} from '../services/repositories';
import type { Database } from './database';
import { TABLES } from './tables';
import {
  FINDING_CHUNK_SIZE,
  fromCleanupAction,
  fromFinding,
  fromScan,
  toCleanupAction,
  toFinding,
  toScan,
  type CleanupHistoryRow,
  type FindingRow,
  type ScanRow,
} from './row-mappers';

/**
 * SQLite-backed repositories.
 *
 * Every statement is **parameterized**. Interpolating a value into SQL is a
 * defect here even for a path — a path is attacker-influenced data as much as
 * anything else, and these tables store paths by design. Table names come from
 * `TABLES`, never inlined, so a rename is one edit rather than a grep.
 *
 * Driver failures are wrapped as `DATABASE_QUERY_FAILED`. A raw driver error
 * would leak SQL and paths into the UI and into logs.
 */

/** Run a database call, wrapping any driver failure with context. */
async function guard<T>(operation: string, run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    throw new AppError(`Database operation failed: ${operation}`, {
      code: 'DATABASE_QUERY_FAILED',
      userMessage: 'Luman could not read or save its data.',
      cause: error,
      context: { operation },
    });
  }
}

/** `(?, ?, ?)` groups for a bulk insert of `rowCount` rows of `columns` each. */
function placeholders(rowCount: number, columns: number): string {
  const group = `(${Array.from({ length: columns }, () => '?').join(', ')})`;
  return Array.from({ length: rowCount }, () => group).join(', ');
}

export class SqliteScanRepository implements ScanRepository {
  readonly #db: Database;

  constructor(db: Database) {
    this.#db = db;
  }

  async save(scan: Scan): Promise<void> {
    // Upsert: re-saving a scan as it progresses must not violate the PK.
    await guard('scans.save', () =>
      this.#db.execute(
        `INSERT INTO ${TABLES.scans} (id, started_at, completed_at, status)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           started_at = excluded.started_at,
           completed_at = excluded.completed_at,
           status = excluded.status`,
        fromScan(scan),
      ),
    );
  }

  async getById(scanId: string): Promise<Scan | null> {
    const rows = await guard('scans.getById', () =>
      this.#db.select<ScanRow>(`SELECT * FROM ${TABLES.scans} WHERE id = ?`, [scanId]),
    );
    return rows[0] === undefined ? null : toScan(rows[0]);
  }

  async list(limit = 50): Promise<readonly Scan[]> {
    const rows = await guard('scans.list', () =>
      this.#db.select<ScanRow>(`SELECT * FROM ${TABLES.scans} ORDER BY started_at DESC LIMIT ?`, [
        limit,
      ]),
    );
    return rows.map(toScan);
  }

  async getLatest(): Promise<Scan | null> {
    const rows = await guard('scans.getLatest', () =>
      this.#db.select<ScanRow>(`SELECT * FROM ${TABLES.scans} ORDER BY started_at DESC LIMIT 1`),
    );
    return rows[0] === undefined ? null : toScan(rows[0]);
  }
}

export class SqliteFindingRepository implements FindingRepository {
  readonly #db: Database;

  constructor(db: Database) {
    this.#db = db;
  }

  /**
   * Bulk insert in one transaction, chunked to stay under SQLite's 999
   * parameter limit — see `FINDING_CHUNK_SIZE`.
   *
   * The transaction spans every chunk, so a scan's findings land completely or
   * not at all. A partial write would leave a scan reporting results it does
   * not have.
   */
  async saveAll(findings: readonly Finding[]): Promise<void> {
    if (findings.length === 0) return;

    await guard('findings.saveAll', async () => {
      await this.#db.execute('BEGIN TRANSACTION');
      try {
        for (let i = 0; i < findings.length; i += FINDING_CHUNK_SIZE) {
          const chunk = findings.slice(i, i + FINDING_CHUNK_SIZE);
          await this.#db.execute(
            `INSERT INTO ${TABLES.findings}
               (id, scan_id, category, path, size, safe_to_delete, safety, plugin)
             VALUES ${placeholders(chunk.length, 8)}`,
            chunk.flatMap((finding) => [...fromFinding(finding)]),
          );
        }
        await this.#db.execute('COMMIT');
      } catch (error) {
        await this.#db.execute('ROLLBACK');
        throw error;
      }
      return undefined;
    });
  }

  async listByScan(scanId: string): Promise<readonly Finding[]> {
    const rows = await guard('findings.listByScan', () =>
      this.#db.select<FindingRow>(
        `SELECT * FROM ${TABLES.findings} WHERE scan_id = ? ORDER BY size DESC`,
        [scanId],
      ),
    );
    return rows.map(toFinding);
  }

  async getById(findingId: string): Promise<Finding | null> {
    const rows = await guard('findings.getById', () =>
      this.#db.select<FindingRow>(`SELECT * FROM ${TABLES.findings} WHERE id = ?`, [findingId]),
    );
    return rows[0] === undefined ? null : toFinding(rows[0]);
  }
}

/**
 * Cleanup history — **read and append only** this sprint.
 *
 * There is no delete and no update-to-executed method. Sprint 07 owns
 * execution, and a repository that could rewrite history to say a cleanup
 * happened is a capability this sprint has no reason to hold.
 */
export class SqliteCleanupHistoryRepository implements CleanupHistoryRepository {
  readonly #db: Database;

  constructor(db: Database) {
    this.#db = db;
  }

  async record(action: CleanupAction): Promise<void> {
    await guard('cleanupHistory.record', () =>
      this.#db.execute(
        `INSERT INTO ${TABLES.cleanupHistory}
           (id, status, reclaimed_bytes, finding_ids, completed_at)
         VALUES (?, ?, ?, ?, ?)`,
        fromCleanupAction(action),
      ),
    );
  }

  async list(limit = 50): Promise<readonly CleanupAction[]> {
    const rows = await guard('cleanupHistory.list', () =>
      this.#db.select<CleanupHistoryRow>(
        `SELECT * FROM ${TABLES.cleanupHistory} ORDER BY completed_at DESC LIMIT ?`,
        [limit],
      ),
    );
    return rows.map(toCleanupAction);
  }

  async totalReclaimedBytes(): Promise<number> {
    const rows = await guard('cleanupHistory.totalReclaimedBytes', () =>
      this.#db.select<{ total: number | null }>(
        `SELECT SUM(reclaimed_bytes) AS total FROM ${TABLES.cleanupHistory}`,
      ),
    );
    // SUM over zero rows is NULL, not 0.
    return rows[0]?.total ?? 0;
  }
}

export class SqliteSettingsRepository implements SettingsRepository {
  readonly #db: Database;

  constructor(db: Database) {
    this.#db = db;
  }

  async get(key: string): Promise<string | null> {
    const rows = await guard('settings.get', () =>
      this.#db.select<{ value: string }>(`SELECT value FROM ${TABLES.settings} WHERE key = ?`, [
        key,
      ]),
    );
    return rows[0]?.value ?? null;
  }

  async set(key: string, value: string): Promise<void> {
    await guard('settings.set', () =>
      this.#db.execute(
        `INSERT INTO ${TABLES.settings} (key, value, updated_at)
         VALUES (?, ?, datetime('now'))
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
        [key, value],
      ),
    );
  }

  async all(): Promise<Readonly<Record<string, string>>> {
    const rows = await guard('settings.all', () =>
      this.#db.select<{ key: string; value: string }>(`SELECT key, value FROM ${TABLES.settings}`),
    );
    return Object.fromEntries(rows.map((row) => [row.key, row.value]));
  }
}
