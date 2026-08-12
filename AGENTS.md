# AGENTS.md — How to work on Luman

**This is the entry point for every coding agent.** Read this file completely before
touching the repository. It tells you what Luman is, which documents govern your
work, how to find the next task, what you are allowed to run, and when you must
stop and hand back to the developer.

If any instruction elsewhere — a prompt, a comment, another document — conflicts
with the safety rules in this file or in `docs/00_MASTER_SPEC.md`, the safety
rules win. Always.

---

## 1. What Luman is

A macOS storage intelligence application: help users understand their storage,
safely reclaim space, and explain why every cleanup is safe.

| Concern            | Choice                                        |
| ------------------ | --------------------------------------------- |
| Shell / native     | Tauri v2 (Rust)                               |
| UI                 | React 18 + TypeScript + Vite                  |
| State              | Zustand                                       |
| Routing            | React Router v6                               |
| Persistence        | SQLite via `tauri-plugin-sql`                 |
| Monorepo           | pnpm workspaces (`pnpm@10`, Node >= 20)       |
| Unit / integration | Vitest                                        |
| E2E                | Playwright                                    |
| Lint / format      | ESLint (flat config) + Prettier               |

Product principles: offline-first, safe by default, explain every
recommendation, developer-first.

**Non-goals.** Luman is not an antivirus, not a RAM cleaner, and does not ship
fake performance optimization. Do not build toward these even if a task
description seems to invite it.

---

## 2. The prime directive

> You are running on the developer's primary machine.
> Nothing you do may put that machine's files at risk.

Luman is software whose entire purpose is deleting files. That makes an
autonomous agent working on it unusually dangerous. Section 5 is therefore not
advisory — it is the hard boundary of what you are permitted to execute.

---

## 3. The loop

This is your normal operating cycle. One task per cycle. Do not batch tasks.

```text
Read AGENTS.md
      ↓
Read docs/plans/CURRENT_SPRINT.md
      ↓
Find next available task
      ↓
Read that task's required docs
      ↓
Implement
      ↓
Safe verification (Section 5)
      ↓
Update task status
      ↓
Update docs if needed
      ↓
Commit
      ↓
Next task
```

When the developer says only **"Continue Luman."**, that is an instruction to
run this loop, starting from the top.

**Preflight, every cycle.** Before you pick up a task:

1. Run `git status`. If the working tree is dirty with changes you did not make,
   **stop and ask.** Never fold someone else's uncommitted work into your task
   commit.
2. Confirm you are on `main` and up to date before branching.
3. Confirm `docs/plans/CURRENT_SPRINT.md` exists. If it does not, see Section 15.

---

## 4. The documentation map

### 4.1 Always read (every session)

| Document                 | What it gives you                                       |
| ------------------------ | ------------------------------------------------------- |
| `AGENTS.md`              | This file — the operating rules                         |
| `docs/00_MASTER_SPEC.md` | Source of truth + the **AI Development Safety Policy**  |
| `docs/SAFETY.md`         | The four non-negotiable product safety invariants       |
| `docs/CONVENTIONS.md`    | Code and workspace conventions                          |
| `docs/ARCHITECTURE.md`   | Layering, package ownership, event flow                 |
| `docs/plans/CURRENT_SPRINT.md` | What to work on right now                         |
| `docs/plans/TASKS.md`    | The live task board — where you are, what is next       |

### 4.2 Read per task type

| If the task touches…       | Read                                                                 |
| -------------------------- | -------------------------------------------------------------------- |
| Any UI component or screen | `docs/03_DESIGN_SPEC.md`, `docs/design-system/` (start at `00_README.md`, then `04_COLORS.md`, `18_UI_IMPLEMENTATION_RULES.md`, `11_COMPONENT_RULES.md`, `17_COMPONENT_CHECKLIST.md`, `13_ACCESSIBILITY.md`) |
| A product feature          | `docs/01_PRODUCT_SPEC.md` and the matching `docs/features/*.md`       |
| Services, layering, wiring | `docs/02_ARCHITECTURE_SPEC.md`, `docs/ARCHITECTURE.md`               |
| Safe/unsafe classification | `docs/05_BUSINESS_RULES.md`, `docs/SAFETY.md`                        |
| Models or persistence      | `docs/06_DATA_MODELS.md`, `apps/desktop/src-tauri/migrations/`        |
| Tests                      | `docs/07_TESTING_RULES.md`                                           |
| Plugins                    | `docs/08_PLUGIN_SDK.md`, `packages/plugin-sdk/src/`                  |
| Anything filesystem-facing | `docs/00_MASTER_SPEC.md` §AI Development Safety Policy — **mandatory** |

