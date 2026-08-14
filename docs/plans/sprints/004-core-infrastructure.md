# Sprint 04 — Core Infrastructure

```yaml
sprint: 04
name: Core Infrastructure
phase: 2 — Core Platform
status: IN_PROGRESS
tasks: 15
```

Roadmap: `docs/plans/ROADMAP.md` · Board: `docs/plans/TASKS.md` ·
Operating rules: `AGENTS.md` (read it before starting any task)

## Objective

Build the safe, reusable infrastructure required by Luman's real features:
filesystem access, volume reporting, permissions, scan orchestration,
cancellation, events, persistence, logging, and the safety execution boundary.

Sprint 05 (Smart Scan) is the first sprint that reads the user's real disk in
anger. This sprint builds the machinery it will use, and proves that machinery
against fakes.

## One task at a time

Take exactly one task per cycle, in dependency order. Mark it `IN_PROGRESS`
before writing code. Do not start a second task while one is `IN_PROGRESS`, and
do not batch two tasks into one commit. `AGENTS.md` §3 and §8 govern selection.

## Sprint invariants

Every task obeys all of these. A task that appears to require breaking one is a
task to stop and ask about (`AGENTS.md` §16.7).

1. **Read-only by design.** No code written in this sprint may delete, move,
   rename, trash, compress, or modify any file outside the repository.
2. **No delete capability is reachable.** The filesystem port has no write or
   delete methods. Not unimplemented — *absent*.
3. **No automatic cleanup, ever.** No timer, startup hook, background sweep, or
   retry may reach an execution path.
4. **Real-machine access is opt-in and manual.** Any code touching the real
   filesystem, real volume statistics, or real permission state lands behind an
   explicitly-off flag and is verified by the developer, never by the agent.
5. **The existing UI does not change.** No visual, route, or component change.
   Mocks remain the default service graph until Sprint 06.
6. **Dry Run is the default** in every execution-shaped API, and Execute is never
   reachable without typed confirmation.

## Task order

| ID      | Task                        | Priority | depends_on                | Manual test |
| ------- | --------------------------- | -------- | ------------------------- | ----------- |
| INF-001 | Project structure audit     | P0       | —                         | no          |
| INF-002 | Core domain types           | P0       | INF-001                   | no          |
| INF-003 | Service interfaces          | P0       | INF-002                   | no          |
| INF-004 | Filesystem abstraction      | P0       | INF-003                   | no          |
| INF-005 | Storage/volume service      | P0       | INF-004                   | **yes**     |
| INF-006 | Permission service          | P0       | INF-003                   | **yes**     |
| INF-007 | Scan engine foundation      | P0       | INF-004, INF-009          | no          |
| INF-008 | Progress & cancellation     | P0       | INF-007                   | no          |
| INF-009 | Event system                | P0       | INF-002                   | no          |
| INF-010 | Persistence layer           | P0       | INF-002                   | no          |
| INF-011 | Logging                     | P1       | INF-003                   | **if sink** |
| INF-012 | Safety boundary             | P0       | INF-002, INF-004          | no          |
| INF-013 | Mock implementations        | P0       | INF-004, INF-005, INF-006 | no          |
| INF-014 | UI integration              | P0       | INF-010, INF-013          | **yes**     |
| INF-015 | Verification                | P0       | INF-001 … INF-014         | **yes**     |

INF-009 and INF-010 do not depend on INF-004 and may be taken earlier if INF-004
blocks. Otherwise work in ID order.

---

## INF-001 — Project structure audit

```yaml
id: INF-001
status: DONE
priority: P0
depends_on: []
```

### Objective

Establish a trustworthy baseline: the package graph matches the documented
architecture, the dependency direction holds, and no comment or link in the
repository points at a sprint number or path that no longer exists.

### Requirements

- Audit the package graph against `docs/ARCHITECTURE.md`. Confirm every package
  documented there exists and every package that exists is documented:
  `shared`, `domain`, `core`, `scanner`, `cleanup`, `ui`, `plugin-sdk`.
- Verify the dependency direction. Confirm no file in `apps/desktop/src` or
  `packages/ui/src` imports `packages/scanner`, `packages/cleanup`, or a Node
  `fs` module, and that `packages/domain` imports nothing from `packages/core`.
- Fix stale sprint numbering and broken paths in comments and docs.
- Do **not** move, rename, or create packages. Do not change behavior.
- Report suspected layer violations rather than fixing them, if the fix would
  change behavior.

### Implementation notes

Known stale references, all predating `docs/plans/ROADMAP.md`:

| File                                            | Problem                                                        | Correct                        |
| ----------------------------------------------- | -------------------------------------------------------------- | ------------------------------ |
| `packages/domain/src/index.ts`                  | points at `docs-ai/ARCHITECTURE.md`                             | `docs/ARCHITECTURE.md`         |
| `packages/core/src/services/registry.ts`        | "Sprint 2 supplies mock implementations; Sprint 3 swaps in real adapters" | mocks = Sprint 03; real = 05/06 |
| `packages/scanner/src/index.ts`                 | "Sprint 2 replaces the body"                                    | Sprint 05                      |
| `packages/cleanup/src/index.ts`                 | "the real, reversible cleanup engine arrives in Sprint 2"        | Sprint 07                      |
| `apps/desktop/src/services/create-services.ts`  | "Sprint 2 service graph", "out of scope until Sprint 3"          | renumber against the roadmap   |
| `docs/AI_GUIDE.md`                              | links use `../docs/…` as if the file were in `docs-ai/`          | `./` relative to `docs/`       |

"Sprint 1 stub" wording in `scanner-service.ts`, `cleanup-service.ts`,
`history-service.ts`, and `database/database.ts` is accurate as history — leave
it, but correct the *next-sprint* reference beside it.

Useful greps: `rg -n 'Sprint [0-9]' packages apps`, `rg -n 'docs-ai' .`,
`rg -n "from 'node:fs'|require\('fs'\)" packages apps`.

### Acceptance criteria

- No source comment references a sprint number contradicting
  `docs/plans/ROADMAP.md`.
- No source comment or doc references a path that does not exist.
- A written findings list covering: package graph conformance, layer violations
  found, and anything deferred to the backlog.
- `git diff` contains only comments, docs, and link fixes — zero behavior change.

### Safe verification

```bash
pnpm lint
pnpm format:check
pnpm typecheck
```

Plus read-only greps. **Do not** run the test suites for this task (nothing
behavioral changed) and **do not** run any `tauri:*` command.

### Definition of done

- [ ] Acceptance criteria all met
- [ ] Tier 1 green
- [ ] Findings list written into the task report
- [ ] `git diff --stat` shows no `.ts`/`.tsx` logic lines changed, comments only
- [ ] Status updated in this file **and** `docs/plans/TASKS.md`, same commit
- [ ] Committed on `docs/INF-001-project-structure-audit`, not pushed

---

## INF-002 — Core domain types

```yaml
id: INF-002
status: DONE
priority: P0
depends_on: [INF-001]
```

### Objective

Give the infrastructure layer the vocabulary it needs — volumes, permissions,
progress, filesystem entries, execution modes, path classification — as pure
data in `@luman/domain`.

### Requirements

