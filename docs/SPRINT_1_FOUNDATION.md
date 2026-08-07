# Sprint 1 — Foundation

Goal: a production-ready application foundation so future features slot in with
no architectural refactoring.

## Status: implemented

| Epic | Area                | Status |
| ---- | ------------------- | ------ |
| 1    | Project setup       | ✅ pnpm monorepo, Tauri v2, React/TS/Vite, ESLint, Prettier, path aliases |
| 2    | Application shell   | ✅ window, sidebar, header, content, status bar, routing, active highlight |
| 3    | Theme               | ✅ dark/light/system, persisted, `data-theme` |
| 4    | State management    | ✅ application, settings, navigation, scan-session, cleanup-session stores |
| 5    | Database            | ✅ SQLite via tauri-plugin-sql; 5 empty tables via migration 0001 |
| 6    | Domain models       | ✅ Scan, Finding, CleanupAction, Plugin, Recommendation |
| 7    | Service contracts   | ✅ Scanner/Cleanup/Storage/Recommendation + PluginManager, stubs |
| 8    | Plugin framework    | ✅ discovery, registration, metadata, lifecycle (no built-ins) |
| 9    | Error handling      | ✅ error boundary, logging service, error dialog |
| 10   | Testing             | ✅ Vitest unit + integration, Playwright e2e, one sample each |
| 11   | CI                  | ✅ install → lint → typecheck → test → build (+ macOS native build job) |

## Definition of done

- App launches (web shell verified in CI; native launch requires macOS + Tauri
  prerequisites via `pnpm tauri:dev`).
- Navigation, theme switching, database initialization, service interfaces,
  plugin framework: all in place.
- Tests pass; CI passes; no production feature logic exists.

## Handoff to Sprint 2

Start the Dashboard against the existing `@luman/core` interfaces. Replace
`StubStorageService` / `StubScannerService` with real implementations behind the
same contracts — no shell, routing, theme, or store changes required.
