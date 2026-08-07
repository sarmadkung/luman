import type { Finding, Scan } from '@luman/domain';

/** Structured logger handed to plugins; no direct console access encouraged. */
export interface PluginLogger {
  debug(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
}

/** Read-only environment provided to a scanner while it runs. */
export interface ScanContext {
  readonly scan: Scan;
  readonly logger: PluginLogger;
  /** Cooperative cancellation. Long scans must check this. */
  readonly signal: AbortSignal;
}

/** Read-only environment provided to an analyzer. */
export interface AnalyzeContext {
  readonly findings: readonly Finding[];
  readonly logger: PluginLogger;
}

/**
 * Environment for a cleaner. The presence of `confirmedByUser` is a hard
 * precondition — the PluginManager will never construct this without an
 * explicit, confirmed CleanupAction.
 */
export interface CleanContext {
  readonly findings: readonly Finding[];
  readonly logger: PluginLogger;
  readonly signal: AbortSignal;
  readonly confirmedByUser: true;
}