- Add to `packages/domain/src/models/`:
  - `VolumeInfo` — id, name, `totalBytes`, `freeBytes`, `usedBytes`, boot-volume
    flag.
  - `PermissionScope` (`'full-disk' | 'home' | 'volume'`) and `PermissionStatus`
    (`'granted' | 'denied' | 'not-determined' | 'unknown'`).
  - `ScanPhase` (`'queued' | 'enumerating' | 'analyzing' | 'finalizing'`) and
    `ScanProgress` — phase, `itemsSeen`, `bytesSeen`, optional current path, and
    `fraction` that is `null` when total work is unknown.
  - `FsEntryKind` (`'file' | 'directory' | 'symlink' | 'other'`) and `FsEntry` —
    path, kind, `sizeBytes`, `modifiedAt`, plus a flag for entries the process
    cannot read.
  - `ExecutionMode` (`'dry-run' | 'preview' | 'execute'`).
  - `PathClassification` (`'safe' | 'caution' | 'protected'`) and the
    protected-path list from `docs/05_BUSINESS_RULES.md` §Protected paths as
    **data**, not logic. That table is the canonical list — eleven patterns.
    Transcribe it; do not invent entries or drop any.
- Reuse `Id` from `@luman/shared`. Add branded aliases via `Brand` where ids
  could be confused: `ScanId`, `FindingId`, `VolumeId`.
- Extend existing unions (`ScanStatus`, `FindingCategory`, `SafetyLevel`) only if
  a real gap exists — state which and why.
- `packages/domain` stays dependency-free apart from `@luman/shared`.

### Implementation notes

- Follow the house style already in `packages/domain/src/models/scan.ts`:
  `readonly` fields, string-literal unions, ISO-8601 strings for timestamps.
- `health.ts` is the precedent for a pure function living in domain, and for the
  comment explaining why domain does not import from core. Mirror that reasoning
  if you add a helper.
- Protected paths are macOS-shaped and enumerated in `docs/05_BUSINESS_RULES.md`
  §Protected paths. Store them as relative patterns, not absolute paths —
  absolute paths would embed a username.
- `PathClassification` and the existing `SafetyLevel` in `models/finding.ts` are
  deliberately **distinct** despite sharing `'safe'` and `'caution'`.
  `SafetyLevel` classifies a *finding*; `PathClassification` classifies a
  *location*. Put a doc comment saying exactly that at both definition sites —
  they are easy to conflate, and `findings.safety` is a real database column
  that INF-010 maps.
- `fraction` exists because a scan cannot know its total up front. Model unknown
  as `null`, never as `0`, or the UI will render a stalled progress bar.
- Do not touch `computeHealthScore` or any existing model.

### Acceptance criteria

- Every new type is exported from `packages/domain/src/index.ts`.
- `pnpm typecheck` passes with no new `any` and no non-null assertions.
- Unit tests cover every pure function added — path classification lookup and
  progress `fraction` clamping — including unknown-total and zero-total cases.
- No new type contains a method that performs I/O.
- Existing models and their tests are untouched.

### Safe verification

```bash
pnpm typecheck
pnpm lint
pnpm test:unit    # Tier 2 — ask once per session first
```

### Definition of done

- [ ] Acceptance criteria all met
- [ ] Tier 1 green; unit tests written (and run if Tier 2 authorized)
- [ ] No absolute path or username appears in any protected-path constant
- [ ] `docs/06_DATA_MODELS.md` updated if a model shape was added
- [ ] Status updated here **and** in `docs/plans/TASKS.md`, same commit
- [ ] Committed on `feat/INF-002-core-domain-types`, not pushed

---

## INF-003 — Service interfaces

```yaml
id: INF-003
status: DONE
priority: P0
depends_on: [INF-002]
```

### Objective

Declare every contract this sprint will implement, each with a stub, so the
service graph is complete and type-checked before any real behavior exists.

### Requirements

- Declare in `packages/core/src/services/`, each with a stub matching the
  existing `StubScannerService` pattern:
  - `VolumeService` — `listVolumes()`, `getBootVolume()`.
  - `PermissionService` — `check(scope)`, `describe(scope)`.
  - `ScanEngine` — `run(request)`, `cancel(scanId)`,
    `subscribeProgress(scanId, listener)`.
  - `EventBus` — see INF-009.
  - `ScanRepository`, `FindingRepository`, `CleanupHistoryRepository`,
    `SettingsRepository` — see INF-010.
  - `SafetyGate` — see INF-012.
- Predictable failures return `Result<T, E>`; unexpected failures throw
  `AppError`. Never both in one method.
- Add `ErrorCode` values to `packages/core/src/errors/app-error.ts`:
  `SCAN_CANCELLED`, `PATH_NOT_ALLOWED`, `UNSAFE_OPERATION_BLOCKED`,
  `VOLUME_UNAVAILABLE`, `PERMISSION_REQUIRED`. Reuse the existing
  `PERMISSION_DENIED` rather than adding a synonym.
- Extend the `Services` interface in `packages/core/src/services/registry.ts`
  with the new services, wired to stubs. `createServices()` keeps working with
  no arguments.
- **No interface may expose a write, delete, move, or rename operation.** If a
  contract seems to need one, stop and ask.
- Do **not** declare a `PermissionService.request()` that triggers a real OS
  prompt. If declared at all, it throws `NOT_IMPLEMENTED` and is documented as
  Sprint 05.

### Implementation notes

- `registry.ts` is the single wiring point. Add fields to `Services`, construct
  stubs in `createServices()`, keep `CreateServicesOptions` backward-compatible —
  `apps/desktop/src/services/create-services.ts` spreads the result and overrides
  three fields, so anything you add must survive that spread.
- Read-only lookups return the *empty* answer (`null`, `[]`) so the shell can
  render empty states. Actions throw `AppError.notImplemented('…')`. That split
  is already established in `StubScannerService` — do not invent a third pattern.
- `ScanEngine.run` should return a handle carrying the `Scan` and a way to await
  settlement, not a bare `Promise<Scan>` — INF-008 needs something to attach
  progress and cancellation to. Keep the shape minimal and document it.
- The `Result` vs `throw` rule in practice: "no volumes found" is a `Result`
  error; "the native bridge is missing" throws.

### Acceptance criteria

- `createServices()` returns a complete `Services` object; `createAppServices`,
  `bootstrap`, and `useServices` compile unchanged.
- Every new contract has a stub and a doc comment stating its read-only or
  confirmation-required nature.
- Unit tests assert each action stub throws `NOT_IMPLEMENTED` and each lookup
  stub returns the documented empty value.
- A type-level test asserts no scanner-side contract exposes a mutation method.
- The existing UI still renders; no page consumes a new service yet.

### Safe verification

```bash
pnpm typecheck
pnpm lint
pnpm test:unit    # Tier 2
```

### Definition of done

- [ ] Acceptance criteria all met
- [ ] Tier 1 green; stub tests written
- [ ] `docs/ARCHITECTURE.md` updated with the new contracts
- [ ] No mutation method on any contract — verified by the type-level test
- [ ] Status updated here **and** in `docs/plans/TASKS.md`, same commit
- [ ] Committed on `feat/INF-003-service-interfaces`, not pushed

