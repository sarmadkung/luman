import type { CleanupAction, CleanupStatus, Finding, Scan, ScanStatus } from '@luman/domain';
import type { FindingCategory, SafetyLevel } from '@luman/domain';

/**
 * Pure mapping between migration `0001`'s column shapes and the domain models.
 *
 * The schema and the domain disagree in three specific ways, and each is
 * handled explicitly rather than papered over:
 *
 * 1. `snake_case` columns vs `camelCase` fields.
 * 2. `findings.safe_to_delete` is `INTEGER` 0/1; the domain has a real boolean.
 * 3. `cleanup_history.finding_ids` is a JSON string; the domain has an array.
 *
 * These functions are separately tested so a mapping bug shows up as a mapping
 * failure rather than as a mysterious repository failure.
 */

export interface ScanRow {
  readonly id: string;
  readonly started_at: string;
  readonly completed_at: string | null;
  readonly status: string;
}

export interface FindingRow {
  readonly id: string;
  readonly scan_id: string;
  readonly category: string;
  readonly path: string;
  readonly size: number;
  readonly safe_to_delete: number;
  readonly safety: string;
  readonly plugin: string;
}

export interface CleanupHistoryRow {
  readonly id: string;
  readonly status: string;
  readonly reclaimed_bytes: number;
  readonly finding_ids: string;
  readonly completed_at: string | null;
}

/**
 * `Scan.plugins` has **no column in migration 0001**.
 *
 * Rather than edit `0001` (forbidden — it is embedded in Rust via `include_str!`
 * and asserted by the schema test) or add `0002` unasked, a scan read back from
 * the database reports an empty plugin list. Persisting it needs a schema
 * change, which is the developer's call. Recorded in `docs/06_DATA_MODELS.md`.
 */
export function toScan(row: ScanRow): Scan {
  return {
    id: row.id,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    status: row.status as ScanStatus,
    plugins: [],
  };
}

/** Column values for a scan, in the order `INSERT` expects. */
export function fromScan(scan: Scan): readonly unknown[] {
  return [scan.id, scan.startedAt, scan.completedAt, scan.status];
}

export function toFinding(row: FindingRow): Finding {
  return {
    id: row.id,
    scanId: row.scan_id,
    category: row.category as FindingCategory,
    path: row.path,
    size: row.size,
    // SQLite has no boolean type; anything non-zero is true.
    safeToDelete: row.safe_to_delete !== 0,
    safety: row.safety as SafetyLevel,
    plugin: row.plugin,
  };
}

export function fromFinding(finding: Finding): readonly unknown[] {
  return [
    finding.id,
    finding.scanId,
    finding.category,
    finding.path,
    finding.size,
    finding.safeToDelete ? 1 : 0,
    finding.safety,
    finding.plugin,
  ];
}

/** Columns written per finding. Drives the chunk size — see `FINDING_CHUNK_SIZE`. */
export const FINDING_COLUMN_COUNT = 8;

/**
 * Rows per bulk insert.
 *
 * SQLite's default `SQLITE_MAX_VARIABLE_NUMBER` is 999. At 8 columns per
 * finding that allows 124 rows; 100 leaves headroom and is a round number to
 * reason about. Exceeding the limit fails the whole statement, so this is a
 * correctness bound, not a tuning knob.
 */
export const FINDING_CHUNK_SIZE = 100;

export function toCleanupAction(row: CleanupHistoryRow): CleanupAction {
  return {
    id: row.id,
    findings: parseFindingIds(row.finding_ids),
    status: row.status as CleanupStatus,
    reclaimedBytes: row.reclaimed_bytes,
    completedAt: row.completed_at,
  };
}

export function fromCleanupAction(action: CleanupAction): readonly unknown[] {
  return [
    action.id,
    action.status,
    action.reclaimedBytes,
    JSON.stringify(action.findings),
    action.completedAt,
  ];
}

/**
 * Parse the `finding_ids` JSON string.
 *
 * The column defaults to `'[]'`, so the empty array is the common case and must
 * round-trip. Malformed JSON yields an empty list rather than throwing: a
 * corrupt history row should not make the history screen unopenable.
 */
function parseFindingIds(raw: string): readonly string[] {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is string => typeof id === 'string');
  } catch {
    return [];
  }
}
