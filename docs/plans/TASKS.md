# Luman Task Board

The agent's live position. Updated after every task, in the same commit as the
code it describes.

**Authority:** `docs/plans/sprints/*.md` is authoritative for what a task *is*
and its official `Status`. This board is authoritative for *where the agent is
right now* — in progress, next, blocked. The two must agree at every commit; if
they disagree, the sprint file wins and this board is stale.

## Current Sprint

Sprint 04 — Core Infrastructure

Sprint document: `docs/plans/sprints/004-core-infrastructure.md`

## In Progress

None

## Next Available

None. Every remaining task is with the developer.

INF-013 and INF-014 were taken while INF-005 and INF-006 were still
`NEEDS_MANUAL_TEST`, on the developer's explicit authorization (2026-08-15).
The exception and its reasoning are recorded on INF-013 in the sprint file.
Dependencies were not edited and no status was falsified.

INF-015 is the one task that exception does **not** cover — see Blocked.

## Blocked

- INF-015 — Verification. Its final audit covers every task, and two of them
  (INF-005, INF-006) cannot be signed off until the developer's Tier 3 checks
  pass. Taking it now would mean auditing work whose verification has not
  happened.

## Awaiting Developer

- [ ] INF-005 — Storage/volume service · `NEEDS_MANUAL_TEST`
- [ ] INF-006 — Permission service · `NEEDS_MANUAL_TEST`
- [ ] INF-014 — UI integration · `NEEDS_MANUAL_TEST` · native launch + e2e

---

## Sprint 04 Ledger

All fifteen tasks, mirroring the sprint file. INF-001 through INF-004 are
`DONE`, as is INF-009. INF-005 and INF-006 are `NEEDS_MANUAL_TEST` — their code
is complete and verified, but Tier 3 checks on real hardware are the developer's
(`AGENTS.md` §9), and both block their dependents until cleared.

INF-009 unblocked INF-007. INF-010, INF-011, and INF-012 need nothing further.

| ID      | Task                                 | Status | Depends on                |
| ------- | ------------------------------------ | ------ | ------------------------- |
| INF-001 | Project structure audit               | DONE   | none                      |
| INF-002 | Core domain types                     | DONE   | INF-001                   |
| INF-003 | Service interfaces                    | DONE   | INF-002                   |
| INF-004 | Filesystem abstraction                | DONE   | INF-003                   |
| INF-005 | Storage/volume service                | NEEDS_MANUAL_TEST | INF-004                   |
| INF-006 | Permission service                    | NEEDS_MANUAL_TEST | INF-003                   |
| INF-007 | Scan engine foundation                | DONE   | INF-004, INF-009          |
| INF-008 | Progress & cancellation               | DONE   | INF-007                   |
| INF-009 | Event system                          | DONE   | INF-002                   |
| INF-010 | Persistence layer                     | DONE   | INF-002                   |
| INF-011 | Logging                               | DONE   | INF-003                   |
| INF-012 | Safety boundary                       | DONE   | INF-002, INF-004          |
| INF-013 | Mock implementations                  | DONE   | INF-004, INF-005, INF-006 |
| INF-014 | UI integration                        | NEEDS_MANUAL_TEST | INF-010, INF-013          |
| INF-015 | Verification                          | TODO   | INF-001 … INF-014         |

## Completed

### Foundation

- [x] Sprint 01 — Foundation

### Design

- [x] Sprint 02 — Design System

### UI

- [x] Sprint 03 — UI

---

## Task Status Rules

| Status              | Meaning                                                      |
| ------------------- | ------------------------------------------------------------ |
| `TODO`              | Not started; available once every dependency is `DONE`        |
| `IN_PROGRESS`       | Being worked on now — only one task may hold this            |
| `BLOCKED`           | Cannot proceed; the reason is recorded on the task            |
| `REVIEW`            | Code complete, Tier 1/2 green, awaiting developer code review |
| `NEEDS_MANUAL_TEST` | Code complete, awaiting the developer's Tier 3 manual test    |
| `DONE`              | Acceptance criteria met and verified; committed               |
| `DEFERRED`          | Moved out of this sprint; the developer decides where it goes |

`REVIEW` and `NEEDS_MANUAL_TEST` both mean the agent has stopped and the ball is
with the developer, but they are different asks: `REVIEW` wants eyes on a diff,
`NEEDS_MANUAL_TEST` wants a command run on the real machine
(`AGENTS.md` §5, §9). Tasks in either state are listed under **Awaiting
Developer** above.

---

## Agent Rules

1. Work on one task at a time.
2. Never skip dependencies.
3. Mark a task `IN_PROGRESS` before implementation.
4. Complete implementation and safe verification before marking `DONE`.
5. If blocked, mark `BLOCKED` and document the reason.
6. Never mark a task `DONE` without satisfying its acceptance criteria.
7. Update this file after completing a task.
8. Do not modify completed tasks unless a new requirement explicitly requires it.
9. Never set `DONE` on a task whose verification is Tier 3. Set
   `NEEDS_MANUAL_TEST`, write the handoff (`AGENTS.md` §5), and stop.
10. Update this board and the sprint file's `Status` in the **same commit** as
    the code. A board that disagrees with the sprint file makes the loop
    untrustworthy.
11. Never advance the sprint, mark the sprint complete, or pull work from
    `ROADMAP.md` or `BACKLOG.md`. Report and stop (`AGENTS.md` §7.4).
12. Never edit a task's dependencies to unblock yourself (`AGENTS.md` §10).