---

## INF-004 — Filesystem abstraction

```yaml
id: INF-004
status: DONE
priority: P0
depends_on: [INF-003]
```

### Objective

Create the read-only filesystem port and its in-memory implementation. This is
the sprint's central safety guarantee: a scanner cannot delete because deletion
is not expressible.

### Requirements

- Define `FileSystem` in `packages/core`:
  - `stat(path): Promise<Result<FsEntry, AppError>>`
  - `readDirectory(path): Promise<Result<readonly FsEntry[], AppError>>`
  - `exists(path): Promise<boolean>`
  - `realPath(path): Promise<Result<string, AppError>>`
- **No `write`, `delete`, `unlink`, `move`, `rename`, `trash`, `mkdir`, or
  `copy` method.** Absent, not unimplemented.
- Implement `InMemoryFileSystem` backed by a plain object tree, supporting nested
  directories, unreadable entries, symlinks, cycles, and deep nesting.
- Implement path normalization and a `PathGuard` that resolves a path and rejects
  anything escaping an allowed root or matching the protected-path data from
  INF-002. Rejection returns `PATH_NOT_ALLOWED` — it never throws past the
  boundary.
- **Do not implement a real filesystem adapter.** That surface is INF-005's
  flag-gated Tauri command.
- Traversal helpers are iterative or depth-bounded — no unbounded recursion on a
  hostile tree.

### Implementation notes

- `PathGuard` does not exist yet anywhere in the repo; this task creates it.
  Everything downstream (INF-007, INF-012) depends on its exact semantics, so
  document them at the definition site.
- Resolve before comparing. `/Users/x/Documents/../Downloads` must classify as
  Downloads, not as Documents. Normalize, resolve `..`, then match.
- Symlink cycles are the classic hang. Track visited real paths in a `Set` and
  bound depth; a cycle must terminate, not throw.
- To make the no-mutation guarantee testable, export an explicit
  `FILE_SYSTEM_METHODS` allow-list and assert `Object.keys` of a conforming
  implementation matches it. A future widening then fails a test rather than
  passing review.
- The in-memory tree is used by INF-007, INF-008, INF-012, and INF-013 — design
  the fixture builder for reuse and put it somewhere importable, not inside a
  single test file.

### Acceptance criteria

- The port's type definition contains no mutation method; a test asserts the
  exported interface's keys match the allow-list.
- `InMemoryFileSystem` passes tests for: missing path, unreadable directory,
  terminating symlink loop, empty directory, deeply nested tree, and a path
  containing `..`.
- `PathGuard` rejects `../` escapes, absolute paths outside the root, and every
  protected path from `docs/05_BUSINESS_RULES.md` — one test per case.
- Zero real filesystem access in any test: no `node:fs` import, no
  `os.homedir()`, no path derived from the developer's machine.

### Safe verification

```bash
pnpm typecheck
pnpm lint
pnpm test:unit    # Tier 2 — against InMemoryFileSystem only
```

**Never** run a test that reads a real directory.

### Definition of done

- [ ] Acceptance criteria all met
- [ ] Tier 1 green; unit tests cover every listed case
- [ ] `rg 'node:fs|os.homedir' packages` returns nothing in this task's diff
- [ ] `PathGuard` semantics documented at the definition site
- [ ] `docs/ARCHITECTURE.md` updated with the port
- [ ] Status updated here **and** in `docs/plans/TASKS.md`, same commit
- [ ] Committed on `feat/INF-004-filesystem-abstraction`, not pushed

---

## INF-005 — Storage/volume service

```yaml
id: INF-005
status: NEEDS_MANUAL_TEST
priority: P0
depends_on: [INF-004]
```

### Objective

Report real volume capacity and free space, behind a flag that is off by
default, mapped onto the `StorageOverview` shape the dashboard already consumes.

### Requirements

- Implement `VolumeService` returning `VolumeInfo` for mounted volumes and the
  boot volume.
- Add a Tauri command in `apps/desktop/src-tauri/src/` reading volume capacity
  and free space. **Read-only. No traversal. No file enumeration.** Capacity
  statistics only.
- Gate the real path behind `LUMAN_REAL_VOLUMES`, default off. Flag off →
  `VolumeService` resolves from the mock (INF-013).
- **Read the flag in Rust**, via `std::env::var`, once at command entry. Do not
  read it from TypeScript: `apps/desktop/vite.config.ts` sets no `envPrefix`, so
  Vite exposes only `VITE_`-prefixed vars on `import.meta.env`, and `process.env`
  does not exist in the renderer bundle. A bare `LUMAN_REAL_VOLUMES` read from TS
  is always `undefined`, which would make the flag impossible to switch on and
  the manual test below impossible to pass. With the flag off the command returns
  an error and the TypeScript side falls back to the mock.
- Map real figures onto the existing `StorageOverview` in
  `packages/core/src/services/types.ts`. Do not invent a parallel type.
  `reclaimableBytes` stays `0` until Sprint 05 supplies scan data.
- Handle unavailable volumes as `VOLUME_UNAVAILABLE` with a user-safe message.
  Never surface a raw OS error to the UI.
- Register any new capability in `apps/desktop/src-tauri/capabilities/`, granting
  the narrowest permission that works.
- Do **not** wire this into the dashboard. That is Sprint 06.

### Implementation notes

- `StorageOverview` already has `totalBytes`, `usedBytes`, `freeBytes`,
  `reclaimableBytes`, `volume`. Fill the first three from the OS, leave the
  fourth `0`, and set `volume` to the boot volume identifier.
- Keep the raw→`StorageOverview` conversion a **pure function** in TypeScript so
  it is unit-testable without the native bridge. The Tauri command returns raw
  numbers; the mapping lives in `@luman/core`.
- Rust side: `std::fs` metadata does not give volume capacity. **The developer
  has approved adding the `sysinfo` crate for this** (2026-08-12), so
  `AGENTS.md` §16.11 is already satisfied for `sysinfo` and only `sysinfo` — any
  further crate still needs asking. Use `sysinfo::Disks` for total and available
  space; it handles APFS containers more sanely than a raw `statfs`.
- `isTauri()` already exists in `apps/desktop/src/database` — reuse that pattern
  for environment detection rather than sniffing `window` again.
- Guard against `freeBytes > totalBytes` (seen with APFS containers and
  purgeable space). Treat it as unknown rather than computing negative used
  space.

### Acceptance criteria

- With the flag off, `VolumeService` returns mock data and no native call is
  made — asserted by a test that fails if the command is invoked.
- The raw→`StorageOverview` mapping is pure and unit-tested, including
  `totalBytes === 0` and `freeBytes > totalBytes`.
- `cargo check` and `cargo clippy` pass with no new warnings.
- The Rust command contains no path traversal, no `remove_*`, no `rename`, no
  `write`.

### Safe verification

```bash
pnpm typecheck
pnpm lint
pnpm test:unit                                  # Tier 2 — flag-off path + mapping
cd apps/desktop/src-tauri && cargo check && cargo clippy
```

**Never** run `pnpm tauri:dev`, `pnpm tauri:build`, or enable the flag.

### Manual verification (Tier 3 — developer only)

