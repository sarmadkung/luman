import Database from '@tauri-apps/plugin-sql';
import type { Database as DatabasePort, QueryResult } from '@luman/core';

const DB_URL = 'sqlite:luman.db';

/**
 * Opens the SQLite database. `tauri-plugin-sql` runs the registered migrations
 * (see src-tauri/src/lib.rs) on first load, so by the time this resolves the
 * five foundation tables exist. Returns an implementation of the core
 * `Database` port so the application layer stays binding-agnostic.
 */
export async function openDatabase(): Promise<DatabasePort> {
  const db = await Database.load(DB_URL);

  return {
    async execute(sql: string, params: readonly unknown[] = []): Promise<QueryResult> {
      const res = await db.execute(sql, params as unknown[]);
      return { rowsAffected: res.rowsAffected, lastInsertId: res.lastInsertId };
    },
    async select<T = Record<string, unknown>>(
      sql: string,
      params: readonly unknown[] = [],
    ): Promise<T[]> {
      return db.select<T[]>(sql, params as unknown[]);
    },
    async close(): Promise<void> {
      await db.close();
    },
  };
}

/** True when running inside the Tauri runtime (vs. the plain web dev shell). */
export function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}
