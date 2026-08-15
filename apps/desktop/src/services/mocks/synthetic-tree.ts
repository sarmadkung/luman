import { directory, file, symlink, type FsNodeSpec } from '@luman/core';

/**
 * The one synthetic filesystem every mock and cross-task test shares.
 *
 * **Obviously synthetic.** The home directory is `/Users/example`, never a real
 * username, and no path here came from anyone's machine. A reader should never
 * have to wonder whether a fixture leaked from a real disk.
 *
 * **Deterministic.** Every size and timestamp is a literal. Two runs produce
 * byte-identical results, which is what makes the suite trustworthy — there is
 * no `Date.now()` and no `Math.random()` anywhere in this file.
 *
 * Reuses the `InMemoryFileSystem` builders from INF-004 rather than defining a
 * second tree shape: one fixture imported everywhere is what makes tests across
 * tasks comparable.
 */

/** The synthetic home. Never `os.homedir()`. */
export const FIXTURE_HOME = '/Users/example';

/** Fixed timestamps, oldest to newest, for entries that need to differ. */
export const FIXTURE_TIMES = {
  old: '2025-03-14T09:00:00.000Z',
  recent: '2026-01-05T12:30:00.000Z',
  newest: '2026-02-20T18:45:00.000Z',
} as const;

/** Sizes named so a test can assert against intent rather than a magic number. */
export const FIXTURE_SIZES = {
  largeVideo: 4_294_967_296, // 4 GiB — the "large file" case
  installer: 1_073_741_824, // 1 GiB
  cacheBlob: 268_435_456, // 256 MiB
  logFile: 10_485_760, // 10 MiB
  tempChunk: 5_242_880, // 5 MiB
  document: 2_097_152, // 2 MiB
  small: 4_096,
} as const;

/**
 * A macOS-shaped tree: caches, logs, temp files, Downloads, an unreadable
 * directory, and a large file.
 *
 * Note what this deliberately includes — `Downloads`, `Documents`, and
 * `Library` are all **protected** locations. They are here precisely so tests
 * can prove the guard refuses them, not because anything should scan them.
 */
export function syntheticTree(): Readonly<Record<string, FsNodeSpec>> {
  return {
    Users: directory({
      example: directory({
        // Protected locations — present so refusals are testable.
        Documents: directory({
          'notes.md': file(FIXTURE_SIZES.document, { modifiedAt: FIXTURE_TIMES.recent }),
        }),
        Downloads: directory({
          'installer.dmg': file(FIXTURE_SIZES.installer, { modifiedAt: FIXTURE_TIMES.old }),
          'archive.zip': file(FIXTURE_SIZES.cacheBlob, { modifiedAt: FIXTURE_TIMES.old }),
        }),
        Library: directory({
          Caches: directory({
            'com.example.browser': directory({
              'blob-001.cache': file(FIXTURE_SIZES.cacheBlob, {
                modifiedAt: FIXTURE_TIMES.old,
              }),
            }),
          }),
          Logs: directory({
            'example-app.log': file(FIXTURE_SIZES.logFile, { modifiedAt: FIXTURE_TIMES.recent }),
          }),
        }),

        // Scannable locations.
        projects: directory({
          demo: directory({
            'README.md': file(FIXTURE_SIZES.small, { modifiedAt: FIXTURE_TIMES.newest }),
            'build.log': file(FIXTURE_SIZES.logFile, { modifiedAt: FIXTURE_TIMES.recent }),
            node_modules: directory({
              'bundle.js': file(FIXTURE_SIZES.document, { modifiedAt: FIXTURE_TIMES.old }),
            }),
          }),
          media: directory({
            'render.mov': file(FIXTURE_SIZES.largeVideo, { modifiedAt: FIXTURE_TIMES.old }),
          }),
          // A symlink into a protected location — the guard must catch it.
          'link-to-documents': symlink('/Users/example/Documents'),
        }),

        // Permission-denied case: visible, but its contents cannot be read.
        'private-vault': directory(
          { 'secret.key': file(FIXTURE_SIZES.small) },
          { unreadable: true },
        ),
      }),
    }),

    tmp: directory({
      'example-build-cache': directory({
        'chunk-01.tmp': file(FIXTURE_SIZES.tempChunk, { modifiedAt: FIXTURE_TIMES.recent }),
        'chunk-02.tmp': file(FIXTURE_SIZES.tempChunk, { modifiedAt: FIXTURE_TIMES.recent }),
      }),
    }),

    System: directory({ Library: directory({}) }),
  };
}

/** Roots a scan may traverse in fixtures. Excludes every protected location. */
export const FIXTURE_ALLOWED_ROOTS: readonly string[] = ['/Users/example/projects', '/tmp'];
