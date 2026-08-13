import { isProtectedPath, findProtectingPattern } from '@luman/domain';
import type { Result } from '@luman/shared';
import { err, ok } from '@luman/shared';
import { AppError } from '../errors';
import type { FileSystem } from './file-system';
import { isAbsolutePath, isWithin, normalizePath } from './paths';

export interface PathGuardOptions {
  /**
   * Absolute paths the guard permits. A path must sit at or beneath one of
   * these. An empty list allows nothing — default-closed, so a misconfigured
   * guard blocks rather than opens.
   */
  readonly allowedRoots: readonly string[];
  /**
   * The user's home directory, used to expand the `~` protected patterns.
   * Injected rather than read from the environment so tests never depend on the
   * developer's machine (AGENTS.md §6.8).
   */
  readonly homeDir: string;
}

/**
 * The single gate every filesystem path passes through before anything reads it.
 *
 * ## Semantics (INF-007 and INF-012 depend on these exactly)
 *
 * A path is admitted only if **all** of the following hold, checked in order:
 *
 * 1. It is absolute. Relative paths are rejected outright — there is no
 *    ambient working directory to resolve them against, and guessing one is
 *    how a guard gets bypassed.
 * 2. Its *lexical* normalisation is inside an allowed root and is not
 *    protected. This is a cheap pre-check that rejects obvious offenders
 *    before any I/O.
 * 3. Its *real* path — symlinks fully resolved — is inside an allowed root and
 *    is not protected. This is the check that actually counts.
 *
 * Both 2 and 3 are required, and 3 alone is not enough: a link may be missing
 * or unreadable, and a guard that only inspected real paths would have nothing
 * to say about a path it could not resolve.
 *
 * **Resolve before comparing.** `~/Documents/../Downloads` is Downloads, not
 * Documents. Step 2 normalises `..` textually; step 3 then follows symlinks, so
 * a link inside `~/projects` pointing at `~/Documents` is caught even though
 * nothing about the requested path looks protected.
 *
 * **Rejection never throws past the boundary.** Every refusal is an
 * `Err(AppError)` with code `PATH_NOT_ALLOWED`, so a caller cannot mistake a
 * thrown exception for permission. Resolution failures (missing path, symlink
 * loop) propagate with their own codes, and are equally not permission.
 *
 * **Protected beats allowed.** A protected location inside an allowed root is
 * still refused — a cache directory under `~/Library` does not become safe by
 * virtue of `~/Library` being scannable.
 */
export class PathGuard {
  private readonly fs: FileSystem;
  private readonly allowedRoots: readonly string[];
  private readonly homeDir: string;

  constructor(fs: FileSystem, options: PathGuardOptions) {
    this.fs = fs;
    this.allowedRoots = options.allowedRoots.map(normalizePath);
    this.homeDir = normalizePath(options.homeDir);
  }

  /**
   * Admit a path, returning its resolved real path.
   *
   * The returned string is the canonical location — callers should use it
   * rather than the path they passed in, so downstream comparisons operate on
   * the same resolved form the guard approved.
   */
  async resolve(path: string): Promise<Result<string, AppError>> {
    if (!isAbsolutePath(path)) {
      return err(this.refuse(path, 'relative-path', 'That location could not be understood.'));
    }

    const lexical = normalizePath(path);
    const lexicalVerdict = this.inspect(lexical);
    if (lexicalVerdict !== null) return err(lexicalVerdict);

    const real = await this.fs.realPath(lexical);
    if (!real.ok) return real;

    const realVerdict = this.inspect(real.value);
    if (realVerdict !== null) return err(realVerdict);

    return ok(real.value);
  }

  /** Whether a path would be admitted, without surfacing the reason. */
  async isAllowed(path: string): Promise<boolean> {
    return (await this.resolve(path)).ok;
  }

  /** Returns the refusal for a path, or null when it passes both checks. */
  private inspect(path: string): AppError | null {
    if (!this.allowedRoots.some((root) => isWithin(path, root))) {
      return this.refuse(
        path,
        'outside-allowed-roots',
        'That location is outside the area Luman is allowed to look at.',
      );
    }
    if (isProtectedPath(path, this.homeDir)) {
      const pattern = findProtectingPattern(path, this.homeDir);
      return this.refuse(
        path,
        'protected-path',
        pattern === null
          ? 'Luman does not touch that location.'
          : `Luman does not touch ${pattern.covers}.`,
      );
    }
    return null;
  }

  private refuse(path: string, reason: string, userMessage: string): AppError {
    return new AppError(`Path not allowed (${reason}): ${path}`, {
      code: 'PATH_NOT_ALLOWED',
      userMessage,
      context: { path, reason },
    });
  }
}
