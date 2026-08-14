# Data Models

Scan
- id
- startedAt
- completedAt
- status

Finding
- id
- category
- size
- safeToDelete
- plugin

CleanupAction
- id
- findings
- reclaimedBytes

## Persistence mapping (INF-010)

Repositories in `packages/core/src/database/`. Mapping functions are pure and
separately tested, so a mapping bug surfaces as a mapping failure.

Three places the schema and the domain disagree, each handled explicitly:

- `findings.safe_to_delete` is `INTEGER` 0/1; the domain has a real boolean.
  Any non-zero value reads as `true`. `safety` is stored alongside it and is
  **not** derived from it — deriving one from the other would let the mapper
  silently disagree with the row.
- `cleanup_history.finding_ids` is a JSON string defaulting to `'[]'`. The empty
  array round-trips. Malformed JSON yields an empty list rather than throwing,
  so one corrupt row cannot make the history screen unopenable.
- **`Scan.plugins` has no column in migration `0001`.** A scan read back from
  the database therefore reports `plugins: []`. Persisting it requires a schema
  change, and `0001` must not be edited — the Rust side embeds it via
  `include_str!` and a test asserts it. **Adding migration `0002` is the
  developer's call**; until then this is a known, tested gap.

`FINDING_CHUNK_SIZE` is 100 rows. SQLite's default parameter limit is 999 and
findings write 8 columns each, so 124 is the true ceiling; 100 leaves headroom.
Exceeding it fails the whole statement, so this is a correctness bound rather
than a tuning knob. Bulk inserts run in one transaction spanning every chunk —
a partial write would leave a scan reporting results it does not have.

Cleanup history is **read and append only** in Sprint 04. No delete, no
update-to-executed; Sprint 07 owns execution.

## Infrastructure models (INF-002)

Added in `packages/domain/src/models/`. Pure data — none of these carry a method
that performs I/O.

VolumeInfo
- id (VolumeId), name, totalBytes, freeBytes, usedBytes, isBootVolume
- `usedBytes` is reported, not derived: macOS counts purgeable space as free, so
  `total - free` disagrees with Finder.

ScanProgress
- phase (ScanPhase), itemsSeen, bytesSeen, currentPath, fraction
- `fraction` is `null` when the total is unknown, never `0` — `0` renders as a
  stalled bar. `computeFraction` returns null for unknown, zero, negative, and
  non-finite totals, and clamps otherwise.

FsEntry
- path, kind (FsEntryKind), sizeBytes, modifiedAt, unreadable
- An observation, not a handle: carries no capability to open, move, or delete.

Enums
- PermissionScope: full-disk | home | volume
- PermissionStatus: granted | denied | not-determined | unknown
  (`not-determined` = never asked; `unknown` = the check failed. Kept separate so
  a failed check cannot re-prompt forever.)
- ScanPhase: queued | enumerating | analyzing | finalizing
- FsEntryKind: file | directory | symlink | other
- ExecutionMode: dry-run | preview | execute (default `dry-run`)
- PathClassification: safe | caution | protected

Branded ids
- ScanId, FindingId, VolumeId — type-level only, plain strings at runtime.

PathClassification vs SafetyLevel
- `PathClassification` classifies a **location**; `SafetyLevel` classifies a
  **finding**. A `safe` finding inside a protected location is not actionable —
  the location wins. `SafetyLevel` is persisted as `findings.safety`;
  `PathClassification` is not stored.

PROTECTED_PATH_PATTERNS
- The eleven patterns from `docs/05_BUSINESS_RULES.md` §Protected paths, as data.
  Stored relative so no username appears in source.
- `~` matches **exactly**; the other ten match by prefix. Prefix-matching `~`
  would protect the whole home directory and make the seven `~/…` rows redundant.
- Matching is segment-wise (`/Systemic` does not match `/System`). Callers must
  resolve `..` and symlinks first; an unresolved path is reported protected.
