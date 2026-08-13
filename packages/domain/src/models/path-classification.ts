/**
 * Classification of a **location**.
 *
 * Deliberately distinct from `SafetyLevel` in `./finding`, despite both having
 * `'safe'` and `'caution'`. `SafetyLevel` classifies a *finding* — how risky
 * deleting that item is. `PathClassification` classifies a *place*. A finding
 * may be `safe` while sitting inside a protected location, in which case the
 * location wins and the finding is not actionable. `findings.safety` is a real
 * database column (mapped in INF-010); this type is not stored.
 */
export type PathClassification = 'safe' | 'caution' | 'protected';

/**
 * How a pattern is compared against a resolved path.
 *
 * `prefix` — the pattern and everything beneath it is protected.
 * `exact`  — only the location itself, not its contents.
 */
export type PathMatchMode = 'exact' | 'prefix';

export interface ProtectedPathPattern {
  /**
   * Relative pattern. A leading `~` denotes the home directory and is expanded
   * by the caller-supplied home path. Storing these relative keeps the
   * developer's username out of the source (docs/05_BUSINESS_RULES.md).
   */
  readonly pattern: string;
  readonly matchMode: PathMatchMode;
  /** Plain-language description, for explaining a refusal to the user. */
  readonly covers: string;
}

/**
 * The canonical protected-path list, transcribed from
 * `docs/05_BUSINESS_RULES.md` §Protected paths. Eleven entries — do not add,
 * remove, or reorder without changing that document first.
 *
 * `~` is the one `exact` entry. The table describes it as "the home directory
 * itself, as a target": treating it as a prefix would mark the *entire* home
 * directory protected and make every other `~/…` row redundant, which is
 * plainly not the intent of a list that then enumerates seven subdirectories
 * of home.
 */
export const PROTECTED_PATH_PATTERNS: readonly ProtectedPathPattern[] = [
  { pattern: '~', matchMode: 'exact', covers: 'The home directory itself, as a target' },
  { pattern: '~/Desktop', matchMode: 'prefix', covers: 'Desktop' },
  { pattern: '~/Documents', matchMode: 'prefix', covers: 'Documents' },
  { pattern: '~/Downloads', matchMode: 'prefix', covers: 'Downloads' },
  {
    pattern: '~/Pictures',
    matchMode: 'prefix',
    covers: 'Pictures, including the Photos library',
  },
  { pattern: '~/Movies', matchMode: 'prefix', covers: 'Movies' },
  { pattern: '~/Music', matchMode: 'prefix', covers: 'Music' },
  {
    pattern: '~/Library',
    matchMode: 'prefix',
    covers: 'User library — preferences, containers, app state',
  },
  { pattern: '/System', matchMode: 'prefix', covers: 'System volume' },
  { pattern: '/Library', matchMode: 'prefix', covers: 'System-wide library' },
  { pattern: '/private', matchMode: 'prefix', covers: '/etc, /var, /tmp via the real path' },
] as const;

/** Split a POSIX path into segments, ignoring empty and trailing-slash noise. */
function segments(path: string): readonly string[] {
  return path.split('/').filter((s) => s.length > 0);
}

/** True when `candidate` is `base` or sits beneath it, compared segment-wise. */
function isAtOrBeneath(candidate: readonly string[], base: readonly string[]): boolean {
  if (candidate.length < base.length) return false;
  return base.every((seg, i) => candidate[i] === seg);
}

/**
 * Expand a pattern's leading `~` against a home directory.
 *
 * Pure string work — this performs no I/O and does not consult the environment.
 * The home path is supplied by the caller precisely so that domain stays free
 * of platform access.
 */
export function expandProtectedPath(pattern: string, homeDir: string): string {
  if (pattern === '~') return homeDir;
  if (pattern.startsWith('~/')) return `${homeDir}/${pattern.slice(2)}`;
  return pattern;
}

/**
 * Whether a **already-resolved** absolute path is protected.
 *
 * This function does not resolve anything: it cannot, without I/O. Callers must
 * normalise `..` and follow symlinks first (INF-004's `PathGuard` owns that) —
 * otherwise `~/Documents/../Downloads` would be compared literally and classify
 * as Documents. As a backstop, a path still containing a `..` segment is
 * reported protected rather than trusted, because an unresolved path is one we
 * cannot make a safe claim about and the more cautious answer wins.
 */
export function isProtectedPath(resolvedPath: string, homeDir: string): boolean {
  const candidate = segments(resolvedPath);
  if (candidate.includes('..')) return true;

  return PROTECTED_PATH_PATTERNS.some((entry) => {
    const base = segments(expandProtectedPath(entry.pattern, homeDir));
    if (base.length === 0) return false;
    return entry.matchMode === 'exact'
      ? candidate.length === base.length && isAtOrBeneath(candidate, base)
      : isAtOrBeneath(candidate, base);
  });
}

/**
 * The pattern responsible for protecting a path, for explaining the refusal.
 * Returns null when the path is not protected by an enumerated pattern — note
 * that an unresolved `..` path is protected without a matching pattern.
 */
export function findProtectingPattern(
  resolvedPath: string,
  homeDir: string,
): ProtectedPathPattern | null {
  const candidate = segments(resolvedPath);

  return (
    PROTECTED_PATH_PATTERNS.find((entry) => {
      const base = segments(expandProtectedPath(entry.pattern, homeDir));
      if (base.length === 0) return false;
      return entry.matchMode === 'exact'
        ? candidate.length === base.length && isAtOrBeneath(candidate, base)
        : isAtOrBeneath(candidate, base);
    }) ?? null
  );
}
