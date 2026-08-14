import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { createRequire } from 'node:module';
import initSqlJs, { type Database as SqlJsDatabase } from 'sql.js';
import type { CleanupAction, Finding, Scan } from '@luman/domain';
import type { Database } from '@luman/core';
import {
  FINDING_CHUNK_SIZE,
  SqliteCleanupHistoryRepository,
  SqliteFindingRepository,
  SqliteScanRepository,
  SqliteSettingsRepository,
} from '@luman/core';

/**
 * Integration test: the real `0001` DDL against a real SQLite engine
 * (sql.js/WASM), exercising every repository.
 *
 * In-memory only — no database file is ever written, and nothing outside the
 * repository is touched (AGENTS.md §6.8).
 */
const here = dirname(fileURLToPath(import.meta.url));
const migrationPath = resolve(here, '../../src-tauri/migrations/0001_initial_schema.sql');
const require = createRequire(import.meta.url);

/** Adapt sql.js to the `Database` port the repositories consume. */
function adapt(db: SqlJsDatabase): Database {
  return {
    async execute(sql, params = []) {
      db.run(sql, params as never[]);
      return { rowsAffected: db.getRowsModified() };
    },
    async select<T>(sql: string, params: readonly unknown[] = []): Promise<T[]> {
      const statement = db.prepare(sql);
      statement.bind(params as never[]);
      const rows: T[] = [];
      while (statement.step()) rows.push(statement.getAsObject() as T);
      statement.free();
      return rows;
    },
    async close() {
      db.close();
    },
  };
}

const scan = (overrides: Partial<Scan> = {}): Scan => ({
  id: 's1',
  startedAt: '2026-01-01T00:00:00.000Z',
  completedAt: null,
  status: 'running',
  plugins: [],
  ...overrides,
});

const finding = (overrides: Partial<Finding> = {}): Finding => ({
  id: 'f1',
  scanId: 's1',
  category: 'cache',
  path: '/tmp/cache.bin',
  size: 2048,
  safeToDelete: true,
  safety: 'safe',
  plugin: 'p1',
  ...overrides,
});

const action = (overrides: Partial<CleanupAction> = {}): CleanupAction => ({
  id: 'c1',
  findings: ['f1'],
  status: 'completed',
  reclaimedBytes: 4096,
  completedAt: '2026-01-02T00:00:00.000Z',
  ...overrides,
});

let raw: SqlJsDatabase;
let db: Database;

beforeEach(async () => {
  const SQL = await initSqlJs({ locateFile: () => require.resolve('sql.js/dist/sql-wasm.wasm') });
  raw = new SQL.Database();
  raw.run(readFileSync(migrationPath, 'utf8'));
  // sql.js does not carry PRAGMA foreign_keys across connections; re-issue it
  // rather than assuming the DDL's pragma took effect here.
  raw.run('PRAGMA foreign_keys = ON');
  db = adapt(raw);
});

describe('SqliteScanRepository', () => {
  it('saves and reads back a scan', async () => {
    const repository = new SqliteScanRepository(db);
    await repository.save(scan());

    const found = await repository.getById('s1');
    expect(found).toEqual(scan());
  });

  it('returns null for a scan that does not exist', async () => {
    expect(await new SqliteScanRepository(db).getById('missing')).toBeNull();
  });

  it('returns null from getLatest on an empty table', async () => {
    expect(await new SqliteScanRepository(db).getLatest()).toBeNull();
  });

  it('returns an empty list from list() on an empty table', async () => {
    expect(await new SqliteScanRepository(db).list()).toEqual([]);
  });

  it('orders list() and getLatest() by most recent', async () => {
    const repository = new SqliteScanRepository(db);
    await repository.save(scan({ id: 'old', startedAt: '2026-01-01T00:00:00.000Z' }));
    await repository.save(scan({ id: 'new', startedAt: '2026-02-01T00:00:00.000Z' }));

    expect((await repository.getLatest())?.id).toBe('new');
    expect((await repository.list()).map((s) => s.id)).toEqual(['new', 'old']);
  });

  it('upserts rather than failing on a repeated save', async () => {
    // A scan is saved repeatedly as it progresses.
    const repository = new SqliteScanRepository(db);
    await repository.save(scan({ status: 'running' }));
    await repository.save(scan({ status: 'completed', completedAt: '2026-01-01T01:00:00.000Z' }));

    const found = await repository.getById('s1');
    expect(found?.status).toBe('completed');
    expect((await repository.list()).length).toBe(1);
  });
});

