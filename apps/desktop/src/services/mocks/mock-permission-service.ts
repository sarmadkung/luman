import type { PermissionScope, PermissionStatus } from '@luman/domain';
import {
  AppError,
  FixedPermissionService,
  type PermissionDescription,
  type PermissionService,
} from '@luman/core';

export interface MockPermissionOptions {
  /** Simulated latency in ms. */
  readonly delayMs?: number;
  /** The status to report. Every one of the four is reachable. */
  readonly status?: PermissionStatus;
  /** Per-scope overrides, for driving a mixed state. */
  readonly byScope?: Partial<Record<PermissionScope, PermissionStatus>>;
}

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Mock `PermissionService`.
 *
 * Every `PermissionStatus` is reachable, including per-scope mixes — the
 * dashboard's **Permission Required** state needs `denied` while other scopes
 * are fine, and a mock that could only report one status would leave that
 * combination untestable.
 *
 * `request()` throws here exactly as it does everywhere else. A mock that
 * quietly granted permission would make the one path we most need to keep shut
 * look open in every test.
 */
export class MockPermissionService implements PermissionService {
  readonly #options: MockPermissionOptions;
  readonly #copy = new FixedPermissionService('unknown');

  constructor(options: MockPermissionOptions = {}) {
    this.#options = options;
  }

  async check(scope: PermissionScope): Promise<PermissionStatus> {
    await delay(this.#options.delayMs ?? 0);
    return this.#options.byScope?.[scope] ?? this.#options.status ?? 'granted';
  }

  describe(scope: PermissionScope): PermissionDescription {
    // Reuse the real copy rather than inventing mock wording, so what a test
    // sees is what a user would see.
    return this.#copy.describe(scope);
  }

  request(): Promise<never> {
    throw AppError.notImplemented('Requesting permission');
  }
}