### 4.3 Historical, not authoritative

`docs/SPRINT_1_FOUNDATION.md`, `docs/superpowers/`, `.superpowers/`, and
`docs/04_IMPLEMENTATION_PLAN.md` are records of past work and early intent. Read
them for context. **Never select work from them.** Task selection comes only from
`docs/plans/CURRENT_SPRINT.md`.

### 4.4 When docs disagree with code

Fix one of them and say which you fixed. Never leave them silently diverged, and
never assume the code is right because it exists. If the disagreement is about
product behavior or safety, the doc wins and the code is a bug — report it rather
than "correcting" the doc to match.

### 4.5 When a doc is silent

If a task requires a product decision no document answers: **stop and ask.** Do
not invent product behavior. This is Rule 1 of the master spec.

---

## 5. What you may run — the verification ladder

Three tiers. Know which tier a command is in before you run it.

### Tier 1 — Run freely, always, no permission needed

```bash
pnpm lint                # ESLint across the workspace
pnpm lint:fix            # ESLint with autofix
pnpm format              # Prettier write
pnpm format:check        # Prettier verify
pnpm typecheck           # tsc --noEmit in every package
pnpm build               # typecheck + Vite bundle → dist/ (writes only inside the repo)
```

Plus read-only inspection: `git status`, `git diff`, `git log`, reading files,
searching the repo, `cargo check` / `cargo clippy` in `apps/desktop/src-tauri`.

**Every task must pass Tier 1 before you commit.** No exceptions.

### Tier 2 — Ask before the first run in a session

```bash
pnpm test                # Vitest unit + integration
pnpm test:unit
pnpm test:integration
pnpm test:e2e            # Playwright, headless Chromium against the web shell
pnpm ci                  # includes the above — Tier 2 by inclusion
```

Ask once: *"May I run the test suite this session?"* If the developer says yes,
you may run these for the remainder of the session without asking again. If they
say no or do not answer, write the tests, leave them unrun, and mark the task
`NEEDS_MANUAL_TEST`.

Note that `pnpm ci` chains lint → format:check → typecheck → test → build, so it
is Tier 2 even though most of it is Tier 1.

### Tier 3 — Never run automatically. Hand back to the developer.

- `pnpm tauri:dev`, `pnpm tauri:build` — real native macOS build and app launch
- Anything that scans, reads, writes, moves, renames, compresses, or deletes
  files outside the repository working directory
- Anything touching `~`, Desktop, Documents, Downloads, Pictures, Movies, Music,
  Library, caches, or system folders
- Emptying Trash; uninstalling applications
- Anything requiring `sudo` or elevated privileges
- `git push`, `gh pr create`, or any network-mutating command
- Installing global tooling, or changing the developer's shell/system config

You may **write** the code for every one of these. You may never **execute** it.

### Tier 3 handoff format

When a task needs Tier 3 verification, stop and write exactly this shape:

```markdown
## Manual test required — <TASK-ID>

**What I implemented:** <one or two sentences>

**Why I cannot verify it:** <which Tier 3 rule applies>

**Please run:**
1. <exact command>
2. <exact steps in the app>

**Expected:** <observable result>

**If it fails:** <what to paste back to me>
```

Then set the task status to `NEEDS_MANUAL_TEST` and stop. Do not start the next
task — a `NEEDS_MANUAL_TEST` task blocks anything that depends on it.

---

## 6. Safety rules for filesystem work

These operationalize `docs/00_MASTER_SPEC.md` §AI Development Safety Policy and
`docs/SAFETY.md`. They constrain the **code you write**, not just what you run.

1. **Mock data first.** Until the developer explicitly approves real integration
   for a feature, build against mock services (`apps/desktop/src/services/mocks/`)
   and synthetic filesystem trees. UI and business logic land complete before
   real filesystem access is introduced.
