import type { ExecutionMode, PathClassification } from '@luman/domain';

/** Why the gate reached its verdict, in terms the UI can explain to the user. */
export interface SafetyVerdict {
  readonly allowed: boolean;
  readonly classification: PathClassification;
  /** Stable reason code, e.g. 'protected-path'. Empty when allowed. */
  readonly reason: string;
  /** One plain sentence naming what blocked it. Empty when allowed. */
  readonly explanation: string;
}

/** What the caller wants to do, and to what. */
export interface SafetyRequest {
  /** Absolute path, already resolved by the filesystem guard (INF-004). */
  readonly path: string;
  readonly mode: ExecutionMode;
  /**
   * Whether the user typed a confirmation for this specific operation. `true`
   * by type at the call site — never widened to optional, per AGENTS.md §6.4.
   */
  readonly confirmedByUser: boolean;
}

/**
 * The single decision point for "may this operation touch this path?" (INF-012).
 *
 * The gate only ever *answers*. It performs nothing, and holds no capability to
 * carry out what it approves — approving and doing are separate on purpose, so
 * no code path can accidentally execute by asking whether it may.
 *
 * `evaluate` is total: it returns a verdict for every input rather than
 * throwing, so a caller cannot end up treating a thrown error as permission.
 */
export interface SafetyGate {
  evaluate(request: SafetyRequest): SafetyVerdict;
}

/**
 * Sprint 04 stub. **Denies everything.**
 *
 * A stub that allowed operations would be a hole that opens the moment the gate
 * is wired in ahead of its real implementation. Default-closed means the worst
 * case of an unfinished INF-012 is a feature that does not work, never a
 * deletion that should not have happened.
 */
export class DenyAllSafetyGate implements SafetyGate {
  evaluate(): SafetyVerdict {
    return {
      allowed: false,
      classification: 'protected',
      reason: 'safety-gate-not-implemented',
      explanation: 'Luman cannot verify this location is safe yet, so it is not touching it.',
    };
  }
}
