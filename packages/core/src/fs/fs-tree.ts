/**
 * The synthetic filesystem shape used by `InMemoryFileSystem`.
 *
 * This lives outside any test file on purpose: INF-007, INF-008, INF-012, and
 * INF-013 all build trees, and a fixture trapped inside one `.test.ts` would be
 * copy-pasted four times and drift.
 */

export interface FileNodeSpec {
  readonly kind: 'file';
  readonly sizeBytes?: number;
  /** ISO-8601. Fixed default — tests must never depend on the wall clock. */
  readonly modifiedAt?: string;
  /** Simulates permission denied: the entry is visible but cannot be read. */
  readonly unreadable?: boolean;
}

export interface DirectoryNodeSpec {
  readonly kind: 'directory';
  readonly children?: Readonly<Record<string, FsNodeSpec>>;
  /** Listing this directory fails, though the directory itself is visible. */
  readonly unreadable?: boolean;
  readonly modifiedAt?: string;
}

export interface SymlinkNodeSpec {
  readonly kind: 'symlink';
  /** Absolute, or relative to the link's parent directory. */
  readonly target: string;
  readonly modifiedAt?: string;
}

/** Sockets, devices, FIFOs — present, sized zero, never traversed. */
export interface OtherNodeSpec {
  readonly kind: 'other';
  readonly modifiedAt?: string;
}

export type FsNodeSpec = FileNodeSpec | DirectoryNodeSpec | SymlinkNodeSpec | OtherNodeSpec;

/** Default timestamp for fixtures. Constant so tests stay deterministic. */
export const FIXTURE_MODIFIED_AT = '2026-01-01T00:00:00.000Z';

export const file = (
  sizeBytes = 0,
  options: Omit<FileNodeSpec, 'kind' | 'sizeBytes'> = {},
): FileNodeSpec => ({
  kind: 'file',
  sizeBytes,
  ...options,
});

export const directory = (
  children: Readonly<Record<string, FsNodeSpec>> = {},
  options: Omit<DirectoryNodeSpec, 'kind' | 'children'> = {},
): DirectoryNodeSpec => ({ kind: 'directory', children, ...options });

export const symlink = (target: string): SymlinkNodeSpec => ({ kind: 'symlink', target });

export const other = (): OtherNodeSpec => ({ kind: 'other' });

/**
 * A small tree that mirrors the shape of a real macOS home directory, including
 * a protected location and a symlink cycle. Enough for most tests to use
 * as-is rather than hand-rolling a tree.
 */
export function standardFixture(): Readonly<Record<string, FsNodeSpec>> {
  return {
    Users: directory({
      testuser: directory({
        Documents: directory({ 'taxes.pdf': file(2048) }),
        Library: directory({
          Caches: directory({ 'com.example.app': directory({ 'cache.bin': file(4096) }) }),
        }),
        projects: directory({
          luman: directory({ 'README.md': file(512) }),
          'link-to-docs': symlink('/Users/testuser/Documents'),
        }),
        secrets: directory({ 'private.key': file(64) }, { unreadable: true }),
        'loop-a': symlink('/Users/testuser/loop-b'),
        'loop-b': symlink('/Users/testuser/loop-a'),
      }),
    }),
    System: directory({ Library: directory({}) }),
    tmp: directory({ 'scratch.tmp': file(128) }),
  };
}
