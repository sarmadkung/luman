# Luman

A macOS storage intelligence application — understand storage, safely reclaim
space, and explain why every cleanup is safe.

> **Sprint 1 status:** Foundation only. The application launches with a working
> shell (window, navigation, theme, routing, state, database initialization, and
> service interfaces). No real scanning or cleanup logic exists yet.

## Tech stack

| Concern          | Choice                                            |
| ---------------- | ------------------------------------------------- |
| Shell / native   | Tauri v2 (Rust)                                   |
| UI               | React 18 + TypeScript + Vite                      |
| State            | Zustand                                           |
| Routing          | React Router v6                                    |
| Theming          | CSS variables (`data-theme`), dark/light/system   |
| Persistence      | SQLite via `tauri-plugin-sql`                     |
| Monorepo         | pnpm workspaces                                   |
| Unit/Integration | Vitest                                            |
| E2E              | Playwright                                        |
| Lint / Format    | ESLint (flat) + Prettier                          |

## Repository layout

```
apps/
  desktop/            # Tauri + React application
packages/
  shared/             # Cross-cutting types & utilities
  domain/             # Domain models (Scan, Finding, ...)
  core/               # Service contracts + stubs, logging, errors, db, plugin mgr
  scanner/            # ScannerService stub
  cleanup/            # CleanupService stub
  ui/                 # Reusable UI primitives + design tokens
  plugin-sdk/         # Public plugin contracts
docs/              # Specs / guidance for AI agents
```

## Prerequisites

- Node.js >= 20 (22 recommended)
- pnpm 10 (`corepack enable`)
- Rust stable + the [Tauri v2 prerequisites](https://tauri.app/start/prerequisites/)
  (needed only for the native build / `tauri:dev`)

## Getting started

```bash
pnpm install

# Web-only shell (fast; runs the React app in a browser)
pnpm dev

# Full native desktop app (requires Rust + Tauri prerequisites)
pnpm tauri:dev
```

## Scripts

| Command                   | What it does                                        |
| ------------------------- | --------------------------------------------------- |
| `pnpm dev`                | Vite dev server for the shell (web)                 |
| `pnpm tauri:dev`          | Run the native desktop app in dev mode              |
| `pnpm build`              | Typecheck all packages + build the frontend bundle  |
| `pnpm tauri:build`        | Produce a distributable native app                  |
| `pnpm lint`               | ESLint across the workspace                          |
| `pnpm format` / `:check`  | Prettier write / verify                             |
| `pnpm typecheck`          | `tsc --noEmit` in every package                     |
| `pnpm test`               | Vitest unit + integration                           |
| `pnpm test:e2e`           | Playwright happy-path E2E                           |
| `pnpm ci`                 | The full CI chain locally                            |

## Architecture

Strict layering (see `docs/`):

```
UI renders only  ->  Application orchestrates  ->  Domain holds business rules  ->  Infrastructure touches the filesystem
```

Business rules never live in the UI. Scans are read-only. Cleanup is always
explicit and confirmed. See `docs/ARCHITECTURE.md` for details.