2. **Dry Run by default.** Every filesystem operation must support Dry Run,
   Preview, and Execute — in that order of implementation. Dry Run is the
   default in every development build. Execute is never the default.
3. **Scans stay read-only, structurally.** A scanner must not be *able* to
   delete. Do not add a write or delete capability to `ScannerPlugin`,
   `ScanContext`, or any scanner service contract. Enforce it in the type, not
   in a comment.
4. **Cleanup requires typed confirmation.** `CleanupService.requestCleanup` takes
   `confirmed: true`; `CleanContext.confirmedByUser` is `true` by type. Never
   widen these to optional or boolean-with-default.
5. **No auto-cleanup path may exist.** No timer, no startup hook, no "helpful"
   background sweep, no retry that re-executes a delete. If you can trace a
   delete that no user click caused, that is a bug — fix it or report it.
6. **AI features are read-only.** Analyzers produce explainable recommendations
   and nothing else. They never hold a delete capability.
7. **Confirmation dialogs are never bypassable** — not in dev builds, not behind
   a flag, not "temporarily for testing."
8. **Sandbox only, in tests.** Filesystem tests target a dedicated temp
   directory created by the test and removed by the test. Never a real user
   directory, never a path derived from `os.homedir()`.
9. **Real filesystem code lands dark.** New native/fs capability ships behind an
   explicitly-off flag, with the task marked `NEEDS_MANUAL_TEST`.

Safe by default, for this project, means: read-only unless approved, mock unless
switched, Dry Run unless executed, manual confirmation before any modification.

---

## 7. Determining the current sprint

1. Read `docs/plans/CURRENT_SPRINT.md`.
2. It names exactly one sprint and its status. `Status: ACTIVE` means that sprint
   is the only source of work.
3. Follow its link to the detailed sprint file in `docs/plans/sprints/`. That
   file holds the tasks.
4. If `CURRENT_SPRINT.md` says `Status: COMPLETE`, or every task in the sprint
   file is `DONE`: **do not advance the sprint yourself.** Report completion,
   propose the next sprint from `docs/plans/ROADMAP.md`, and stop. Advancing
   sprints is the developer's call.
5. Never work on two sprints at once. Never pull an item from
   `docs/plans/BACKLOG.md` or `ROADMAP.md` into the current sprint on your own
   initiative. The backlog exists precisely to stop you deciding "let's implement
   plugins" in the middle of Smart Scan.

---

## 8. Selecting the next task

From the active sprint file, pick the **first** task that satisfies all of:

- Status is `TODO`
- Every task listed in its `Dependencies` has status `DONE`
- It is not blocked by an open `NEEDS_MANUAL_TEST` task it depends on

Tie-break among eligible tasks by `Priority` (P0 → P1 → P2), then by task ID
order. Take exactly one.

If no task is eligible:

- **Something is `IN_PROGRESS`** — resume it. Do not start a parallel task.
- **Everything eligible is blocked** — report what is blocking and stop.
- **Everything is `DONE`** — see Section 7.4.

State your selection before implementing: the task ID, its title, and the docs
you are about to read for it. One line each.

---

## 9. Task status vocabulary

Exactly these values. No inventing new ones.

| Status              | Meaning                                                              |
| ------------------- | -------------------------------------------------------------------- |
| `TODO`              | Not started, available once dependencies are `DONE`                  |
| `IN_PROGRESS`       | Being worked on right now — only one task may hold this              |
| `BLOCKED`           | Cannot proceed; the reason is recorded on the task                   |
| `REVIEW`            | Code complete, Tier 1/2 green, awaiting the developer's code review  |
| `NEEDS_MANUAL_TEST` | Code complete, awaiting Tier 3 verification by the developer         |
| `DONE`              | Acceptance criteria met and verified; committed                      |
| `DEFERRED`          | Moved out of this sprint; the developer decides where it goes        |

`REVIEW` and `NEEDS_MANUAL_TEST` both hand the ball to the developer, but they
ask for different things: `REVIEW` wants eyes on a diff, `NEEDS_MANUAL_TEST`
wants a command run on the real machine. Both block dependent tasks.

