import type { LogLevel } from './logger';

/** One retained entry. Serializable, so it can cross IPC or be attached to a report. */
export interface LogEntry {
  readonly level: LogLevel;
  /** ISO-8601. */
  readonly time: string;
  readonly message: string;
  readonly fields: Readonly<Record<string, unknown>>;
}

/**
 * How many entries the buffer retains.
 *
 * 300 is enough to cover the run-up to an error dialog without the buffer
 * becoming a memory concern of its own — at a few hundred bytes per entry this
 * is well under a megabyte. The bound is the point: an unbounded log buffer in
 * a long-running desktop app is a leak that only shows up after hours of use.
 */
export const LOG_BUFFER_SIZE = 300;

/**
 * A bounded, in-memory ring of recent log entries.
 *
 * Exists so the error dialog and future diagnostics can show what led up to a
 * failure **without a file sink** — writing a log file lands outside the
 * repository and is Tier 3 (AGENTS.md §5).
 *
 * Drops oldest-first. Never throws.
 */
export class LogBuffer {
  readonly #entries: LogEntry[] = [];
  readonly #capacity: number;

  constructor(capacity: number = LOG_BUFFER_SIZE) {
    this.#capacity = Math.max(1, capacity);
  }

  push(entry: LogEntry): void {
    this.#entries.push(entry);
    // A loop rather than a single shift: a smaller capacity set at construction
    // must not leave the buffer permanently over its bound.
    while (this.#entries.length > this.#capacity) this.#entries.shift();
  }

  /** Oldest first. A copy, so a caller cannot mutate the buffer. */
  entries(): readonly LogEntry[] {
    return [...this.#entries];
  }

  get size(): number {
    return this.#entries.length;
  }

  get capacity(): number {
    return this.#capacity;
  }

  clear(): void {
    this.#entries.length = 0;
  }
}
