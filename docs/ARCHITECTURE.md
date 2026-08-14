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

## Event flow (implemented in INF-009)

```
ScanRequested -> ScanCompleted -> ResultsAvailable -> CleanupRequested -> CleanupCompleted
                      ^
       ScanProgressed / ScanCancelled / ScanFailed
```

The union is `EventMap` in `packages/core/src/services/event-bus.ts`.

- **Notifications, not commands.** No payload carries a callback or a
  capability, so handling an event cannot cause anything. An event that could
  trigger cleanup would be the auto-execute path AGENTS.md §6.5 forbids.
- **Payloads are serializable data**, enforced by the `Serializable` type rather
  than by comment — they must survive the Tauri IPC boundary and a persisted
  event log, and a live object reference would also leak a capability.
- **`CleanupRequested` and `CleanupCompleted` are declared but never published**
  in Sprint 04. A test statically scans the source tree for publish sites, which
  proves none exists anywhere — a runtime spy would only prove the paths the
  suite happened to run never published.
- **Ordering:** delivery is synchronous and in subscription order, with no
  queue. When `publish` returns, every listener registered at call time has run.
  The listener list is snapshotted, so a subscriber that unsubscribes
  mid-publication still receives the event in flight and one added
  mid-publication does not.
- **A throwing subscriber is isolated** — logged, and the remaining subscribers
  and the publisher are unaffected. A scan reporting progress must not die
  because a widget threw.

## The safety boundary (INF-012)

`DefaultSafetyGate` in `packages/core/src/services/safety-gate.ts` — the single
chokepoint every future destructive operation passes through. It **only
answers**: it holds no capability to carry out what it approves, so no code path
can execute merely by asking whether it may.

Fail-closed rules:

- An omitted mode is `dry-run`. Execute is never a default.
- An unrecognised mode is refused. TypeScript makes one unreachable, but a value
  arriving over IPC or read back from settings is not type-checked.
- **One bad path fails the whole plan.** No partial execution — a mixed path
  list is exactly how a cleanup tool deletes something it should not.
- `execute` requires all of: `confirmedByUser: true` (a literal type, so
  unconfirmed execution is *unrepresentable* rather than merely rejected), a
  non-empty plan, every path admitted by `PathGuard`, and the execution flag on.
  **With all four satisfied it still refuses** with `UNSAFE_OPERATION_BLOCKED`;
  the branch exists so its preconditions are testable, and Sprint 07 owns the
  implementation.
- Every call is audited — mode, path count, outcome, reason, and **never a
  path**, so the entry is safe to attach to a bug report.

### Delete-shaped call audit

`grep -rnE "\bunlink\b|remove_file|remove_dir|\btrash\b|\brename\b|rmdir|\.delete\("`
over first-party source returns only:

| Hit | Explanation |
| --- | ----------- |
| `file-system.ts`, `scan-engine.ts`, `volume-service.ts`, `volumes.rs`, `sqlite-repositories.ts` | Doc comments stating the method does **not** exist |
| `file-system-port.test.ts`, `no-mutation.test.ts` | The tests' own lists of forbidden verbs |
| `plugin-manager.ts`, `event-bus.ts`, `Toast.tsx` | `Map`/`Set.delete` on in-memory registries |
| `finding.ts` | `'trash'` as a `FindingCategory` — a category name, not an action |
| `mock-recommendation-service.ts` | The literal id string `'rec-trash'` |
| `repositories.integration.test.ts` | `DELETE FROM scans` — a row in an in-memory sql.js table, verifying cascade |

No first-party code reaches a real filesystem delete, because the filesystem
port cannot express one.

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