### Status transition rules

- Set `IN_PROGRESS` **before** writing code, not after.
- `DONE` requires: acceptance criteria satisfied, Tier 1 green, the task's stated
  verification method actually performed, and the work committed.
- You may **never** set `DONE` on a task whose verification method is Tier 3.
  The developer sets that, after testing. You set `NEEDS_MANUAL_TEST`.
- You may **never** set `DONE` while tests fail, typecheck fails, lint fails, or
  the implementation is partial. Leave it `IN_PROGRESS` and explain.
- Only the developer may set `DEFERRED`, or move a task between sprints.
- Every status change is written into **both** the sprint file and
  `docs/plans/TASKS.md`, in the same commit as the code it describes. The sprint
  file is authoritative for a task's status; `TASKS.md` mirrors it and records
  where you are right now. If they disagree, the sprint file wins.

---

## 10. Dependency rules

- A task's `Dependencies` field lists task IDs, and only task IDs.
- Dependencies are hard. Never start a task with an unfinished dependency
  "because it probably won't matter."
- Never edit a task's `Dependencies` to unblock yourself. If a dependency looks
  wrong, say so and stop.
- If, mid-implementation, you discover a real dependency the sprint file does not
  record: stop, report it, and propose the edit. Do not silently implement the
  missing prerequisite as part of your current task — that produces one commit
  doing two things and a sprint file that no longer describes reality.
- If a dependency is only partially satisfied (the interface exists, the
  implementation is a stub), that is fine **only** if your task depends solely on
  the interface. Say which you are relying on.

---

## 11. Implementation rules

### Layering — strict, one direction

```text
UI (apps/desktop, packages/ui)      renders only; no business rules, no fs
        ↓
Application (packages/core)         orchestrates use-cases; owns contracts
        ↓
Domain (packages/domain)            pure models; no behavior
        ↓
Infrastructure (packages/scanner, packages/cleanup, db, src-tauri)
```

- The UI depends on **interfaces** from `@luman/core`, never on concrete
  infrastructure. Pages call `useServices()`.
- Business rules never live in components. If you are writing an `if` about
  whether something is safe to delete inside a `.tsx` file, you are in the wrong
  layer.
- Zustand stores hold UI/session state only.
- Infrastructure is swappable without touching the UI. If a task forces a UI
  change to swap an implementation, the contract is wrong — report it.

### Packages

| Package             | Responsibility                                          |
| ------------------- | ------------------------------------------------------- |
| `@luman/shared`     | Cross-cutting types + pure utils (`Result`, ids, bytes) |
| `@luman/domain`     | Domain models (Scan, Finding, CleanupAction, …)         |
| `@luman/core`       | Service contracts, logging, errors, db, plugin manager  |
| `@luman/scanner`    | Read-only scanning infrastructure                       |
| `@luman/cleanup`    | Confirmed cleanup infrastructure                        |
| `@luman/ui`         | Presentational primitives + design tokens               |
| `@luman/plugin-sdk` | Public plugin contracts                                 |

### Code conventions (full list in `docs/CONVENTIONS.md`)

- Imports use `@luman/*` aliases. Never deep-relative across packages.
- Types first: prefer `interface`/`type` and `readonly`. Models are data-only.
- Predictable failures return `Result<T, E>` from `@luman/shared`. Exceptional
  failures throw `AppError` with a stable `ErrorCode`.
- Styling uses CSS variables from `@luman/ui` tokens. **No hardcoded colors,
  spacing, radii, or border widths** — use the token, always.
- Every screen defines Loading, Empty, Error, and Success states via `StateView`.
- Prefer extending an existing `@luman/ui` primitive over adding a new one.
  Check `packages/ui/src/components/` first — there are 53 already.

### Scope discipline

Implement the task. Not the task plus an improvement you noticed.

If you spot something worth doing that is outside the current task — a bug, a
refactor, a missing test — note it for the backlog and move on. Unrelated changes
in a task commit make the history unreviewable, and reviewability is the only
thing standing between an autonomous loop and a broken repo.

---

## 12. Testing rules

Baseline per `docs/07_TESTING_RULES.md` — every feature requires unit tests,
integration tests, an E2E happy path, and explicit coverage of the permission
denied, empty, and error cases.