1. `export LUMAN_REAL_VOLUMES=1`
2. `pnpm tauri:dev`
3. Compare the reported capacity and free space against Disk Utility.

Expected: figures match within rounding. If they do not, paste both numbers back.

### Definition of done

- [ ] Acceptance criteria all met
- [ ] Tier 1 green; Rust checks clean
- [ ] Flag defaults off, verified by test
- [ ] Handoff written per `AGENTS.md` §5
- [ ] Status set to `NEEDS_MANUAL_TEST` — **not** `DONE`
- [ ] Status updated here **and** in `docs/plans/TASKS.md`, same commit
- [ ] Committed on `feat/INF-005-storage-volume-service`, not pushed

---

## INF-006 — Permission service

```yaml
id: INF-006
status: NEEDS_MANUAL_TEST
priority: P0
depends_on: [INF-003]
```

### Objective

Report whether Luman can read what it needs, and explain how to grant access —
without ever triggering a macOS permission prompt in this sprint.

### Requirements

- Implement `check(scope)` returning `PermissionStatus`, and `describe(scope)`
  returning user-facing copy explaining the permission and how to grant it.
- The real check probes whether one representative protected location is
  readable. Constraints: **one** probe, read-only, no enumeration of contents,
  no recursion, result cached for the process lifetime.
- Gate the real probe behind `LUMAN_REAL_PERMISSIONS`, default off. Flag off →
  mock status from INF-013. **Read the flag in Rust** via `std::env::var`, for
  the reason given in INF-005 — a bare env var is not visible to renderer
  TypeScript, so a TS-side read makes the flag permanently off.
- **Do not trigger the Full Disk Access prompt.** A prompt is a real-machine
  side effect and a UX decision belonging to Sprint 05.
- Denied and not-determined are normal outcomes: return the status, do not throw.
  Reserve `PERMISSION_DENIED` for a genuinely failed operation.
- Never log an absolute path from a protected location.

### Implementation notes

- The dashboard already defines a **Permission Required** state
  (`docs/features/01_dashboard.md`) and `StateView` renders it. This task only
  supplies the status; wiring is Sprint 06.
- Probing is a read attempt that you expect to fail. Catch the error, map it to
  a status, and do not let an `EPERM` escape as an exception.
- Cache in a module-level or instance field, not a global mutable singleton —
  tests need a fresh instance per case.
- `describe()` copy: follow `docs/design-system/15_CONTENT_GUIDELINES.md`. State
  what Luman needs and the exact System Settings path. Never blame the user.
- All four `PermissionStatus` values must be reachable in tests, which means the
  mock needs a way to be constructed in each state.

### Acceptance criteria

- Flag off: no real probe occurs; a test fails if the probe function is called.
- All four `PermissionStatus` values are reachable via the mock.
- `describe()` copy matches the content guidelines in tone.
- No code path can trigger an OS permission dialog — demonstrated by grep and by
  a test asserting `request()` throws `NOT_IMPLEMENTED`.

### Safe verification

```bash
pnpm typecheck
pnpm lint
pnpm test:unit    # Tier 2 — against the mock only
```

**Never** enable the flag, and never run a real probe.

### Manual verification (Tier 3 — developer only)

1. `export LUMAN_REAL_PERMISSIONS=1`
2. `pnpm tauri:dev` with Full Disk Access **granted** → expect `granted`
3. Revoke Full Disk Access, relaunch → expect `denied`

Expected: reported status matches System Settings in both directions, and no
prompt appears.

### Definition of done

- [ ] Acceptance criteria all met
- [ ] Tier 1 green; all four statuses covered by tests
- [ ] Flag defaults off, verified by test
- [ ] No prompt-triggering code path exists
- [ ] Handoff written per `AGENTS.md` §5
- [ ] Status set to `NEEDS_MANUAL_TEST` — **not** `DONE`
- [ ] Status updated here **and** in `docs/plans/TASKS.md`, same commit
- [ ] Committed on `feat/INF-006-permission-service`, not pushed

---

## INF-007 — Scan engine foundation

```yaml
id: INF-007
status: DONE
priority: P0
depends_on: [INF-004, INF-009]
```

### Objective

Orchestrate scanner plugins over the filesystem port, producing a `Scan` and its
findings, resilient to a plugin that throws or hangs.

### Requirements

- Implement `ScanEngine` in `packages/scanner`, driving registered
  `ScannerPlugin`s from `@luman/plugin-sdk` over the `FileSystem` port.
- Construct the `ScanContext` the SDK already defines: `{ scan, logger, signal }`.
  Do not add fields.
- Lifecycle: `pending` → `running` → `completed` | `failed` | `cancelled`,
  populating `startedAt`, `completedAt`, and `plugins` per the existing `Scan`
  model.
- Bounded concurrency. One plugin throwing must not fail the scan: record a
  per-plugin failure, continue, mark the scan `completed` with partial results.
  Every plugin failing is `failed`.
- Per-plugin timeout — a hung plugin must not hang the scan.
- Deduplicate findings by resolved path, keeping the highest declared safety
  severity.
- Every path a plugin reports passes `PathGuard` before becoming a `Finding`. A
  rejected path is dropped and logged, not surfaced.
- Findings are returned, not written to disk. Persistence is the orchestrator's
  call, not the engine's.
- `createScannerService()` keeps its signature: real engine with real
  dependencies, stub otherwise.

### Implementation notes

- `ScanContext` deliberately has no filesystem field. Inject the `FileSystem`
  port into the *engine*, and let plugins receive whatever read-only accessor the
  SDK defines — do not widen `ScanContext` to carry the port, or a future plugin
  gains a broader capability than the SDK documents. If plugins genuinely need
  file access, stop and ask; that is an SDK change.
- Dedup by `realPath`, not the reported path, or symlinked duplicates slip
  through. Severity order is `unsafe` > `caution` > `safe` — keep the *most*
  cautious, never the most permissive.
- Timeout via `Promise.race` against a timer, but make sure the timer is cleared
  on the happy path or tests leak handles.
- "All plugins failed" and "no plugins registered" are different: the former is
  `failed`, the latter is `completed` with zero findings.
- Emit events through the INF-009 bus rather than callbacks, which is why this
  task depends on it.

### Acceptance criteria

- A scan over `InMemoryFileSystem` with three fake plugins produces a
  `completed` scan with deduplicated, guard-checked findings.
- A throwing plugin yields `completed` plus a recorded failure; all plugins
  throwing yields `failed`.
- A plugin that never resolves is timed out and does not hang the test.
- No test touches the real filesystem.
- A test asserts `ScanContext` exposes exactly `scan`, `logger`, `signal`.

### Safe verification

```bash
pnpm typecheck
pnpm lint
pnpm test:unit    # Tier 2 — fake plugins + InMemoryFileSystem
```

### Definition of done

- [ ] Acceptance criteria all met
- [ ] Tier 1 green; fake-plugin tests cover throw, hang, and empty cases
- [ ] No test leaks a timer or reads a real directory
- [ ] `ScanContext` unchanged
- [ ] `docs/ARCHITECTURE.md` event-flow section updated if behavior differs
- [ ] Status updated here **and** in `docs/plans/TASKS.md`, same commit
- [ ] Committed on `feat/INF-007-scan-engine-foundation`, not pushed

