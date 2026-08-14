/**
 * Redaction for log output.
 *
 * A log line must never carry the macOS username or a full protected path.
 * Logs get pasted into issues, attached to bug reports, and read by whoever
 * opens the file — a path is identifying data, and a path inside `~/Documents`
 * is doubly so because it also reveals what the user keeps there.
 *
 * Everything here is pure and **never throws**. A malformed path must not take
 * down the caller: logging is the thing you reach for when something has
 * already gone wrong, so it is the worst possible place for a second failure.
 */

/** What a redacted home-relative path collapses to. */
const HOME_MARKER = '~';
const ELLIPSIS = '…';

/** Matches `/Users/<name>` and `/home/<name>`, capturing the rest. */
const USER_HOME_PATTERN = /^\/(?:Users|home)\/([^/]+)(\/.*)?$/;

/**
 * Reduce a path to a stable, non-identifying form.
 *
 * - `/Users/alice/Documents/taxes.pdf` → `~/…/taxes.pdf`
 * - `~/Documents/taxes.pdf`            → `~/…/taxes.pdf`
 * - `/Users/alice`                     → `~`
 * - `/System/Library/Caches`           → unchanged (no user data in the path)
 * - `C:\Users\alice\file.txt`          → unchanged (not a POSIX path)
 *
 * The basename survives because it is what makes a log line useful, and a
 * filename alone does not identify a person the way a full path does. The
 * intermediate directories are what reveal the user's structure, so they go.
 */
export function redactPath(value: string): string {
  try {
    if (typeof value !== 'string' || value.length === 0) return value;

    if (value.startsWith(`${HOME_MARKER}/`)) {
      return collapse(HOME_MARKER, value.slice(2).split('/'));
    }
    if (value === HOME_MARKER) return HOME_MARKER;

    const match = USER_HOME_PATTERN.exec(value);
    if (match === null) return value; // Not under a home directory — leave it.

    const remainder = match[2];
    if (remainder === undefined || remainder === '/') return HOME_MARKER;
    return collapse(HOME_MARKER, remainder.slice(1).split('/'));
  } catch {
    // Redaction failing must never break logging.
    return '<unprintable path>';
  }
}

/** `~` + `…` + basename, skipping the ellipsis when there is nothing to hide. */
function collapse(prefix: string, segments: readonly string[]): string {
  const parts = segments.filter((segment) => segment.length > 0);
  const basename = parts[parts.length - 1];
  if (basename === undefined) return prefix;
  if (parts.length === 1) return `${prefix}/${basename}`;
  return `${prefix}/${ELLIPSIS}/${basename}`;
}

/**
 * Redact every string in a log field bag, recursively.
 *
 * Applied to values that *look* like paths — a leading `/` or `~/`. Fields are
 * arbitrary, so this walks nested objects and arrays; a path buried three
 * levels down in an error context leaks exactly as much as a top-level one.
 *
 * Depth is bounded: a cyclic or pathologically nested object must terminate.
 */
export function redactFields(fields: unknown, depth = 0): unknown {
  if (depth > 6) return '<too deep>';

  try {
    if (typeof fields === 'string') return looksLikePath(fields) ? redactPath(fields) : fields;
    if (Array.isArray(fields)) return fields.map((item) => redactFields(item, depth + 1));
    if (fields instanceof Error) {
      return { name: fields.name, message: redactFields(fields.message, depth + 1) };
    }
    if (fields !== null && typeof fields === 'object') {
      return Object.fromEntries(
        Object.entries(fields as Record<string, unknown>).map(([key, value]) => [
          key,
          redactFields(value, depth + 1),
        ]),
      );
    }
    return fields;
  } catch {
    return '<unprintable>';
  }
}

/** Whether a string is shaped like a POSIX path worth redacting. */
function looksLikePath(value: string): boolean {
  return value.startsWith('/') || value.startsWith('~/');
}
