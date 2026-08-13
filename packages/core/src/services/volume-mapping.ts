import type { VolumeId, VolumeInfo } from '@luman/domain';
import type { StorageOverview } from './types';

/**
 * Raw capacity figures as the native command reports them.
 *
 * Mirrors `RawVolume` in `apps/desktop/src-tauri/src/volumes.rs`. Kept raw on
 * purpose: the native side reports, this module interprets, and keeping the
 * interpretation in TypeScript means it is unit-testable without a bridge.
 */
export interface RawVolume {
  readonly id: string;
  readonly name: string;
  readonly totalBytes: number;
  readonly availableBytes: number;
  readonly isBootVolume: boolean;
}

/**
 * Whether a volume's reported figures can be trusted.
 *
 * `freeBytes > totalBytes` is not hypothetical on macOS: APFS containers share
 * space between volumes and purgeable space is counted as available, so a
 * volume can report more free than it has total. Deriving `used = total - free`
 * from that produces a negative number, which then renders as a nonsense
 * dashboard. We treat the whole reading as unknown instead of publishing a
 * figure we know is wrong.
 */
export function isTrustworthy(raw: RawVolume): boolean {
  return (
    Number.isFinite(raw.totalBytes) &&
    Number.isFinite(raw.availableBytes) &&
    raw.totalBytes > 0 &&
    raw.availableBytes >= 0 &&
    raw.availableBytes <= raw.totalBytes
  );
}

/**
 * Convert raw figures to a `VolumeInfo`.
 *
 * `usedBytes` is derived here rather than reported by the OS, and is clamped to
 * zero for an untrustworthy reading — never negative. When the reading cannot
 * be trusted, capacity fields are reported as `0`, which the UI shows as
 * "unknown" rather than as an empty disk.
 */
export function toVolumeInfo(raw: RawVolume): VolumeInfo {
  const trustworthy = isTrustworthy(raw);
  return {
    // Branding is type-level only; this is the boundary that mints the id.
    id: raw.id as VolumeId,
    name: raw.name.length > 0 ? raw.name : raw.id,
    totalBytes: trustworthy ? raw.totalBytes : 0,
    freeBytes: trustworthy ? raw.availableBytes : 0,
    usedBytes: trustworthy ? raw.totalBytes - raw.availableBytes : 0,
    isBootVolume: raw.isBootVolume,
  };
}

/**
 * Project a volume onto the `StorageOverview` the dashboard already consumes.
 *
 * `reclaimableBytes` is always `0` here: knowing what can be reclaimed requires
 * scan data, which arrives in Sprint 05. Reporting a guess would put a number
 * in front of the user that no scan supports.
 */
export function toStorageOverview(volume: VolumeInfo): StorageOverview {
  return {
    totalBytes: volume.totalBytes,
    usedBytes: volume.usedBytes,
    freeBytes: volume.freeBytes,
    reclaimableBytes: 0,
    volume: volume.id,
  };
}

/** The boot volume from a list, or the first entry, or null when empty. */
export function pickBootVolume(volumes: readonly VolumeInfo[]): VolumeInfo | null {
  return volumes.find((volume) => volume.isBootVolume) ?? volumes[0] ?? null;
}