---

## INF-008 — Progress & cancellation

```yaml
id: INF-008
status: TODO
priority: P0
depends_on: [INF-007]
```

### Objective

Make a scan observable and interruptible, so the UI never freezes and a user can
always stop what they started.

### Requirements

- Emit `ScanProgress` during a scan: phase transitions, `itemsSeen`,
  `bytesSeen`, and `fraction` where a total is known, `null` where it is not.
- Throttle emission (time- or count-based) so a large scan cannot flood the bus
  or the UI. State the chosen interval.
- Cooperative cancellation through the `AbortSignal` on `ScanContext`.
  `cancel(scanId)` aborts the signal; the scan settles as `cancelled` with
  `completedAt` set.
- Cancellation is prompt and idempotent: double-cancel, unknown id, and
  post-completion cancel are safe no-ops.
- Partial findings from a cancelled scan are discarded, not persisted.
- A plugin ignoring its signal is abandoned at the timeout boundary and cannot
  resurrect the scan or emit further progress.
- No busy-waiting, no polling loop, no `setInterval` surviving a settled scan.
  Every listener is removed on settle.

### Implementation notes

- `docs/features/01_dashboard.md` states the dashboard must "never freeze during
  scanning" — that requirement is what this task satisfies, so keep emission
  cheap. Throttling to ~100ms or every N items is reasonable; document which.
- `fraction` stays `null` until a total is actually known. Do not fabricate a
  denominator from items-seen-so-far; a bar that jumps backwards is worse than
  an indeterminate one.
- Discarding partial findings matters: a cancelled scan that persisted rows would
  later look like a completed scan to `getLatestScan()`.
- Use a fake timer in tests (`vi.useFakeTimers()`) so throttle behavior is
  deterministic and the suite stays fast.
- Assert cleanup by exposing an internal listener/timer count for tests, or by
  checking the bus's listener count returns to zero.

### Acceptance criteria

- `itemsSeen` and `bytesSeen` are non-decreasing; `fraction` is `null` or within
  `[0, 1]`, never above 1.
- Cancelling mid-scan yields `cancelled`, emits no further progress, and
  persists nothing.
- Double-cancel, unknown-id cancel, and post-completion cancel are no-ops with no
  unhandled rejection.
- A signal-ignoring plugin does not prevent the scan from settling.
- A test asserts no timer or listener survives a settled scan.

### Safe verification

```bash
pnpm typecheck
pnpm lint
pnpm test:unit    # Tier 2 — fake timers, fake plugins
```

### Definition of done

- [ ] Acceptance criteria all met
- [ ] Tier 1 green; throttle interval documented in code
- [ ] Cancelled scans provably persist nothing
- [ ] No leaked timers or listeners, asserted by test
- [ ] Status updated here **and** in `docs/plans/TASKS.md`, same commit
- [ ] Committed on `feat/INF-008-progress-and-cancellation`, not pushed

---

## INF-009 — Event system

```yaml
id: INF-009
status: DONE
priority: P0
depends_on: [INF-002]
```

### Objective

Provide the typed event bus that carries the documented flow, with cleanup
events declared but deliberately unpublishable in this sprint.

### Requirements

- Implement `EventBus` in `packages/core` with `publish`, `subscribe` (returning
  an unsubscribe function), and `once`.
- Define the event union to match `docs/02_ARCHITECTURE_SPEC.md` exactly:
  `ScanRequested` → `ScanCompleted` → `ResultsAvailable` → `CleanupRequested` →
  `CleanupCompleted`, plus `ScanProgressed`, `ScanCancelled`, `ScanFailed`.
- Events are immutable, serializable data. No functions, class instances, or
  live object references in a payload.
- `CleanupRequested` and `CleanupCompleted` are **declared but never published**
  in this sprint. Add a test asserting zero publish sites.
- A throwing subscriber must not break publication for others or for the
  publisher. Log and continue.
- Deterministic delivery in tests; no unbounded queue. Document the ordering
  guarantee.
- Publishing must never trigger a filesystem operation. The bus knows nothing
  about services.

### Implementation notes

- Discriminate on a literal `type` field so `subscribe('ScanCompleted', …)`
  narrows the payload with no cast. A `Record<EventName, Payload>` map plus a
  generic `subscribe<K extends EventName>` is the simplest shape that achieves
  this.
- Serializable payloads matter for two future reasons: crossing the Tauri IPC
  boundary, and persisting an event log. Enforce it by construction, not by
  comment.
- Snapshot the listener list before iterating, so a subscriber that unsubscribes
  during publication neither skips a sibling nor gets double-delivered.
- The zero-publish-sites test can be a grep-style assertion over source files, or
  a runtime spy asserting the publish method is never called with those types
  during the full suite. State which you chose.

### Acceptance criteria

- Subscribe / publish / unsubscribe round-trips with full type inference; the
  payload type is narrowed by event name with no casts.
- A throwing subscriber is isolated; other subscribers still receive the event.
- Unsubscribing during publication neither skips nor double-delivers.
- Tests assert `CleanupRequested` and `CleanupCompleted` have zero publish sites.
- Unsubscribed listeners are released — internal listener count returns to zero.

### Safe verification

```bash
pnpm typecheck
pnpm lint
pnpm test:unit    # Tier 2
```

### Definition of done

- [ ] Acceptance criteria all met
- [ ] Tier 1 green; ordering guarantee documented
- [ ] Cleanup events unpublishable, asserted by test
- [ ] No listener leak, asserted by test
- [ ] `docs/ARCHITECTURE.md` event-flow section reflects the implemented union
- [ ] Status updated here **and** in `docs/plans/TASKS.md`, same commit
- [ ] Committed on `feat/INF-009-event-system`, not pushed

---

## INF-010 — Persistence layer

```yaml
id: INF-010
status: DONE
priority: P0
depends_on: [INF-002]
```

### Objective

Read and write Luman's own SQLite tables through repositories, mapping cleanly
between the schema's column shapes and the domain models.

### Requirements

- Implement over the existing `Database` port in `packages/core/src/database/`:
  `ScanRepository`, `FindingRepository`, `CleanupHistoryRepository`,
  `SettingsRepository`.
- Map between migration `0001`'s columns (`snake_case`, `safe_to_delete` as
  `INTEGER`, `finding_ids` as a JSON string) and the domain models (`camelCase`,
  real booleans, real arrays). Mapping functions are pure and separately tested.
- Use the `TABLES` constants from `packages/core/src/database/tables.ts`. Never
  inline a table name.
- Parameterized statements only. Interpolating a value into SQL is a defect,
  including for paths.
- Bulk finding inserts run in one transaction, chunked to stay under SQLite's
  parameter limit. State the chunk size.
- `CleanupHistoryRepository` is **read + append only** this sprint. No delete, no
  update-to-executed. Sprint 07 owns execution.
- If a schema change is genuinely required, add migration `0002` — never edit
  `0001`. Ask before adding a migration.
- Wrap driver failures as `DATABASE_QUERY_FAILED` with context, never the raw
  error.

### Implementation notes

