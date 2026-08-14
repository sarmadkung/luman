# Architecture

## Layers (strict, one direction of dependency)

```
UI (apps/desktop, packages/ui)
  renders only — no business rules, no fs
        |
Application (packages/core: services, plugin manager, logging, errors)
  orchestrates use-cases; owns service contracts + wiring
        |
Domain (packages/domain)
  pure models + vocabulary; no behavior
        |
Infrastructure (packages/scanner, packages/cleanup, db adapter)
  touches the filesystem / SQLite; implements application contracts
```

Rules:

- The UI depends on **interfaces** from `@luman/core`, never on concrete
  infrastructure. Pages call `useServices()` and get contracts.
- Business rules live in the application/domain layers, never in components.
- Infrastructure is swapped without touching the UI (Sprint 2 replaces the stub
  services with real scanner/cleanup implementations behind the same contracts).

## Event flow (target)

```
ScanRequested -> ScanCompleted -> ResultsAvailable -> CleanupRequested -> CleanupCompleted
```

Sprint 1 wires the seams only; no events fire yet.

## The filesystem port (INF-004)

`packages/core/src/fs/`. The sprint's central safety guarantee: **a scanner
cannot delete because deletion is not expressible.**

`FileSystem` has exactly four methods — `stat`, `readDirectory`, `exists`,
`realPath` — pinned by the exported `FILE_SYSTEM_METHODS` allow-list and
asserted in `file-system-port.test.ts`. Widening the port fails a test rather
than passing review. `InMemoryFileSystem` is the only implementation; the real
adapter is INF-005's flag-gated Tauri command.

`PathGuard` is the single gate every path passes through. A path is admitted
only if it is absolute, its *lexical* normalisation is inside an allowed root
and unprotected, and its *symlink-resolved real* path is too. Both checks are
required: the lexical one rejects cheaply before any I/O, the real one is what
actually counts — a link inside `~/projects` pointing at `~/Documents` looks
innocent until resolved. Refusals are always `Err(AppError)` with
`PATH_NOT_ALLOWED`, never a throw, so a caller cannot mistake an exception for
permission. Protected beats allowed, and an empty `allowedRoots` admits nothing.

Traversal is iterative with a visited-set and a depth bound, so symlink cycles
and deep trees terminate instead of hanging or exhausting the stack.

## Service contracts (INF-003)

All declared in `packages/core/src/services/` and wired into `Services` by
`createServices()`. Every one is a stub in Sprint 04 — the graph type-checks end
to end before any real behavior exists.

| Contract                   | Shape                                              | Real impl |
| -------------------------- | -------------------------------------------------- | --------- |
| `VolumeService`            | `listVolumes`, `getBootVolume` → `Result`          | INF-005   |
| `PermissionService`        | `check`, `describe` — never prompts                | INF-006   |
| `ScanEngine`               | `run` → `ScanRunHandle`, `cancel`, `subscribeProgress` | INF-007 |
| `EventBus`                 | typed `publish` / `subscribe`                      | INF-009   |
| `ScanRepository`           | `save`, `getById`, `list`, `getLatest`             | INF-010   |
| `FindingRepository`        | `saveAll`, `listByScan`, `getById`                 | INF-010   |
| `CleanupHistoryRepository` | `record`, `list`, `totalReclaimedBytes`            | INF-010   |
| `SettingsRepository`       | `get`, `set`, `all`                                | INF-010   |
| `SafetyGate`               | `evaluate` → `SafetyVerdict`                       | INF-012   |

Rules these encode:

- **Scanner-side contracts expose no mutation method.** Enforced by type
  assertions plus a runtime sweep in `services/no-mutation.test.ts`, not by
  convention. Repositories are excluded: they write rows, never files.
- **`ScanEngine.run` returns a handle, not a bare promise.** INF-008 needs
  something to attach progress and cancellation to while a scan is in flight.
- **`SafetyGate`'s stub denies everything.** A permissive stub would be a hole
  the moment the gate is wired ahead of INF-012; default-closed means an
  unfinished gate breaks a feature rather than permitting a deletion.
- **`PermissionService` has no `request()`.** Triggering a real OS prompt is
  Sprint 05 and needs developer verification, so the method does not exist
  where it could be called by accident.
- **Stub split:** read-only lookups return the empty answer (`null`, `[]`) so
  the shell renders empty states; actions and persistence writes throw
  `AppError.notImplemented`.

## Packages

| Package             | Responsibility                                        |
| ------------------- | ----------------------------------------------------- |
| `@luman/shared`     | Cross-cutting types + pure utils (Result, ids, bytes) |
| `@luman/domain`     | Domain models (Scan, Finding, CleanupAction, …)       |
| `@luman/core`       | Service contracts + stubs, logging, errors, db, plugins |
| `@luman/scanner`    | Read-only scanning infrastructure (stub in Sprint 1)  |
| `@luman/cleanup`    | Confirmed cleanup infrastructure (stub in Sprint 1)   |
| `@luman/ui`         | Presentational primitives + design tokens             |
| `@luman/plugin-sdk` | Public plugin contracts                               |
