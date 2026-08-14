import type { LogFields, Logger, LogLevel } from './logger';
import { LOG_LEVEL_ORDER } from './logger';
import { LogBuffer, type LogEntry } from './log-buffer';
import { redactFields } from './redact';

export interface ConsoleLoggerOptions {
  /** Minimum level to emit. Defaults to 'debug' in dev, 'info' otherwise. */
  readonly minLevel?: LogLevel;
  readonly bindings?: LogFields;
  /** Injected for testability. Defaults to the global console. */
  readonly sink?: Pick<Console, 'debug' | 'info' | 'warn' | 'error'>;
  /** Shared ring buffer. Children reuse their parent's. */
  readonly buffer?: LogBuffer;
  /** Overridable for tests. Defaults to `import.meta.env.DEV`. */
  readonly isDev?: boolean;
}

/**
 * Whether the bundle is a development build.
 *
 * `import.meta.env` only exists under Vite; guarded so `@luman/core` stays
 * usable from a plain node context (tests, tooling) without blowing up.
 */
function detectDev(): boolean {
  try {
    // `import.meta.env` is Vite-injected and absent from the plain node
    // typings @luman/core compiles against, so this is read structurally.
    const meta = import.meta as ImportMeta & { readonly env?: { readonly DEV?: boolean } };
    return meta.env?.DEV === true;
  } catch {
    return false;
  }
}

/**
 * A dependency-free structured logger. The real app can swap in a sink that
 * forwards to `tauri-plugin-log`; the contract stays identical.
 *
 * Two safety properties beyond formatting:
 *
 * - **Fields are redacted** before they reach the sink, so a username or a full
 *   protected path cannot end up in a log line that later gets pasted into an
 *   issue. See `redact.ts`.
 * - **Logging never throws.** A failing sink is warned about once and then
 *   swallowed. Logging is what you reach for when something has already gone
 *   wrong, which makes it the worst place for a second failure.
 */
export class ConsoleLogger implements Logger {
  private readonly minLevel: LogLevel;
  private readonly bindings: LogFields;
  private readonly sink: Pick<Console, 'debug' | 'info' | 'warn' | 'error'>;
  private readonly buffer: LogBuffer;
  private sinkFailed = false;

  constructor(options: ConsoleLoggerOptions = {}) {
    // The default is level-by-environment, matching what this option has always
    // documented: verbose while developing, quiet for users.
    const isDev = options.isDev ?? detectDev();
    this.minLevel = options.minLevel ?? (isDev ? 'debug' : 'info');
    this.bindings = options.bindings ?? {};
    this.sink = options.sink ?? console;
    this.buffer = options.buffer ?? new LogBuffer();
  }

  /** Recent entries, oldest first — for the error dialog and diagnostics. */
  recent(): readonly LogEntry[] {
    return this.buffer.entries();
  }

  private log(level: LogLevel, message: string, fields?: LogFields): void {
    if (LOG_LEVEL_ORDER[level] < LOG_LEVEL_ORDER[this.minLevel]) return;

    try {
      const merged = { ...this.bindings, ...fields };
      const safe = redactFields(merged) as Readonly<Record<string, unknown>>;
      const entry: LogEntry = {
        level,
        time: new Date().toISOString(),
        message,
        fields: safe,
      };

      // Buffer first: a failing sink should not cost us the diagnostic record.
      this.buffer.push(entry);
      this.sink[level]({ level: entry.level, time: entry.time, message, ...safe });
    } catch (error) {
      this.reportSinkFailure(error);
    }
  }

  /** Warn once, then stay quiet — a broken sink must not spam or throw. */
  private reportSinkFailure(error: unknown): void {
    if (this.sinkFailed) return;
    this.sinkFailed = true;
    try {
      this.sink.warn({
        level: 'warn',
        message: 'Log sink failed; further sink errors are suppressed.',
        error: String(error),
      });
    } catch {
      // Even the warning failed. Nothing more to do — never rethrow.
    }
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
      // Share the ring so a child's entries appear in the same diagnostic view.
      buffer: this.buffer,
    });
  }
}
