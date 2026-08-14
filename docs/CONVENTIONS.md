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

## Real-machine flags

Every environment flag that reaches real hardware is listed here. This is the
single reference; INF-015 audits against it.

| Flag                    | Default | Gates                                    | Read in |
| ----------------------- | ------- | ---------------------------------------- | ------- |
| `LUMAN_REAL_VOLUMES`    | off     | Real volume capacity (INF-005)           | Rust    |
| `LUMAN_REAL_PERMISSIONS`| off     | Real permission probe (INF-006)          | Rust    |
| `LUMAN_LOG_FILE_SINK`   | off     | Log file sink — **not implemented yet**  | Rust    |

Rules:

- **Every flag defaults to off.** With nothing set, no code path touches real
  hardware and the mock answers instead.
- **Flags are read in Rust**, via `std::env::var`. They cannot be read from
  renderer TypeScript: `vite.config.ts` sets no `envPrefix`, so only
  `VITE_`-prefixed variables reach `import.meta.env`, and `process.env` does not
  exist in the renderer bundle. A TypeScript read is permanently `undefined`,
  which would make the flag impossible to switch on.
- **Only an explicit opt-in value enables a flag** — `1`, `true`, or `yes`.
  Anything else, including `0` and an empty string, counts as off.
- **Enabling a flag makes a task Tier 3.** Only the developer runs with one set.

`LUMAN_LOG_FILE_SINK` is reserved, not implemented. A file sink writes to the
app data directory, outside the repository, so INF-011 deliberately shipped the
in-memory ring buffer instead and left the flag unclaimed.
