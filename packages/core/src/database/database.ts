/**
 * A tiny persistence *port*. Sprint 1 only needs initialization; the concrete
 * adapter (over `tauri-plugin-sql`) is wired in the desktop app. Keeping the
 * surface this small means the application layer never depends on a specific
 * SQLite binding.
 */
export interface QueryResult {
  readonly rowsAffected: number;
  readonly lastInsertId?: number;
}

export interface Database {
  /** Run a statement that does not return rows. */
  execute(sql: string, params?: readonly unknown[]): Promise<QueryResult>;
  /** Run a query and return typed rows. */
  select<T = Record<string, unknown>>(sql: string, params?: readonly unknown[]): Promise<T[]>;
  /** Release the underlying connection. */
  close(): Promise<void>;
}

/** Factory that opens/initializes the database (runs migrations). */
export type DatabaseProvider = () => Promise<Database>;