- Naming: `*.test.ts(x)` = unit (happy-dom). `*.integration.test.ts` = node.
  `e2e/*.spec.ts` = Playwright.
- Write the tests as part of the task, not as a follow-up task.
- Tests must be deterministic: no wall-clock dependence, no network, no
  ordering assumptions, no reliance on machine state.
- Tests must not touch the real filesystem outside a self-created temp dir
  (Section 6.8).
- A test that fails is information, not an obstacle. Never weaken an assertion,
  add a skip, loosen a snapshot, or delete a case to get green. If a test seems
  wrong, say so and stop.
- Running the suites is Tier 2 — see Section 5.

---

## 13. Documentation update rules

Update docs **in the same commit** as the code, when the code changes what a doc
claims.

| You changed…                          | Update                                       |
| ------------------------------------- | -------------------------------------------- |
| Task progress                         | the sprint file **and** `docs/plans/TASKS.md` |
| A whole sprint's state                | `docs/plans/CURRENT_SPRINT.md`, `ROADMAP.md` |
| A service contract or layer boundary  | `docs/ARCHITECTURE.md`                       |
| A domain model or migration           | `docs/06_DATA_MODELS.md`                     |
| A safe/unsafe classification          | `docs/05_BUSINESS_RULES.md`                  |
| A design token or component rule      | the relevant `docs/design-system/*.md`       |
| A new convention                      | `docs/CONVENTIONS.md`                        |
| Setup, scripts, or repo layout        | `README.md`                                  |
| Anything about safety                 | `docs/SAFETY.md` **and** ask before changing |

Rules:

- Never weaken a safety document to make an implementation legal.
- Do not create new documents unless a task says to. This repo's failure mode is
  a pile of disconnected Markdown, not too little of it.
- Do not restate the same rule in three files. Link to the owning document.
- Keep the status tables in `CURRENT_SPRINT.md` and `ROADMAP.md` consistent with
  the sprint files. If they drift, the loop stops being trustworthy.

---

## 14. Git and commit rules

**Branching: one branch per task. Never push.**

```bash
git switch main
git switch -c feat/INF-001-filesystem-abstraction
# … implement, verify, update docs …
git add <specific paths>
git commit -m "…"
```

- Branch name: `<type>/<TASK-ID>-<kebab-slug>`, e.g.
  `feat/INF-002-storage-service`, `fix/DASH-004-empty-state`.
- One task per branch. One logical change per commit; a task may be several
  commits if each is coherent.
- `git add <paths>`, never `git add -A` or `git add .` — the working tree may
  contain the developer's own changes.
- **Never** `git push`, open a PR, force-push, rebase shared history, amend a
  commit that is not yours, `git reset --hard`, or `git clean`. The developer
  reviews and merges.
- Never commit to `main` directly.
- Never commit secrets, `.env` files, build output, screenshots, or
  `node_modules`. If `.gitignore` needs updating, that is its own change.

### Commit message format

Conventional commits, matching the existing history:

```text
<type>(<scope>): <imperative summary, lowercase, no trailing period>

<why, if not obvious from the summary>

Task: <TASK-ID>
```

Types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `style` (the history
so far uses `feat`, `fix`, `docs`).

Scope is the package or area touched: `ui`, `core`, `desktop`, `scanner`,
`cleanup`, `shared`, `domain`, `plugin-sdk`, `docs`, `ci`. Omit the scope only
when a change genuinely spans the whole workspace.

Example:

```text
feat(core): add filesystem abstraction behind a read-only contract

Wraps path traversal so scanners cannot reach a write capability.
Real fs access stays behind LUMAN_REAL_FS, default off.

Task: INF-001
```

Do not credit yourself as an author or add tool attribution unless the developer
asks for it.

---

## 15. Bootstrap: the plan system

`AGENTS.md` is deliberately written before the plan files exist. Until
`docs/plans/` is populated, the loop cannot run.

Expected structure:

```text
docs/plans/
├── ROADMAP.md                        where Luman is going
├── CURRENT_SPRINT.md                 what to work on right now
├── TASKS.md                          the live task board
├── BACKLOG.md                        wanted eventually, not now
└── sprints/
    ├── 001-foundation.md
    ├── 002-design-system.md
    ├── 003-ui.md
    └── 004-core-infrastructure.md
```

