/**
 * POSIX path primitives.
 *
 * Pure string work — nothing here touches a filesystem, so it is safe to call
 * anywhere. Symlinks are explicitly *not* resolved by these helpers: that needs
 * I/O and belongs to `FileSystem.realPath`. See `PathGuard` for why both steps
 * are required before a path can be trusted.
 */

/** True when the path starts at the root. */
export function isAbsolutePath(path: string): boolean {
  return path.startsWith('/');
}

/** Split into non-empty segments, ignoring duplicate and trailing slashes. */
export function pathSegments(path: string): readonly string[] {
  return path.split('/').filter((segment) => segment.length > 0);
}

/**
 * Lexically normalise a path: collapse duplicate slashes, drop `.`, and resolve
 * `..` against the preceding segment.
 *
 * "Lexically" is the important word. `a/b/../c` becomes `a/c` by text alone —
 * if `a/b` is a symlink pointing elsewhere, the true answer differs. That is
 * why `PathGuard` resolves symlinks as a separate step rather than trusting
 * this result.
 *
 * A `..` that would climb above the root is dropped rather than escaping, so
 * `/../../etc` normalises to `/etc`. Relative paths keep leading `..` segments,
 * since there is nothing to resolve them against yet.
 */
export function normalizePath(path: string): string {
  const absolute = isAbsolutePath(path);
  const resolved: string[] = [];

  for (const segment of pathSegments(path)) {
    if (segment === '.') continue;
    if (segment === '..') {
      const previous = resolved[resolved.length - 1];
      if (previous !== undefined && previous !== '..') {
        resolved.pop();
      } else if (!absolute) {
        // Nothing to climb over yet, and no root to stop at.
        resolved.push('..');
      }
      // Absolute paths silently clamp at the root.
      continue;
    }
    resolved.push(segment);
  }

  const joined = resolved.join('/');
  if (absolute) return `/${joined}`;
  return joined.length > 0 ? joined : '.';
}

/** Join segments and normalise the result. */
export function joinPath(...parts: readonly string[]): string {
  const joined = parts.filter((part) => part.length > 0).join('/');
  return normalizePath(joined);
}

/** The parent of a path, or the path itself when it is already the root. */
export function parentPath(path: string): string {
  const normalized = normalizePath(path);
  if (normalized === '/') return '/';
  const segments = [...pathSegments(normalized)];
  segments.pop();
  return isAbsolutePath(normalized) ? `/${segments.join('/')}` : segments.join('/') || '.';
}

/** The final segment of a path, or '' for the root. */
export function baseName(path: string): string {
  const segments = pathSegments(normalizePath(path));
  return segments[segments.length - 1] ?? '';
}

/**
 * Whether `candidate` is `base` or sits beneath it, compared **segment-wise**.
 *
 * Segment comparison is what stops `/Systemic` matching `/System`, which a
 * `startsWith` check would wrongly accept. Both paths are normalised first, but
 * neither is symlink-resolved — pass real paths if the answer must be
 * trustworthy.
 */
export function isWithin(candidate: string, base: string): boolean {
  const candidateSegments = pathSegments(normalizePath(candidate));
  const baseSegments = pathSegments(normalizePath(base));
  if (baseSegments.length === 0) return true; // The root contains everything.
  if (candidateSegments.length < baseSegments.length) return false;
  return baseSegments.every((segment, index) => candidateSegments[index] === segment);
}
