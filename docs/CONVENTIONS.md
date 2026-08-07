# Conventions

- **Package manager:** pnpm workspaces. Internal deps use `workspace:*`.
- **Imports:** use the `@luman/*` path aliases, never deep relative paths across
  packages.
- **Types first:** prefer `interface`/`type` and `readonly`; models are data-only.
- **Errors:** throw `AppError` across boundaries; carry a stable `ErrorCode`.
- **Results:** service methods that can fail predictably return `Result<T, E>`
  from `@luman/shared` rather than throwing.
- **State:** Zustand stores hold UI/session state only — no business logic.
- **Styling:** CSS variables from `@luman/ui` tokens; switch themes via the
  `data-theme` attribute on `<html>`.
- **Every screen** defines Loading, Empty, Error, and Success states
  (use `StateView`).
- **Tests:** `*.test.ts(x)` = unit (happy-dom), `*.integration.test.ts` = node,
  `e2e/*.spec.ts` = Playwright.
