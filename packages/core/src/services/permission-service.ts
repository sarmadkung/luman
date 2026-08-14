import type { PermissionScope, PermissionStatus } from '@luman/domain';
import { AppError } from '../errors';

/** What a scope means, in words the UI can show without inventing copy. */
export interface PermissionDescription {
  readonly scope: PermissionScope;
  /** Short label, e.g. "Full Disk Access". */
  readonly title: string;
  /** Why Luman is asking, in one plain sentence. */
  readonly reason: string;
  /** The exact steps to grant it, as an action the user can follow. */
  readonly howToGrant: string;
}

/**
 * Reports whether Luman may read a scope. Checking is read-only and never
 * prompts.
 *
 * `request()` exists but always throws. Triggering a real OS permission prompt
 * is Sprint 05 work and needs the developer to verify it on a real machine. It
 * is declared rather than omitted so that the refusal is visible and pinned by
 * a test — an absent method invites someone to add a working one, whereas a
 * throwing one has to be deliberately dismantled.
 */
export interface PermissionService {
  /** Current status for a scope. Never triggers a prompt. */
  check(scope: PermissionScope): Promise<PermissionStatus>;
  /** Human-readable explanation of a scope, for the permission screens. */
  describe(scope: PermissionScope): PermissionDescription;
  /**
   * Reserved for Sprint 05. **Always throws `NOT_IMPLEMENTED`.**
   *
   * It exists precisely so that it cannot quietly appear later with a working
   * body: the throw is pinned by a test, so anyone wiring a real OS prompt has
   * to delete that test and answer for it. Raising a Full Disk Access dialog is
   * a real-machine side effect and a UX decision that is not this sprint's.
   */
  request(scope: PermissionScope): Promise<never>;
}

/**
 * Permission copy.
 *
 * Per `docs/design-system/15_CONTENT_GUIDELINES.md`: clear labels, helpful
 * errors, action-oriented CTAs. Each entry states what Luman needs, why, and
 * the exact System Settings path — never blaming the user for a permission they
 * have not granted.
 */
const DESCRIPTIONS: Record<PermissionScope, Omit<PermissionDescription, 'scope'>> = {
  'full-disk': {
    title: 'Full Disk Access',
    reason: 'Lets Luman measure storage in locations macOS protects by default.',
    howToGrant: 'Open System Settings › Privacy & Security › Full Disk Access, then turn on Luman.',
  },
  home: {
    title: 'Home Folder',
    reason: 'Lets Luman analyse the files in your home folder.',
    howToGrant:
      'Open System Settings › Privacy & Security › Files and Folders, then turn on Luman.',
  },
  volume: {
    title: 'Volume Access',
    reason: 'Lets Luman report capacity for an attached volume.',
    howToGrant:
      'Open System Settings › Privacy & Security › Files and Folders, then allow Luman to access removable volumes.',
  },
};

/** The scopes Luman knows about, for iterating in UI and tests. */
export const PERMISSION_SCOPES = ['full-disk', 'home', 'volume'] as const;

/**
 * Sprint 04 stub. `check` reports `unknown` rather than `denied`: nothing has
 * been asked yet, and reporting a denial the user never gave would send the UI
 * down a "you refused access" path that is not true. Real checks land in
 * INF-006.
 */
export class StubPermissionService implements PermissionService {
  async check(): Promise<PermissionStatus> {
    return 'unknown';
  }
  describe(scope: PermissionScope): PermissionDescription {
    return { scope, ...DESCRIPTIONS[scope] };
  }
  request(): Promise<never> {
    throw AppError.notImplemented('Requesting permission');
  }
}

/**
 * A permission service fixed in one state, for tests and for the flag-off path.
 *
 * Every `PermissionStatus` must be reachable so the UI's four states can each
 * be exercised; a mock that could only report one would leave three untested.
 */
export class FixedPermissionService implements PermissionService {
  readonly #status: PermissionStatus;

  constructor(status: PermissionStatus) {
    this.#status = status;
  }

  async check(): Promise<PermissionStatus> {
    return this.#status;
  }
  describe(scope: PermissionScope): PermissionDescription {
    return { scope, ...DESCRIPTIONS[scope] };
  }
  request(): Promise<never> {
    throw AppError.notImplemented('Requesting permission');
  }
}