- `0001_initial_schema.sql` is embedded via `include_str!` in
  `apps/desktop/src-tauri/src/lib.rs` and asserted by
  `apps/desktop/src/database/schema.integration.test.ts`. Editing it breaks both.
- That existing test is the pattern to follow: it runs the real DDL against
  `sql.js` in a node environment. Name new files `*.integration.test.ts` so the
  `integration` vitest project picks them up.
- Column mismatches to handle explicitly: `findings.safe_to_delete` is `0`/`1`,
  and the domain has both `safeToDelete: boolean` and `safety: SafetyLevel` which
  must stay consistent. `cleanup_history.finding_ids` is a JSON string defaulting
  to `'[]'` — round-trip the empty array, not just populated ones.
- `PRAGMA foreign_keys = ON` is in the DDL, but sql.js may need it re-issued per
  connection. Assert cascade behavior explicitly rather than assuming.
- SQLite's default parameter limit is 999. With eight columns per finding, chunk
  at ~100 rows and state it.

### Acceptance criteria

- Integration tests run the real `0001` DDL against `sql.js` and exercise every
  repository: insert, read back, round-trip equality, empty-result, not-found.
- `findings.scan_id` cascade behavior is verified with foreign keys enabled.
- Round-trips prove `safe_to_delete` survives as a boolean and `finding_ids` as
  an array, including the empty array.
- No test writes a real database file — `sql.js` in memory only.
- Grep confirms zero inlined table names and zero interpolated SQL.

### Safe verification

```bash
pnpm typecheck
pnpm lint
pnpm test:integration    # Tier 2 — sql.js, in-memory
```

### Definition of done

- [ ] Acceptance criteria all met
- [ ] Tier 1 green; integration tests cover all four repositories
- [ ] Migration `0001` untouched
- [ ] Chunk size documented in code
- [ ] `docs/06_DATA_MODELS.md` updated if a mapping decision is worth recording
- [ ] Status updated here **and** in `docs/plans/TASKS.md`, same commit
- [ ] Committed on `feat/INF-010-persistence-layer`, not pushed

---

## INF-011 — Logging

```yaml
id: INF-011
status: DONE
priority: P1
depends_on: [INF-003]
```

### Objective

Make logging useful and safe: level-filtered, redacted, bounded in memory, and
incapable of leaking a username or a protected path.

### Requirements

- Extend the existing `Logger` / `ConsoleLogger` in
  `packages/core/src/logging/` rather than replacing them. Keep `child()`
  binding behavior.
- Level filtering already exists — `ConsoleLogger` takes a `minLevel` option and
  short-circuits on `LOG_LEVEL_ORDER`. Do **not** rebuild it. The actual defect
  is the default: the doc comment promises "`debug` in dev, `info` otherwise" but
  the code is an unconditional `options.minLevel ?? 'debug'`. Make the code match
  the comment, using `import.meta.env.DEV` as `apps/desktop/src/error/logger.ts`
  already does.
- Add **redaction**: absolute paths under the user's home reduce to a stable
  non-identifying form (e.g. `~/…/<basename>`), and the macOS username never
  appears. Redaction is a pure function with its own tests.
- Add a bounded in-memory ring buffer so the error dialog and future diagnostics
  can show recent entries without a file sink. Document the size.
- A file sink or `tauri-plugin-log` wiring writes outside the repository. If
  implemented, gate it behind `LUMAN_LOG_FILE_SINK` (default off, read in Rust
  like the other flags) and leave the task `NEEDS_MANUAL_TEST`. Do not enable or
  run it.
- Record `LUMAN_REAL_VOLUMES`, `LUMAN_REAL_PERMISSIONS`, and
  `LUMAN_LOG_FILE_SINK` in `docs/CONVENTIONS.md` as the single place every
  real-machine flag is listed. INF-015 audits against that list.
- Logging must never throw. A failing sink is swallowed after one warning.
- Never log a `Finding` wholesale, a protected path, or a settings row's
  contents.

### Implementation notes

- `tauri-plugin-log` is already a dependency in `Cargo.toml` and registered in
  `lib.rs`, so the native side exists. That makes the file sink tempting —
  resist enabling it by default; it writes to the app data directory, which is
  outside the repo and therefore Tier 3.
- Redaction must handle the `~` form, the `/Users/<name>/` form, and nested
  protected subpaths. Pass non-macOS paths through unharmed rather than mangling
  them.
- The ring buffer is what `ErrorDialog` will eventually read. Keep the entry
  shape serializable and the bound small (a few hundred entries).
- "Never throws" applies to redaction too — a malformed path must not take down
  the caller.

### Acceptance criteria

- Level filtering: a `debug` call at `warn` level produces nothing; tests cover
  each threshold.
- Redaction tests cover a home-relative path, a nested protected path, a
  username-containing path, and a non-macOS path (passed through unharmed).
- The ring buffer never exceeds its bound and drops oldest-first.
- A throwing sink does not propagate, asserted by test.
- Grep confirms no `console.log` outside the logger implementation.

### Safe verification

```bash
pnpm typecheck
pnpm lint
pnpm test:unit    # Tier 2
```

**Never** enable a file sink or inspect a real log file.

### Manual verification (Tier 3 — only if a file sink was implemented)

1. `export LUMAN_LOG_FILE_SINK=1`
2. `pnpm tauri:dev`, exercise the app briefly
3. Open the log file in the app data directory

Expected: no username, no absolute protected path, entries level-filtered.

### Definition of done

- [ ] Acceptance criteria all met
- [ ] Tier 1 green; redaction tests cover all four path shapes
- [ ] Ring buffer bound documented
- [ ] File sink, if written, defaults off
- [ ] Status `NEEDS_MANUAL_TEST` if a sink was written, else `DONE`-eligible
- [ ] Status updated here **and** in `docs/plans/TASKS.md`, same commit
- [ ] Committed on `feat/INF-011-logging`, not pushed

---

## INF-012 — Safety boundary

```yaml
id: INF-012
status: DONE
priority: P0
depends_on: [INF-002, INF-004]
```

### Objective

Build the single chokepoint every future destructive operation must pass
through — and prove it refuses, since nothing in this sprint may execute.

### Requirements

- Implement `SafetyGate`. Sprint 07's cleanup engine will call it; nothing calls
  it destructively now.
- Its API takes an `ExecutionMode` and target paths, and returns a **plan**:
  per-path classification, total bytes, what would happen, and why. In
  `'dry-run'` and `'preview'` it returns the plan and nothing else.
- `'execute'` is only reachable with *all* of: explicit typed confirmation
  (mirroring `CleanupService.requestCleanup`'s `confirmed: true` and
  `CleanContext.confirmedByUser: true`), a non-empty plan, every path passing
  `PathGuard`, and an explicitly-off build flag being on.
- **The execute branch performs no filesystem operation in this sprint.** It
  returns `UNSAFE_OPERATION_BLOCKED`. The branch exists so its preconditions are
  testable; the implementation is Sprint 07's.
- Any protected path in the target set fails the whole plan — fail-closed, no
  partial execution, `PATH_NOT_ALLOWED`.
- Default everywhere is `'dry-run'`. An omitted mode gets dry-run. An
  unrecognized mode fails closed.
