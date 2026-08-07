import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { createRequire } from 'node:module';
import initSqlJs from 'sql.js';
import { EXPECTED_TABLES } from '@luman/core';

/**
 * Integration test: apply the canonical migration SQL (the same file the Rust
 * side embeds) to a real SQLite engine (sql.js/WASM) and assert the five
 * foundation tables are created. This guarantees the schema is valid SQLite and
 * that it initializes the expected tables — Sprint 1 "Database initializes".
 */
const here = dirname(fileURLToPath(import.meta.url));
const migrationPath = resolve(here, '../../src-tauri/migrations/0001_initial_schema.sql');
const require = createRequire(import.meta.url);

describe('initial schema migration', () => {
  let tableNames: string[] = [];

  beforeAll(async () => {
    const SQL = await initSqlJs({
      locateFile: () => require.resolve('sql.js/dist/sql-wasm.wasm'),
    });
    const db = new SQL.Database();
    db.run(readFileSync(migrationPath, 'utf8'));
    const res = db.exec("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
    tableNames = (res[0]?.values ?? []).map((row) => String(row[0]));
    db.close();
  });

  it('creates every expected table', () => {
    for (const table of EXPECTED_TABLES) {
      expect(tableNames).toContain(table);
    }
  });

  it('creates the five foundation tables and no seed/business tables', () => {
    const appTables = tableNames.filter((n) => !n.startsWith('sqlite_'));
    expect(appTables.sort()).toEqual([...EXPECTED_TABLES].sort());
  });
});
