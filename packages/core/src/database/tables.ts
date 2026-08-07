/**
 * The five tables Sprint 1 initializes. These names are the single reference the
 * rest of the app and the schema-validation test share. The canonical DDL lives
 * in `apps/desktop/src-tauri/migrations/0001_initial_schema.sql`.
 */
export const TABLES = {
  settings: 'settings',
  scans: 'scans',
  findings: 'findings',
  cleanupHistory: 'cleanup_history',
  plugins: 'plugins',
} as const;

export type TableName = (typeof TABLES)[keyof typeof TABLES];

/** Every table expected to exist after initialization. */
export const EXPECTED_TABLES: readonly TableName[] = Object.values(TABLES);
