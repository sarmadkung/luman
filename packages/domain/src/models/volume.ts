import type { VolumeId } from './ids';

/**
 * A mounted volume as reported by the platform. Pure data: obtaining these
 * numbers is infrastructure's job (INF-005), and reading real volume statistics
 * is gated behind an explicitly-off flag until the developer verifies it.
 */
export interface VolumeInfo {
  readonly id: VolumeId;
  /** Display name, e.g. "Macintosh HD". Never a path. */
  readonly name: string;
  readonly totalBytes: number;
  readonly freeBytes: number;
  /**
   * Reported rather than derived. On macOS `total - free` does not equal used:
   * purgeable space is counted free while still occupying blocks, so computing
   * this would disagree with Finder.
   */
  readonly usedBytes: number;
  /** True for the volume the system booted from. */
  readonly isBootVolume: boolean;
}
