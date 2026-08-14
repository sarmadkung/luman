import { describe, expect, it } from 'vitest';
import {
  FINDING_CHUNK_SIZE,
  FINDING_COLUMN_COUNT,
  fromCleanupAction,
  fromFinding,
  fromScan,
  toCleanupAction,
  toFinding,
  toScan,
} from './row-mappers';

describe('scan mapping', () => {
  const row = {
    id: 's1',
    started_at: '2026-01-01T00:00:00.000Z',
    completed_at: null,
    status: 'running',
  };

  it('maps snake_case columns to camelCase fields', () => {
    const scan = toScan(row);
    expect(scan.startedAt).toBe('2026-01-01T00:00:00.000Z');
    expect(scan.completedAt).toBeNull();
    expect(scan.status).toBe('running');
  });

  it('reports an empty plugin list — 0001 has no column for it', () => {
    // Persisting Scan.plugins needs a schema change, which is the developer's.
    expect(toScan(row).plugins).toEqual([]);
  });

  it('produces column values in insert order', () => {
    expect(fromScan(toScan(row))).toEqual(['s1', '2026-01-01T00:00:00.000Z', null, 'running']);
  });
});

describe('finding mapping', () => {
  const row = {
    id: 'f1',
    scan_id: 's1',
    category: 'cache',
    path: '/tmp/cache.bin',
    size: 2048,
    safe_to_delete: 1,
    safety: 'safe',
    plugin: 'p1',
  };

  it('converts the 0/1 integer to a real boolean', () => {
    expect(toFinding(row).safeToDelete).toBe(true);
    expect(toFinding({ ...row, safe_to_delete: 0 }).safeToDelete).toBe(false);
  });

  it('treats any non-zero value as true', () => {
    expect(toFinding({ ...row, safe_to_delete: 2 }).safeToDelete).toBe(true);
  });

  it('writes the boolean back as 0/1', () => {
    expect(fromFinding(toFinding(row))[5]).toBe(1);
    expect(fromFinding(toFinding({ ...row, safe_to_delete: 0 }))[5]).toBe(0);
  });

  it('round-trips without losing a field', () => {
    const finding = toFinding(row);
    const columns = fromFinding(finding);
    expect(columns).toHaveLength(FINDING_COLUMN_COUNT);
    expect(columns).toEqual(['f1', 's1', 'cache', '/tmp/cache.bin', 2048, 1, 'safe', 'p1']);
  });

  it('keeps safeToDelete and safety consistent as stored', () => {
    // The schema has both; a mapper that derived one from the other would
    // silently disagree with the row.
    const finding = toFinding({ ...row, safe_to_delete: 0, safety: 'unsafe' });
    expect(finding.safeToDelete).toBe(false);
    expect(finding.safety).toBe('unsafe');
  });
});

describe('chunk size', () => {
  it('stays under SQLite’s 999-parameter limit', () => {
    expect(FINDING_CHUNK_SIZE * FINDING_COLUMN_COUNT).toBeLessThan(999);
  });
});

describe('cleanup action mapping', () => {
  const row = {
    id: 'c1',
    status: 'completed',
    reclaimed_bytes: 4096,
    finding_ids: '["f1","f2"]',
    completed_at: '2026-01-02T00:00:00.000Z',
  };

  it('parses the JSON finding_ids into an array', () => {
    expect(toCleanupAction(row).findings).toEqual(['f1', 'f2']);
  });

  it('round-trips the empty array — the column default', () => {
    const action = toCleanupAction({ ...row, finding_ids: '[]' });
    expect(action.findings).toEqual([]);
    expect(fromCleanupAction(action)[3]).toBe('[]');
  });

  it('serialises the array back to JSON', () => {
    expect(fromCleanupAction(toCleanupAction(row))[3]).toBe('["f1","f2"]');
  });

  it('yields an empty list for malformed JSON rather than throwing', () => {
    // A corrupt row must not make the history screen unopenable.
    expect(toCleanupAction({ ...row, finding_ids: 'not json' }).findings).toEqual([]);
    expect(toCleanupAction({ ...row, finding_ids: '{"not":"an array"}' }).findings).toEqual([]);
  });

  it('drops non-string entries', () => {
    expect(toCleanupAction({ ...row, finding_ids: '["f1",42,null]' }).findings).toEqual(['f1']);
  });
});
