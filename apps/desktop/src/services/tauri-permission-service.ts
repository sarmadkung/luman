import type { PermissionScope, PermissionStatus } from '@luman/domain';
import type { PermissionDescription, PermissionService } from '@luman/core';
import { AppError } from '@luman/core';
import { isTauri } from '../database/client';
import type { InvokeFn } from './tauri-volume-service';

export interface TauriPermissionServiceOptions {
  /** Used whenever the real probe is unavailable or the flag is off. */
  readonly fallback: PermissionService;
  readonly isTauriRuntime?: () => boolean;
  readonly invoke?: InvokeFn;
}

const VALID_STATUSES: readonly PermissionStatus[] = [
  'granted',
  'denied',
  'not-determined',
  'unknown',
];

/**
 * `PermissionService` backed by the native probe, with a mock behind it.
 *
 * **Never prompts.** The native side performs one read of one location and maps
 * a refusal to a status — see `permissions.rs`. `request()` throws here as it
 * does everywhere else.
 *
 * The result is cached for the lifetime of the instance: permission state does
 * not change while the app runs without a relaunch, and re-probing on every
 * render would turn a bounded check into repeated access attempts. The cache is
 * per-instance rather than a module global so each test gets a fresh one.
 */
export class TauriPermissionService implements PermissionService {
  readonly #fallback: PermissionService;
  readonly #isTauriRuntime: () => boolean;
  readonly #invoke: InvokeFn | undefined;
  readonly #cache = new Map<PermissionScope, PermissionStatus>();

  constructor(options: TauriPermissionServiceOptions) {
    this.#fallback = options.fallback;
    this.#isTauriRuntime = options.isTauriRuntime ?? isTauri;
    this.#invoke = options.invoke;
  }

  async check(scope: PermissionScope): Promise<PermissionStatus> {
    const cached = this.#cache.get(scope);
    if (cached !== undefined) return cached;

    const status = (await this.#probe()) ?? (await this.#fallback.check(scope));
    this.#cache.set(scope, status);
    return status;
  }

  describe(scope: PermissionScope): PermissionDescription {
    return this.#fallback.describe(scope);
  }

  request(): Promise<never> {
    // Pinned by a test. Sprint 05 owns the prompt, and this must not grow one.
    throw AppError.notImplemented('Requesting permission');
  }

  /**
   * One native probe, or null to mean "fall back".
   *
   * A denial is a normal outcome and comes back as a status. Only an
   * unavailable bridge or a disabled flag yields null.
   */
  async #probe(): Promise<PermissionStatus | null> {
    if (!this.#isTauriRuntime()) return null;
    const invoke = this.#invoke;
    if (invoke === undefined) return null;

    try {
      const result = await invoke('check_permission');
      return VALID_STATUSES.includes(result as PermissionStatus)
        ? (result as PermissionStatus)
        : null;
    } catch {
      // Flag off, or the bridge failed. Never surfaced as an error.
      return null;
    }
  }
}
