/** Where a scan is in its lifecycle. */
export type ScanPhase = 'queued' | 'enumerating' | 'analyzing' | 'finalizing';

/** A progress sample emitted while a scan runs. */
export interface ScanProgress {
  readonly phase: ScanPhase;
  readonly itemsSeen: number;
  readonly bytesSeen: number;
  /** Path currently being processed, or null between items. */
  readonly currentPath: string | null;
  /**
   * Completion in the range 0–1, or **null when the total is not yet known**.
   *
   * A scan cannot know its total up front — enumeration discovers the work as
   * it goes. Unknown must be `null` and never `0`, because `0` renders as a
   * progress bar sitting at the start, which reads as "stalled" rather than
   * "still counting". The UI shows an indeterminate indicator for null.
   */
  readonly fraction: number | null;
}

/**
 * Derive `fraction` from a running count and a total that may not be known.
 *
 * Returns null — meaning indeterminate — whenever the total cannot support a
 * meaningful ratio: not yet known, non-positive, or non-finite. A zero total is
 * *not* treated as "100% complete"; nothing is known to be done, so nothing is
 * claimed. Finite results are clamped to 0–1 so an over-count late in a scan
 * cannot push a progress bar past its end.
 */
export function computeFraction(completed: number, total: number | null): number | null {
  if (total === null || !Number.isFinite(total) || total <= 0) return null;
  if (!Number.isFinite(completed)) return null;
  return Math.max(0, Math.min(1, completed / total));
}