describe('SqliteFindingRepository', () => {
  beforeEach(async () => {
    await new SqliteScanRepository(db).save(scan());
  });

  it('saves and reads back findings for a scan', async () => {
    const repository = new SqliteFindingRepository(db);
    await repository.saveAll([finding()]);

    expect(await repository.listByScan('s1')).toEqual([finding()]);
  });

  it('round-trips safeToDelete as a real boolean', async () => {
    const repository = new SqliteFindingRepository(db);
    await repository.saveAll([
      finding({ id: 'yes', safeToDelete: true, safety: 'safe' }),
      finding({ id: 'no', safeToDelete: false, safety: 'unsafe' }),
    ]);

    const found = await repository.listByScan('s1');
    expect(found.find((f) => f.id === 'yes')?.safeToDelete).toBe(true);
    expect(found.find((f) => f.id === 'no')?.safeToDelete).toBe(false);
  });

  it('accepts an empty list without issuing a statement', async () => {
    await expect(new SqliteFindingRepository(db).saveAll([])).resolves.toBeUndefined();
    expect(await new SqliteFindingRepository(db).listByScan('s1')).toEqual([]);
  });

  it('returns null for a finding that does not exist', async () => {
    expect(await new SqliteFindingRepository(db).getById('missing')).toBeNull();
  });

  it('inserts more rows than one chunk holds', async () => {
    // Proves the chunking loop actually spans chunks, and stays under the
    // 999-parameter limit while doing it.
    const repository = new SqliteFindingRepository(db);
    const many = Array.from({ length: FINDING_CHUNK_SIZE * 2 + 7 }, (_, i) =>
      finding({ id: `f${i}`, size: i }),
    );

    await repository.saveAll(many);
    expect(await repository.listByScan('s1')).toHaveLength(many.length);
  });

  it('stores a path as a parameter, not as interpolated SQL', async () => {
    // A path containing a quote would break an interpolated statement.
    const repository = new SqliteFindingRepository(db);
    const nasty = `/tmp/it's "quoted"; DROP TABLE findings;--`;
    await repository.saveAll([finding({ path: nasty })]);

    const found = await repository.listByScan('s1');
    expect(found[0]?.path).toBe(nasty);
  });
});

describe('foreign keys', () => {
  it('cascades findings when their scan is removed', async () => {
    await new SqliteScanRepository(db).save(scan());
    await new SqliteFindingRepository(db).saveAll([finding()]);
    expect(await new SqliteFindingRepository(db).listByScan('s1')).toHaveLength(1);

    // Deleting a *row from Luman's own table* — not a file on disk.
    raw.run('DELETE FROM scans WHERE id = ?', ['s1']);

    expect(await new SqliteFindingRepository(db).listByScan('s1')).toEqual([]);
  });

  it('rejects a finding whose scan does not exist', async () => {
    await expect(
      new SqliteFindingRepository(db).saveAll([finding({ scanId: 'nope' })]),
    ).rejects.toMatchObject({ code: 'DATABASE_QUERY_FAILED' });
  });
});

describe('SqliteCleanupHistoryRepository', () => {
  it('records and lists an action', async () => {
    const repository = new SqliteCleanupHistoryRepository(db);
    await repository.record(action());

    expect(await repository.list()).toEqual([action()]);
  });

  it('round-trips finding ids as an array, including empty', async () => {
    const repository = new SqliteCleanupHistoryRepository(db);
    await repository.record(action({ id: 'empty', findings: [] }));
    await repository.record(action({ id: 'full', findings: ['f1', 'f2'] }));

    const listed = await repository.list();
    expect(listed.find((a) => a.id === 'empty')?.findings).toEqual([]);
    expect(listed.find((a) => a.id === 'full')?.findings).toEqual(['f1', 'f2']);
  });

  it('totals reclaimed bytes, and reports 0 for an empty table', async () => {
    const repository = new SqliteCleanupHistoryRepository(db);
    expect(await repository.totalReclaimedBytes()).toBe(0);

    await repository.record(action({ id: 'a', reclaimedBytes: 100 }));
    await repository.record(action({ id: 'b', reclaimedBytes: 250 }));
    expect(await repository.totalReclaimedBytes()).toBe(350);
  });

  it('returns an empty list on an empty table', async () => {
    expect(await new SqliteCleanupHistoryRepository(db).list()).toEqual([]);
  });

  it('exposes no delete or update method', () => {
    // Read + append only this sprint; Sprint 07 owns execution.
    const repository = new SqliteCleanupHistoryRepository(db);
    const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(repository));
    expect(methods.sort()).toEqual(['constructor', 'list', 'record', 'totalReclaimedBytes']);
  });
});

describe('SqliteSettingsRepository', () => {
  it('sets and gets a value', async () => {
    const repository = new SqliteSettingsRepository(db);
    await repository.set('theme', 'dark');
    expect(await repository.get('theme')).toBe('dark');
  });

  it('returns null for a key that was never set', async () => {
    expect(await new SqliteSettingsRepository(db).get('missing')).toBeNull();
  });

  it('overwrites on a repeated set rather than failing', async () => {
    const repository = new SqliteSettingsRepository(db);
    await repository.set('theme', 'dark');
    await repository.set('theme', 'light');
    expect(await repository.get('theme')).toBe('light');
  });

  it('returns every setting from all()', async () => {
    const repository = new SqliteSettingsRepository(db);
    await repository.set('a', '1');
    await repository.set('b', '2');
    expect(await repository.all()).toEqual({ a: '1', b: '2' });
  });

  it('returns an empty object on an empty table', async () => {
    expect(await new SqliteSettingsRepository(db).all()).toEqual({});
  });
});

describe('driver failures', () => {
  it('wraps a driver error as DATABASE_QUERY_FAILED without leaking SQL', async () => {
    raw.run('DROP TABLE settings');
    await expect(new SqliteSettingsRepository(db).get('theme')).rejects.toMatchObject({
      code: 'DATABASE_QUERY_FAILED',
      userMessage: 'Luman could not read or save its data.',
    });
  });
});