If `docs/plans/CURRENT_SPRINT.md` is missing, **stop and tell the developer the
plan system has not been created yet.** Do not improvise a sprint, do not pick
work from the roadmap, and do not create these files unless asked to.

### Task format in sprint files

Every task carries exactly these fields:

````markdown
## INF-004 — Filesystem abstraction

```yaml
id: INF-004
status: TODO
priority: P0
depends_on: [INF-003]
```

### Objective
One or two sentences: what this task achieves and why it exists.

### Requirements
What must be true when the task is done. Normative, not procedural.

### Implementation notes
Where the relevant code lives, which existing patterns to follow, and the
specific traps in this task. Guidance, not requirements.

### Acceptance criteria
Checkable statements. Each one must be objectively true or false.

### Safe verification
The exact commands the agent may run, and what it must not run.

### Manual verification (Tier 3 — developer only)
Only when the task needs it: numbered steps and the expected observation.

### Definition of done
A checklist ending in the status update and the commit.
````

A task without acceptance criteria is not ready to be worked on. Say so and stop.

`depends_on: []` means no dependencies. `status` in this block is the
authoritative status for the task; `docs/plans/TASKS.md` mirrors it.

---

## 16. When you must stop and ask

Stop, explain, and wait. Do not guess, and do not proceed with a "reasonable
assumption" on any of these:

1. `docs/plans/CURRENT_SPRINT.md` is missing, or names a sprint whose file does
   not exist.
2. The working tree contains changes you did not make.
3. No task is eligible — everything is blocked, or all are `DONE`.
4. A task has no acceptance criteria, or criteria you cannot verify safely.
5. A task requires a product decision no document answers.
6. A task requires Tier 3 execution — real native build, real filesystem, real
   deletion. Use the handoff format in Section 5.
7. A task appears to require weakening a safety rule, a type-level guarantee, or
   a confirmation dialog.
8. Docs contradict each other, or a doc contradicts a safety rule.
9. You discover an unrecorded dependency, or the task is materially bigger than
   its description.
10. Tier 1 fails for a reason you cannot fix inside the task's scope.
11. A dependency needs adding, upgrading, or removing. Dependency changes are
    the developer's call.
12. You would need to change `docs/00_MASTER_SPEC.md`, `docs/SAFETY.md`,
    `AGENTS.md`, CI config, or `.claude/settings.local.json`.
13. The sprint is complete and someone needs to decide what is next.

Stopping is a successful outcome. A clear question costs the developer thirty
seconds; a wrong guess on this codebase can cost them their files.

---

## 17. Definition of done

A task is `DONE` only when all of these hold:

- [ ] Acceptance criteria satisfied, all of them
- [ ] Tier 1 green: `pnpm lint`, `pnpm format:check`, `pnpm typecheck`
- [ ] Tests written per Section 12 (and run, if Tier 2 was authorized)
- [ ] The task's stated verification method was actually performed
- [ ] Layering respected; no business rules in the UI; no fs in the UI
- [ ] Design tokens used; no hardcoded visual values
- [ ] Loading / Empty / Error / Success states present, if a screen was touched
- [ ] Accessibility checked against `docs/design-system/13_ACCESSIBILITY.md`, if
      a screen was touched
- [ ] No new safety-rule exceptions; no auto-execute path introduced
- [ ] Affected docs updated in the same commit
- [ ] Status updated in the sprint file
- [ ] Committed on its own branch, not pushed
- [ ] Scope clean: nothing unrelated in the diff

If any box is unchecked, the task is not `DONE`. Say which box, and why.

---

## 18. Reporting

After each task, report in this shape — short, scannable, no narration:

```markdown
**<TASK-ID> — <title>** → <STATUS>

Changed: <files, grouped>
Verified: <exactly what you ran, and the result>
Docs updated: <files, or none>
Commit: <branch> · <short sha> · <subject>
Notes: <anything the developer needs to decide, or none>
Next eligible: <TASK-ID>, or "stopped — <reason>"
```

Then either continue the loop or stop, per Section 16.