- Emit an audit log entry for every call including refusals: mode, path count,
  outcome. Never full protected paths.

### Implementation notes

- Model confirmation the way the codebase already does — a literal `true` type,
  not a boolean. `CleanContext.confirmedByUser: true` and
  `requestCleanup({ confirmed: true })` are the precedents; make unconfirmed
  execution unrepresentable rather than merely rejected.
- Fail-closed on the whole set is deliberate: partial execution across a mixed
  path list is exactly how a cleanup tool deletes something it shouldn't.
- To prove dry-run touches nothing, inject a spy `FileSystem` whose every method
  beyond `stat`/`readDirectory` fails the test if called.
- An invalid mode should be unreachable via TypeScript, but reachable via IPC or
  a persisted value — so handle the default branch explicitly and fail closed.
- The audit entry is the thing that will matter in Sprint 07 when something goes
  wrong. Include enough to reconstruct the decision, nothing that identifies the
  user.

### Acceptance criteria

- A test enumerates the preconditions and asserts execute is refused when each
  one individually is absent: confirmation missing, empty plan, guard rejection,
  flag off.
- Dry-run and preview provably touch nothing — the spy filesystem fails the test
  on any unexpected call.
- Every protected path from `docs/05_BUSINESS_RULES.md` is rejected, plus a mixed
  set where one bad path fails the whole plan.
- Omitting the mode yields dry-run; an invalid mode yields a refusal.
- No code path in the repository reaches a real delete — demonstrated by grep for
  `unlink`, `rm`, `remove_file`, `remove_dir`, `trash`, `rename`, with every hit
  explained.
- Refusals are logged and testable.

### Safe verification

```bash
pnpm typecheck
pnpm lint
pnpm test:unit    # Tier 2 — every test asserts a refusal or a plan
```

**No test may attempt a real deletion**, in a temp directory or anywhere else.

### Definition of done

- [ ] Acceptance criteria all met
- [ ] Tier 1 green; every precondition covered by an absence test
- [ ] Execute branch performs no filesystem operation
- [ ] Grep for delete-shaped calls documented with an explanation per hit
- [ ] `docs/SAFETY.md` updated **only** if it strengthens a rule — ask otherwise
- [ ] Status updated here **and** in `docs/plans/TASKS.md`, same commit
- [ ] Committed on `feat/INF-012-safety-boundary`, not pushed

---

## INF-013 — Mock implementations

```yaml
id: INF-013
status: TODO
priority: P0
depends_on: [INF-004, INF-005, INF-006]
```

### Objective

Provide deterministic mocks for every new service and a realistic synthetic
filesystem, so the whole sprint is verifiable without touching a real disk.

### Requirements

- Extend the existing mock pattern in `apps/desktop/src/services/mocks/`,
  keeping the `delayMs` option so Loading states stay demonstrable.
- Add `MockVolumeService`, `MockPermissionService`, `MockScanEngine`, and a
  reusable synthetic tree — one macOS-shaped fixture with caches, logs, temp
  files, a Downloads folder, an unreadable directory, and at least one large
  file.
- Every mock is deterministic: fixed sizes, fixed timestamps, fixed ordering,
  seeded pseudo-randomness if any. No `Date.now()`, no `Math.random()`.
- Each mock can produce every state the UI defines: Loading, Empty, Error,
  Success, plus Permission Required and Scanning per
  `docs/features/01_dashboard.md`.
- Fixtures contain no real path from the developer's machine and no real
  username. Paths are obviously synthetic.
- Mocks remain the **default** service graph. `createAppServices` must not
  silently switch to real implementations.

### Implementation notes

- `MockStorageService`, `MockRecommendationService`, and `MockHistoryService`
  already exist with a `{ delayMs }` constructor option — match that signature so
  the graph stays uniform.
- Reuse the `InMemoryFileSystem` fixture builder from INF-004 rather than
  defining a second tree. One fixture, imported everywhere, is what makes
  cross-task tests comparable.
- Determinism is what makes the suite trustworthy: two runs must produce
  byte-identical results, so fix every timestamp as an ISO literal.
- "Obviously synthetic" means something like `/Users/example/…` — a reader should
  never wonder whether a fixture path came from a real machine.
- Give each mock an explicit way to enter its error and permission-denied states;
  tests need to drive them, and Sprint 06 will need them for the dashboard.

### Acceptance criteria

- Every mock satisfies its contract's types with no casts.
- A test drives each UI state from each mock, asserting the state is reachable.
- Two runs of the same fixture produce byte-identical results.
- Grep confirms no real home path, username, or `os.homedir()` in any fixture.
- The default service graph resolves to mocks; a test asserts it.

### Safe verification

```bash
pnpm typecheck
pnpm lint
pnpm test:unit    # Tier 2
```

### Definition of done

- [ ] Acceptance criteria all met
- [ ] Tier 1 green; every UI state reachable from a mock
- [ ] Fixtures deterministic and obviously synthetic
- [ ] Default graph still mocks, asserted by test
- [ ] Status updated here **and** in `docs/plans/TASKS.md`, same commit
- [ ] Committed on `feat/INF-013-mock-implementations`, not pushed

---

## INF-014 — UI integration

```yaml
id: INF-014
status: TODO
priority: P0
depends_on: [INF-010, INF-013]
```

### Objective

Prove the new infrastructure slots in behind the existing contracts with **zero**
UI change — the promise `docs/SPRINT_1_FOUNDATION.md` made.

### Requirements

- Wire the new services into `createAppServices`
  (`apps/desktop/src/services/create-services.ts`) and `bootstrap`
  (`apps/desktop/src/services/bootstrap.ts`) behind the existing `Services`
  registry, with mocks as the default.
- **No component, page, route, style, or token may change.** If a UI change
  appears necessary, the contract is wrong — stop and ask.
- `bootstrap` gains no new side effects. It may construct services and
  initialize the database. It must not start a scan, probe permissions, read
  volumes, or touch the filesystem.
- Verify the layer boundary: no page imports `packages/scanner`,
  `packages/cleanup`, or the `FileSystem` port. Pages consume `useServices()`.
- Every existing test passes with **no test edited** to accommodate the change.
- The uncommitted UI work in the working tree is not part of this task. If the
  tree is dirty, stop (`AGENTS.md` §3 preflight).

### Implementation notes

- `createAppServices` currently spreads `createServices({ logger })` and
  overrides `storage`, `recommendations`, `history`. Keep that shape — add
  overrides, do not restructure the function.
- `bootstrap` today opens the database when `isTauri()` and runs plugin
  discovery. Both are fine. Anything beyond them is a new side effect and out of
  scope.
- Document every real-machine flag in **one** place — a single table in
  `README.md` or `docs/CONVENTIONS.md`. Flags scattered across files are how one
  gets left on.
- A test that needs rewriting is the signal to stop, not to rewrite. It means a
  contract changed shape.
- The e2e suite is the strongest evidence for "nothing visible changed" — this is
  the one task where running Playwright is worth asking for.

### Acceptance criteria

- `git diff --stat` shows zero changes under `packages/ui/src/components/`,
  `apps/desktop/src/components/`, `apps/desktop/src/pages/`, and
  `packages/ui/src/styles/`.
