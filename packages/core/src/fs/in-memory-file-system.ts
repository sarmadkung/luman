import type { FsEntry, FsEntryKind } from '@luman/domain';
import type { Result } from '@luman/shared';
import { err, ok } from '@luman/shared';
import { AppError } from '../errors';
import type { FileSystem } from './file-system';
import { FIXTURE_MODIFIED_AT, type FsNodeSpec } from './fs-tree';
import { isAbsolutePath, joinPath, normalizePath, parentPath, pathSegments } from './paths';

/**
 * Maximum symlink hops before resolution gives up.
 *
 * A cycle is caught by the visited-set first; this bound is the backstop for a
 * long non-cyclic chain, so resolution terminates on any input rather than
 * running until the stack dies.
 */
const MAX_SYMLINK_DEPTH = 40;

export interface InMemoryFileSystemOptions {
  /** The tree, keyed from the root. */
  readonly tree: Readonly<Record<string, FsNodeSpec>>;
}

/**
 * A `FileSystem` backed by a plain object tree.
 *
 * Touches nothing real — every test in this sprint runs against this rather
 * than the developer's disk (AGENTS.md §6.8). Traversal is **iterative**: a
 * hostile tree, a symlink cycle, or a very deep nest must terminate, and
 * recursion on attacker-shaped input is how that guarantee gets lost.
 */
export class InMemoryFileSystem implements FileSystem {
  private readonly tree: Readonly<Record<string, FsNodeSpec>>;

  constructor(options: InMemoryFileSystemOptions) {
    this.tree = options.tree;
  }

  async stat(path: string): Promise<Result<FsEntry, AppError>> {
    const resolved = this.#resolve(path);
    if (!resolved.ok) return resolved;
    const { node, realPath } = resolved.value;
    return ok(toEntry(realPath, node));
  }

  async readDirectory(path: string): Promise<Result<readonly FsEntry[], AppError>> {
    const resolved = this.#resolve(path);
    if (!resolved.ok) return resolved;
    const { node, realPath } = resolved.value;

    if (node.kind !== 'directory') {
      return err(
        new AppError(`Not a directory: ${realPath}`, {
          code: 'PATH_NOT_ALLOWED',
          userMessage: 'That location is not a folder.',
          context: { path: realPath },
        }),
      );
    }
    if (node.unreadable === true) {
      return err(
        new AppError(`Permission denied: ${realPath}`, {
          code: 'PERMISSION_DENIED',
          userMessage: 'Luman does not have permission to read that folder.',
          context: { path: realPath },
        }),
      );
    }

    const children = node.children ?? {};
    // Sorted so enumeration order is deterministic across engines.
    const names = Object.keys(children).sort();
    return ok(
      names.map((name) => {
        const childPath = joinPath(realPath, name);
        const child = children[name];
        // A symlink is reported as a symlink, not as what it points at:
        // enumeration must not silently follow links into other trees.
        return toEntry(childPath, child as FsNodeSpec);
      }),
    );
  }

  async exists(path: string): Promise<boolean> {
    return this.#resolve(path).ok;
  }

  async realPath(path: string): Promise<Result<string, AppError>> {
    const resolved = this.#resolve(path);
    if (!resolved.ok) return resolved;
    return ok(resolved.value.realPath);
  }

  /**
   * Walk to a path, following symlinks, and return the node plus its canonical
   * location.
   *
   * Cycles terminate via a visited set keyed on the link's own path; a repeat
   * visit means the chain closed on itself. Depth is bounded independently so a
   * long acyclic chain cannot run away either.
   */
  #resolve(
    path: string,
  ): Result<{ readonly node: FsNodeSpec; readonly realPath: string }, AppError> {
    if (!isAbsolutePath(path)) {
      return err(
        new AppError(`Path must be absolute: ${path}`, {
          code: 'PATH_NOT_ALLOWED',
          userMessage: 'That location could not be understood.',
          context: { path },
        }),
      );
    }

    const visitedLinks = new Set<string>();
    let hops = 0;
    let current = normalizePath(path);

    // Outer loop restarts whenever a symlink rewrites the path being walked.
    for (;;) {
      const segments = pathSegments(current);
      let node: FsNodeSpec = { kind: 'directory', children: this.tree };
      let walked = '';
      let restart: string | null = null;

      for (const segment of segments) {
        if (node.kind === 'symlink') {
          // An intermediate symlink: splice its target in and start over.
          const rewritten = this.#rewriteThroughLink(node, walked, current);
          if (!rewritten.ok) return rewritten;
          restart = rewritten.value;
          break;
        }
        if (node.kind !== 'directory') {
          return err(notFound(joinPath(walked, segment)));
        }

        const children: Readonly<Record<string, FsNodeSpec>> = node.children ?? {};
        const next: FsNodeSpec | undefined = children[segment];
        if (next === undefined) return err(notFound(joinPath(walked, segment)));

        node = next;
        walked = joinPath(walked === '' ? '/' : walked, segment);
      }

      if (restart !== null) {
        if (visitedLinks.has(restart) || ++hops > MAX_SYMLINK_DEPTH) {
          return err(symlinkLoop(path));
        }
        visitedLinks.add(restart);
        current = restart;
        continue;
      }

      // The final component may itself be a link; resolve it too.
      if (node.kind === 'symlink') {
        const target = resolveTarget(node.target, parentPath(walked === '' ? '/' : walked));
        if (visitedLinks.has(target) || ++hops > MAX_SYMLINK_DEPTH) {
          return err(symlinkLoop(path));
        }
        visitedLinks.add(target);
        current = target;
        continue;
      }

      return ok({ node, realPath: walked === '' ? '/' : walked });
    }
  }

  /** Replace the link portion of `fullPath` with the link's target. */
  #rewriteThroughLink(
    link: FsNodeSpec & { kind: 'symlink' },
    linkPath: string,
    fullPath: string,
  ): Result<string, AppError> {
    const target = resolveTarget(link.target, parentPath(linkPath === '' ? '/' : linkPath));
    const remainder = pathSegments(fullPath).slice(pathSegments(linkPath).length);
    return ok(joinPath(target, ...remainder));
  }
}

/** Resolve a link target against the directory containing the link. */
function resolveTarget(target: string, linkParent: string): string {
  return isAbsolutePath(target) ? normalizePath(target) : joinPath(linkParent, target);
}

function notFound(path: string): AppError {
  return new AppError(`No such path: ${path}`, {
    code: 'PATH_NOT_FOUND',
    userMessage: 'That location no longer exists.',
    context: { path },
  });
}

function symlinkLoop(path: string): AppError {
  return new AppError(`Symlink loop or excessive depth resolving: ${path}`, {
    code: 'SYMLINK_LOOP',
    userMessage: 'That location points back at itself, so Luman stopped following it.',
    context: { path },
  });
}

function toEntry(path: string, node: FsNodeSpec): FsEntry {
  return {
    path,
    kind: kindOf(node),
    sizeBytes: node.kind === 'file' ? (node.sizeBytes ?? 0) : 0,
    modifiedAt: node.modifiedAt ?? FIXTURE_MODIFIED_AT,
    unreadable:
      node.kind === 'file' || node.kind === 'directory' ? node.unreadable === true : false,
  };
}

function kindOf(node: FsNodeSpec): FsEntryKind {
  switch (node.kind) {
    case 'file':
      return 'file';
    case 'directory':
      return 'directory';
    case 'symlink':
      return 'symlink';
    default:
      return 'other';
  }
}
