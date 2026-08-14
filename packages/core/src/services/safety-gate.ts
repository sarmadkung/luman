import type { ExecutionMode, PathClassification } from '@luman/domain';
import type { Result } from '@luman/shared';
import { err, ok } from '@luman/shared';
import { AppError } from '../errors';
import type { FileSystem } from '../fs/file-system';
import type { PathGuard } from '../fs/path-guard';
import type { Logger } from '../logging';

/** What the gate would do to one path, and why. */
export interface SafetyPlanEntry {
  /** Resolved real path, as admitted by `PathGuard`. */
  readonly path: string;
  readonly classification: PathClassification;
  readonly sizeBytes: number;
  readonly allowed: boolean;
  /** Stable reason code when refused; empty when allowed. */
  readonly reason: string;
}

/** The gate's answer: what would happen, to what, and why. */
export interface SafetyPlan {
  readonly mode: ExecutionMode;
  readonly entries: readonly SafetyPlanEntry[];
  readonly totalBytes: number;
  /** Whole-plan verdict. False if **any** entry is refused. */
  readonly allowed: boolean;
  readonly reason: string;
  /** One plain sentence for the user. Never contains a protected path. */
  readonly explanation: string;
}

/**
 * A request to evaluate.
 *
 * `confirmedByUser` is typed as the literal `true`, never `boolean`. That makes
 * unconfirmed execution **unrepresentable** rather than merely rejected —
 * matching `CleanContext.confirmedByUser` and `requestCleanup({ confirmed:
 * true })`. A `boolean` would let `confirmedByUser: someFlag` compile.
 */
export interface SafetyRequest {
  readonly paths: readonly string[];
  /** Omitted means `'dry-run'`. Execute is never the default. */
  readonly mode?: ExecutionMode;
  readonly confirmedByUser?: true;
  /**
   * The build-level execution flag, off everywhere in this sprint. Even with
   * every other precondition met, execution is refused — see `DefaultSafetyGate`.
   */
  readonly executionEnabled?: boolean;
}

/**
 * The single chokepoint every future destructive operation must pass through.
 *
 * The gate only ever **answers**. It holds no capability to carry out what it
 * approves: approving and doing are separate so that no code path can execute
 * merely by asking whether it may.
 *
 * `plan` is total — it returns a verdict for every input rather than throwing,
 * so a caller cannot mistake a thrown error for permission.
 */
export interface SafetyGate {
  plan(request: SafetyRequest): Promise<Result<SafetyPlan, AppError>>;
}

/** Every mode the gate recognises. Anything else fails closed. */
const KNOWN_MODES: readonly ExecutionMode[] = ['dry-run', 'preview', 'execute'];

export interface DefaultSafetyGateOptions {
  readonly guard: PathGuard;
  readonly fs: FileSystem;
  readonly logger?: Logger;
}

/**
 * The real gate.
 *
 * ## Fail-closed rules
 *
 * - **An omitted mode is `'dry-run'`.** Execute is never a default.
 * - **An unrecognised mode is refused.** TypeScript makes one unreachable, but
 *   a value arriving over IPC or read back from settings is not type-checked,
 *   so the default branch is handled explicitly.
 * - **One bad path fails the whole plan.** No partial execution: a mixed path
 *   list where some entries are protected is exactly how a cleanup tool deletes
 *   something it should not.
 * - **`'execute'` is refused unconditionally in Sprint 04.** The branch exists
 *   so its preconditions are testable; performing the operation is Sprint 07's.
 *
 * ## Execute preconditions
 *
 * All four must hold before the execute branch is even considered — and it then
 * refuses anyway with `UNSAFE_OPERATION_BLOCKED`:
 *
 * 1. `confirmedByUser === true` (typed literal, not a boolean)
 * 2. a non-empty plan
 * 3. every path admitted by `PathGuard`
 * 4. `executionEnabled === true`
 */
export class DefaultSafetyGate implements SafetyGate {
  readonly #guard: PathGuard;
  readonly #fs: FileSystem;
  readonly #logger: Logger | undefined;

  constructor(options: DefaultSafetyGateOptions) {
    this.#guard = options.guard;
    this.#fs = options.fs;
    this.#logger = options.logger;
  }

  async plan(request: SafetyRequest): Promise<Result<SafetyPlan, AppError>> {
    const mode = request.mode ?? 'dry-run';

    if (!KNOWN_MODES.includes(mode)) {
      return this.#refuse(
        mode,
        request.paths.length,
        'unknown-mode',
        'That operation is not one Luman recognises.',
      );
    }

    const entries = await this.#buildEntries(request.paths);
    const totalBytes = entries.reduce((sum, entry) => sum + entry.sizeBytes, 0);
    const refused = entries.find((entry) => !entry.allowed);

