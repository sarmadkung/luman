import type { LogFields, Logger, LogLevel } from './logger';
import { LOG_LEVEL_ORDER } from './logger';

export interface ConsoleLoggerOptions {
  /** Minimum level to emit. Defaults to 'debug' in dev, 'info' otherwise. */
  readonly minLevel?: LogLevel;
  readonly bindings?: LogFields;
  /** Injected for testability. Defaults to the global console. */
  readonly sink?: Pick<Console, 'debug' | 'info' | 'warn' | 'error'>;
}

/**
 * A dependency-free structured logger. The real app can swap in a sink that
 * forwards to `tauri-plugin-log`; the contract stays identical.
 */
export class ConsoleLogger implements Logger {
  private readonly minLevel: LogLevel;
  private readonly bindings: LogFields;
  private readonly sink: Pick<Console, 'debug' | 'info' | 'warn' | 'error'>;

  constructor(options: ConsoleLoggerOptions = {}) {
    this.minLevel = options.minLevel ?? 'debug';
    this.bindings = options.bindings ?? {};
    this.sink = options.sink ?? console;
  }

  private log(level: LogLevel, message: string, fields?: LogFields): void {
    if (LOG_LEVEL_ORDER[level] < LOG_LEVEL_ORDER[this.minLevel]) return;
    const entry = {
      level,
      time: new Date().toISOString(),
      message,
      ...this.bindings,
      ...fields,
    };
    this.sink[level](entry);
  }

  debug(message: string, fields?: LogFields): void {
    this.log('debug', message, fields);
  }
  info(message: string, fields?: LogFields): void {
    this.log('info', message, fields);
  }
  warn(message: string, fields?: LogFields): void {
    this.log('warn', message, fields);
  }
  error(message: string, fields?: LogFields): void {
    this.log('error', message, fields);
  }

  child(fields: LogFields): Logger {
    return new ConsoleLogger({
      minLevel: this.minLevel,
      bindings: { ...this.bindings, ...fields },
      sink: this.sink,
    });
  }
}
