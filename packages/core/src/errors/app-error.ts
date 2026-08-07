/**
 * Stable, user-facing error codes. The UI maps these to friendly copy; logs and
 * telemetry key off the code rather than the (localizable) message.
 */
export type ErrorCode =
  | 'UNKNOWN'
  | 'PERMISSION_DENIED'
  | 'NOT_IMPLEMENTED'
  | 'DATABASE_INIT_FAILED'
  | 'DATABASE_QUERY_FAILED'
  | 'PLUGIN_REGISTRATION_FAILED'
  | 'PLUGIN_NOT_FOUND'
  | 'SCAN_FAILED'
  | 'CLEANUP_FAILED'
  | 'CLEANUP_NOT_CONFIRMED';

export interface AppErrorOptions {
  readonly code?: ErrorCode;
  /** Message safe to show a user. */
  readonly userMessage?: string;
  readonly cause?: unknown;
  readonly context?: Record<string, unknown>;
}

/**
 * The single error type crossing application boundaries. Carries a stable code,
 * a technical message (for logs), and an optional user-safe message.
 */
export class AppError extends Error {
  readonly code: ErrorCode;
  readonly userMessage: string;
  readonly context?: Record<string, unknown>;

  constructor(message: string, options: AppErrorOptions = {}) {
    super(message, options.cause !== undefined ? { cause: options.cause } : undefined);
    this.name = 'AppError';
    this.code = options.code ?? 'UNKNOWN';
    this.userMessage = options.userMessage ?? 'Something went wrong. Please try again.';
    if (options.context) this.context = options.context;
    Object.setPrototypeOf(this, AppError.prototype);
  }

  static from(error: unknown): AppError {
    if (error instanceof AppError) return error;
    if (error instanceof Error) {
      return new AppError(error.message, { cause: error });
    }
    return new AppError(String(error), { context: { original: error } });
  }

  static notImplemented(what: string): AppError {
    return new AppError(`${what} is not implemented in this sprint.`, {
      code: 'NOT_IMPLEMENTED',
      userMessage: 'This feature is not available yet.',
    });
  }
}