    // Fail-closed on the whole set, before mode is even considered.
    if (refused !== undefined) {
      this.#audit(mode, entries.length, 'refused', refused.reason);
      return err(
        new AppError(`Plan refused: ${refused.reason}`, {
          code: 'PATH_NOT_ALLOWED',
          userMessage: 'Luman will not touch one of those locations, so it stopped.',
          context: { mode, pathCount: entries.length, reason: refused.reason },
        }),
      );
    }

    if (mode === 'execute') {
      const missing = this.#missingPrecondition(request, entries);
      if (missing !== null) {
        this.#audit(mode, entries.length, 'refused', missing);
        return err(
          new AppError(`Execution refused: ${missing}`, {
            code: 'UNSAFE_OPERATION_BLOCKED',
            userMessage: 'Luman cannot carry that out.',
            context: { mode, pathCount: entries.length, reason: missing },
          }),
        );
      }

      // Every precondition met — and still refused. Sprint 07 owns execution;
      // nothing in this sprint may perform a destructive operation.
      this.#audit(mode, entries.length, 'refused', 'execution-not-implemented');
      return err(
        new AppError('Execution is not implemented in this sprint.', {
          code: 'UNSAFE_OPERATION_BLOCKED',
          userMessage: 'Luman cannot remove anything yet.',
          context: { mode, pathCount: entries.length, reason: 'execution-not-implemented' },
        }),
      );
    }

    // dry-run and preview: report the plan, touch nothing.
    this.#audit(mode, entries.length, 'planned', '');
    return ok({
      mode,
      entries,
      totalBytes,
      allowed: true,
      reason: '',
      explanation:
        mode === 'preview'
          ? `Luman would act on ${entries.length} item(s).`
          : `Dry run: Luman examined ${entries.length} item(s) and changed nothing.`,
    });
  }

  /** Which execute precondition is absent, or null when all hold. */
  #missingPrecondition(request: SafetyRequest, entries: readonly SafetyPlanEntry[]): string | null {
    if (request.confirmedByUser !== true) return 'not-confirmed';
    if (entries.length === 0) return 'empty-plan';
    if (request.executionEnabled !== true) return 'execution-flag-off';
    return null;
  }

  /**
   * Classify each path.
   *
   * Only `stat` is called, and only for size. Nothing here can modify anything —
   * the port has no method that could.
   */
  async #buildEntries(paths: readonly string[]): Promise<readonly SafetyPlanEntry[]> {
    const entries: SafetyPlanEntry[] = [];

    for (const path of paths) {
      const admitted = await this.#guard.resolve(path);
      if (!admitted.ok) {
        entries.push({
          path,
          classification: 'protected',
          sizeBytes: 0,
          allowed: false,
          reason: String(admitted.error.context?.reason ?? admitted.error.code),
        });
        continue;
      }

      const stat = await this.#fs.stat(admitted.value);
      entries.push({
        path: admitted.value,
        classification: 'safe',
        sizeBytes: stat.ok ? stat.value.sizeBytes : 0,
        allowed: true,
        reason: '',
      });
    }

    return entries;
  }

  #refuse(
    mode: string,
    pathCount: number,
    reason: string,
    userMessage: string,
  ): Result<SafetyPlan, AppError> {
    this.#audit(mode, pathCount, 'refused', reason);
    return err(
      new AppError(`Plan refused: ${reason}`, {
        code: 'UNSAFE_OPERATION_BLOCKED',
        userMessage,
        context: { mode, pathCount, reason },
      }),
    );
  }

  /**
   * Audit every call, including refusals.
   *
   * Records mode, path count, outcome, and reason — **never a path**. This is
   * the entry that will matter in Sprint 07 when something goes wrong, and it
   * has to be safe to attach to a bug report.
   */
  #audit(mode: string, pathCount: number, outcome: 'planned' | 'refused', reason: string): void {
    this.#logger?.info('safety-gate', { mode, pathCount, outcome, reason });
  }
}

/**
 * Sprint 04 stub. **Refuses everything.**
 *
 * A permissive stub would be a hole the moment the gate is wired ahead of its
 * real implementation. Default-closed means the worst case of an unfinished
 * gate is a feature that does not work, never a deletion that should not have
 * happened.
 */
export class DenyAllSafetyGate implements SafetyGate {
  async plan(): Promise<Result<SafetyPlan, AppError>> {
    return err(
      new AppError('Safety gate is not configured.', {
        code: 'UNSAFE_OPERATION_BLOCKED',
        userMessage: 'Luman cannot verify this is safe yet, so it is not touching anything.',
        context: { reason: 'safety-gate-not-configured' },
      }),
    );
  }
}
