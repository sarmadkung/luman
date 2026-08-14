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
