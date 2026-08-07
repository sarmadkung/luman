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
