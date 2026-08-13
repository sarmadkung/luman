import type { FsEntry } from '@luman/domain';
import type { Result } from '@luman/shared';
import type { AppError } from '../errors';

/**
 * The read-only filesystem port — the sprint's central safety guarantee.
 *
 * A scanner cannot delete because **deletion is not expressible**. There is no
 * `write`, `delete`, `unlink`, `move`, `rename`, `trash`, `mkdir`, or `copy`
 * method, and their absence is the enforcement (AGENTS.md §6.3). Adding one
 * here would silently grant every scanner in the app the ability to destroy
 * user data, so the shape is pinned by `FILE_SYSTEM_METHODS` and asserted in a
 * test.
 *
 * Everything that can fail as part of normal operation — a missing path, an
 * unreadable directory, a symlink cycle — returns `Result`. Implementations
 * throw only when something is structurally broken, such as a missing native
 * bridge.
 */
export interface FileSystem {
  /** Metadata for a single entry. */
  stat(path: string): Promise<Result<FsEntry, AppError>>;
  /** Immediate children of a directory. Never recurses. */
  readDirectory(path: string): Promise<Result<readonly FsEntry[], AppError>>;
  /** Whether anything exists at the path. Never throws; false on any error. */
  exists(path: string): Promise<boolean>;
  /** Fully symlink-resolved canonical path. */
  realPath(path: string): Promise<Result<string, AppError>>;
}

/**
 * The complete set of methods a `FileSystem` may expose, in the order declared.
 *
 * This exists so widening the port fails a test rather than passing review. A
 * new method — however innocuous it looks in a diff — breaks
 * `file-system-port.test.ts` until someone deliberately adds it here, which is
 * the moment the safety question gets asked.
 */
export const FILE_SYSTEM_METHODS = ['stat', 'readDirectory', 'exists', 'realPath'] as const;

export type FileSystemMethod = (typeof FILE_SYSTEM_METHODS)[number];
