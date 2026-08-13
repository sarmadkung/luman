import type { Brand, Id } from '@luman/shared';

/**
 * Branded aliases for the identifiers that are easiest to confuse at a call
 * site. `Finding` carries both its own id and the id of the scan that produced
 * it; `VolumeInfo` ids flow through the same service signatures. Branding makes
 * passing one where another is expected a compile error rather than a silent
 * lookup failure.
 *
 * These are still plain strings at runtime — `Brand` is type-level only, so an
 * `Id` from `createId()` needs a cast at the boundary that mints it, and
 * nowhere else.
 */
export type ScanId = Brand<Id, 'ScanId'>;
export type FindingId = Brand<Id, 'FindingId'>;
export type VolumeId = Brand<Id, 'VolumeId'>;
