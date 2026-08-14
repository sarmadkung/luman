/**
 * How far an operation is allowed to go.
 *
 * Ordered by increasing consequence: `dry-run` computes and reports, `preview`
 * additionally materialises what *would* change, `execute` performs it. Per
 * AGENTS.md §6.2 `dry-run` is the default everywhere and `execute` is never
 * reachable without typed confirmation.
 */
export type ExecutionMode = 'dry-run' | 'preview' | 'execute';

/** The mode every execution-shaped API falls back to when none is supplied. */
export const DEFAULT_EXECUTION_MODE: ExecutionMode = 'dry-run';
