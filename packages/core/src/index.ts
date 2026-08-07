/**
 * @luman/core — the application layer.
 *
 * Owns service *contracts* and their Sprint-1 stub implementations, structured
 * logging, the error model, the database abstraction, and the plugin manager.
 * This is where orchestration and business rules live — never in the UI.
 */
export * from './errors';
export * from './logging';
export * from './services';
export * from './database';
export * from './plugins';
