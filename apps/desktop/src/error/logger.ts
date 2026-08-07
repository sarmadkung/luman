import { ConsoleLogger, type Logger } from '@luman/core';

/** The app-wide logger instance. Swappable for a Tauri log sink later. */
export const logger: Logger = new ConsoleLogger({
  minLevel: import.meta.env.DEV ? 'debug' : 'info',
  bindings: { app: 'luman' },
});