- Every pre-existing unit, integration, and e2e test passes unmodified.
- `pnpm build` succeeds and the web shell renders every route.
- A test asserts `bootstrap` performs no scan, no permission probe, no volume
  read.
- Real implementations are reachable only by flipping a flag, and all flags are
  documented in one place.

### Safe verification

```bash
pnpm typecheck
pnpm lint
pnpm format:check
pnpm build
pnpm test          # Tier 2
pnpm test:e2e      # Tier 2 — worth asking for on this task specifically
```

**Never** run `pnpm tauri:dev` or `pnpm tauri:build`.

### Manual verification (Tier 3 — developer only)

1. `pnpm tauri:dev`
2. Visit every route in the sidebar

Expected: the app looks and behaves exactly as before this sprint.

### Definition of done

- [ ] Acceptance criteria all met
- [ ] Tier 1 green; full Tier 2 suite green including e2e
- [ ] Zero diff under component, page, and style directories
- [ ] No pre-existing test modified
- [ ] All real-machine flags documented in one place
- [ ] Status `NEEDS_MANUAL_TEST` pending the native launch check
- [ ] Status updated here **and** in `docs/plans/TASKS.md`, same commit
- [ ] Committed on `feat/INF-014-ui-integration`, not pushed

---

## INF-015 — Verification

```yaml
id: INF-015
status: TODO
priority: P0
depends_on: [INF-001, INF-002, INF-003, INF-004, INF-005, INF-006, INF-007, INF-008, INF-009, INF-010, INF-011, INF-012, INF-013, INF-014]
```

### Objective

Prove the sprint's safety invariants mechanically, inventory every
filesystem-touching path, and hand the developer a complete manual checklist.

### Requirements

- Add a safety-invariant test suite asserting:
  - the `FileSystem` port exposes no mutation method;
  - `ScanContext` exposes exactly `scan`, `logger`, `signal`;
  - `CleanContext.confirmedByUser` is typed `true`, not `boolean`;
  - `CleanupService.requestCleanup` requires `confirmed: true`;
  - no scanner-side type reaches a delete capability;
  - `CleanupRequested` / `CleanupCompleted` have zero publish sites;
  - every real-machine flag defaults to off.
- Produce an inventory of every filesystem-touching code path with its guard,
  its flag, and its test.
- Run the full Tier 1 chain and, with permission, the full Tier 2 chain.
  Report exact commands and results.
- Assemble the manual verification queue into one checklist with exact commands
  and expected observations.
- Update `docs/ARCHITECTURE.md` (new ports and services), `docs/CONVENTIONS.md`
  (new conventions, e.g. flag naming), and `docs/plans/ROADMAP.md` (Sprint 04
  status) in the same commit, per `AGENTS.md` §13.
- Do **not** mark the sprint DONE. Report completion and stop.

### Implementation notes

- Prove the suite works by temporarily weakening one invariant, observing the
  failure, and reverting. Note in the report which one you broke — a safety suite
  nobody has seen fail is not yet evidence of anything.
- Type-level invariants need type-level tests: `expectTypeOf` from vitest, or a
  `// @ts-expect-error` block asserting the bad shape does not compile.
- The inventory is the artifact Sprint 05 will build on. Table form: path, entry
  point, guard, flag, test.
- Greps to drive the inventory: `fs`, `readDir`, `stat`, `remove`, `rename`,
  `trash`, `unlink`, plus `invoke(` for Tauri command call sites.
- Sprint status is the developer's call (`AGENTS.md` §7.4) — this task ends with a
  report, not a status bump on the sprint.

### Acceptance criteria

- The safety-invariant suite exists, passes, and is proven to fail when an
  invariant is weakened.
- Tier 1 fully green. Tier 2 fully green or explicitly listed as unrun.
- The filesystem-path inventory covers every grep hit.
- The manual checklist is executable without asking questions.
- Affected docs updated; every task status in this file accurate.
- Sprint status left `TODO`/`IN_PROGRESS` with a completion report, not `DONE`.

### Safe verification

```bash
pnpm lint
pnpm format:check
pnpm typecheck
pnpm build
pnpm test          # Tier 2
pnpm test:e2e      # Tier 2
```

### Manual verification (Tier 3 — developer only)

The consolidated queue below.

### Definition of done

- [ ] Acceptance criteria all met
- [ ] Safety-invariant suite proven to fail when weakened (state which invariant)
- [ ] Filesystem inventory complete
- [ ] Manual checklist handed over
- [ ] `docs/ARCHITECTURE.md`, `docs/CONVENTIONS.md`, `docs/plans/ROADMAP.md` updated
- [ ] Sprint **not** marked DONE — reported and stopped
- [ ] Status updated here **and** in `docs/plans/TASKS.md`, same commit
- [ ] Committed on `test/INF-015-verification`, not pushed

---

## Manual verification queue

The agent never executes these. It writes the code, marks the task
`NEEDS_MANUAL_TEST`, and stops.

| From    | What to verify                                                     | Command / action                                  |
| ------- | ------------------------------------------------------------------ | ------------------------------------------------- |
| INF-005 | Real volume capacity matches Disk Utility                           | `LUMAN_REAL_VOLUMES=1 pnpm tauri:dev`             |
| INF-006 | Permission status matches System Settings, granted **and** denied   | `LUMAN_REAL_PERMISSIONS=1 pnpm tauri:dev`         |
| INF-011 | Log file has no username or real protected paths                    | `LUMAN_LOG_FILE_SINK=1 pnpm tauri:dev`, inspect the file |
| INF-014 | Native app launches; every route renders unchanged                   | `pnpm tauri:dev`                                  |
| INF-015 | Full native build succeeds                                          | `pnpm tauri:build`                                |
| INF-015 | No unexpected disk activity during a flagged-on session             | Watch Activity Monitor while exercising the app   |

Nothing here deletes, moves, or modifies a file. If a step appears to, stop and
ask before running it.

---

## Not in this sprint

- Deleting, moving, renaming, or trashing anything. No cleanup execution.
- Real scanning of the user's disk at scale — Sprint 05.
- The dashboard consuming real data — Sprint 06.
- The cleanup engine and undo — Sprint 07.
- Any UI, component, route, token, or style change.
- Triggering the macOS Full Disk Access prompt.
- New dependencies without asking (`AGENTS.md` §16.11).
- Editing migration `0001`.

## Sprint definition of done

- [ ] INF-001 … INF-015 each `DONE`, or `NEEDS_MANUAL_TEST` / `REVIEW` with a handoff
- [ ] Tier 1 green across the workspace
- [ ] Tier 2 green, or explicitly listed as unrun with reasons
- [ ] Safety-invariant suite passes and is proven to fail when weakened
- [ ] Zero diff under UI component, page, and style directories
- [ ] Every real-machine flag defaults to off and is documented in one place
- [ ] No delete capability reachable from any scanner-side type
- [ ] `docs/ARCHITECTURE.md`, `docs/CONVENTIONS.md`, `docs/plans/ROADMAP.md`, `docs/plans/TASKS.md` updated
- [ ] Manual verification queue handed over
- [ ] Sprint status advanced by the developer, not the agent
