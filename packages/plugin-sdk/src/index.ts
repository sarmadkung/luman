/**
 * @luman/plugin-sdk — the public contract every Luman plugin implements.
 *
 * Safety guarantees baked into the type system:
 *  - Scanners are read-only. They never receive a delete capability.
 *  - Cleaners only ever run after an explicit, confirmed user action.
 *  - Analyzers only read already-collected findings.
 *
 * Sprint 1 defines the contracts only. No built-in plugins ship yet.
 */
export * from './context';
export * from './plugin';
