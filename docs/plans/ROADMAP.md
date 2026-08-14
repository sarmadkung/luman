# Luman Roadmap

Where Luman is going, in order. This file answers *what* we are building and
*when*. It does not contain tasks — those live in the sprint documents under
`docs/plans/sprints/`.

**This file is authoritative for sprint numbering and sequence.** It supersedes
the older numbering in `docs/design-system/19_SPRINT_UI.md` and the phase list in
`docs/04_IMPLEMENTATION_PLAN.md`, both of which are historical.

Agents: read `AGENTS.md` first. Never select work from this file — work comes
only from `docs/plans/CURRENT_SPRINT.md`. Only the developer advances a sprint.

## Status Legend

- TODO — not started
- IN_PROGRESS — currently being implemented
- BLOCKED — waiting on dependency/decision
- DONE — completed
- DEFERRED — intentionally postponed

Sprint-level status only. `NEEDS_MANUAL_TEST` is a **task**-level status
(`AGENTS.md` §9) and never appears here.

---

# Phase 1 — Foundation

Make the application real enough that features slot in without architectural
refactoring. Complete; recorded in `docs/SPRINT_1_FOUNDATION.md` and git history.

## Sprint 01 — Foundation

Status: DONE

Goal:
Production-ready application foundation — pnpm monorepo, Tauri v2 shell, routing,
theme, Zustand stores, SQLite migration, domain models, service contracts, plugin
framework, error handling, test harness, CI.

## Sprint 02 — Design System

Status: DONE

Goal:
A single visual language — design tokens, colors, typography, spacing, elevation,
glass and aurora systems, theming via `data-theme`.

## Sprint 03 — UI

Status: DONE

Goal:
The full presentational layer — 53 primitives in `@luman/ui`, application shell,
and every route rendered against mock services.

---

# Phase 2 — Core Platform

The load-bearing layer. Everything after this depends on it, so it ships before
any user-visible capability.

## Sprint 04 — Core Infrastructure

Status: IN_PROGRESS

Goal:
Build the safe, read-only infrastructure required by all Luman features.

Covers: filesystem abstraction, storage service, permission service, scan
orchestration, cancellation, event system, logging, persistence, and the safety
execution layer.

---

# Phase 3 — First Product Capability

## Sprint 05 — Smart Scan

Status: TODO

Goal:
Implement Luman's first real storage analysis capability.

First sprint where Luman reads the user's actual disk. Read-only throughout.

---

# Phase 4 — Storage Intelligence

Turn scan results into understanding, then into safely reclaimed space.

## Sprint 06 — Dashboard Integration

Status: TODO

Goal:
Replace the dashboard's mock services with real scan data, preserving every
Loading / Empty / Error / Success state.

## Sprint 07 — Cleanup Engine

Status: TODO

Goal:
The first capability that deletes anything. Dry Run → Preview → Execute, explicit
typed confirmation, full undo history.

## Sprint 08 — Space Lens

Status: TODO

Goal:
Visual disk exploration — navigate the filesystem by size and understand what is
consuming space.

## Sprint 09 — Large Files

Status: TODO

Goal:
Find, rank, and explain unusually large files so users can decide about them.

---

# Phase 5 — Application Intelligence

## Sprint 10 — Applications

Status: TODO

Goal:
Inventory installed applications with their real footprint, and support complete,
confirmed uninstall including leftovers.

## Sprint 11 — Developer Center

Status: TODO

Goal:
Luman's developer-first differentiator — reclaim space from build caches,
`node_modules`, package-manager caches, simulators, and container images.

---

# Phase 6 — Product Infrastructure

## Sprint 12 — History

Status: TODO

Goal:
A durable, auditable record of every scan and cleanup — what was removed, when,
and how much was reclaimed.

## Sprint 13 — Settings

Status: TODO

Goal:
Real preferences — theme, safety defaults, exclusions, permissions, and data
management.

## Sprint 14 — Plugin SDK

Status: TODO

Goal:
Promote `@luman/plugin-sdk` to a stable public contract with versioning,
sandboxing, and capability limits. Scanners remain structurally unable to delete.

## Sprint 15 — Plugin Marketplace

Status: TODO

Goal:
Discover, install, update, and remove third-party plugins, with trust and
permission review before anything runs.

---

# Phase 7 — Intelligence

## Sprint 16 — AI Assistant

Status: TODO

Goal:
Explainable, read-only recommendations. The assistant never holds a delete
capability and never performs a destructive action.

---

# Phase 8 — Release

## Sprint 17 — Performance & Reliability

Status: TODO

Goal:
Fast startup, responsive scans on large disks, no UI freezes, graceful failure
under interruption.

## Sprint 18 — Security & Privacy Review

Status: TODO

Goal:
Verify offline-first behavior, audit every filesystem write path and permission
prompt, and confirm no safety invariant regressed.

## Sprint 19 — Release Preparation

Status: TODO

Goal:
Signing, notarization, packaging, update channel, and release documentation.

---

## Out of scope

Not on this roadmap, at any phase: antivirus, RAM cleaning, and fake performance
optimization (`docs/01_PRODUCT_SPEC.md`). Anything else wanted eventually but not
scheduled belongs in `docs/plans/BACKLOG.md`.
