import type { PermissionScope, PermissionStatus } from '@luman/domain';

/** What a scope means, in words the UI can show without inventing copy. */
export interface PermissionDescription {
  readonly scope: PermissionScope;
  /** Short label, e.g. "Full Disk Access". */
  readonly title: string;
  /** Why Luman is asking, in one plain sentence. */
  readonly reason: string;
}

/**
 * Reports whether Luman may read a scope. Checking is read-only and never
 * prompts.
 *
 * There is no `request()` here. Triggering a real OS permission prompt is
 * Sprint 05 work and needs the developer to verify it on a real machine — a
 * method that could surface a system dialog must not exist where an agent can
 * call it by accident.
 */
export interface PermissionService {
  /** Current status for a scope. Never triggers a prompt. */
  check(scope: PermissionScope): Promise<PermissionStatus>;
  /** Human-readable explanation of a scope, for the permission screens. */
  describe(scope: PermissionScope): PermissionDescription;
}

const DESCRIPTIONS: Record<PermissionScope, Omit<PermissionDescription, 'scope'>> = {
  'full-disk': {
    title: 'Full Disk Access',
    reason: 'Lets Luman measure storage in locations macOS protects by default.',
  },
  home: {
    title: 'Home Folder',
    reason: 'Lets Luman analyse the files in your home folder.',
  },
  volume: {
    title: 'Volume Access',
    reason: 'Lets Luman report capacity for an attached volume.',
  },
};

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
}
