import type { VolumeInfo } from '@luman/domain';
import type { Result } from '@luman/shared';
import { ok } from '@luman/shared';
import type { AppError } from '../errors';

/**
 * Read-only reporting of mounted volumes.
 *
 * There is deliberately no mount, unmount, format, or rename method here.
 * Reporting capacity must not carry the ability to change a volume.
 *
 * Failures that are part of normal operation — a volume that vanished between
 * enumeration and query — come back as `Result`. A missing native bridge is
 * exceptional and throws.
 */
export interface VolumeService {
  /** Every mounted volume. Empty array when none can be read. */
  listVolumes(): Promise<Result<readonly VolumeInfo[], AppError>>;
  /** The volume the system booted from, or null when it cannot be identified. */
  getBootVolume(): Promise<Result<VolumeInfo | null, AppError>>;
}

/**
 * Sprint 04 stub. Both methods are read-only lookups, so they return the empty
 * answer rather than throwing — the shell renders an empty state instead of an
 * error. Real volume statistics arrive in INF-005, behind an off-by-default
 * flag.
 */
export class StubVolumeService implements VolumeService {
  async listVolumes(): Promise<Result<readonly VolumeInfo[], AppError>> {
    return ok([]);
  }
  async getBootVolume(): Promise<Result<VolumeInfo | null, AppError>> {
    return ok(null);
  }
}
