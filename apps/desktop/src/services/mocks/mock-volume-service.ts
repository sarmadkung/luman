import type { VolumeId, VolumeInfo } from '@luman/domain';
import type { Result } from '@luman/shared';
import { err, ok } from '@luman/shared';
import { AppError, type VolumeService } from '@luman/core';

export interface MockVolumeOptions {
  /** Simulated latency in ms, so Loading states stay demonstrable. */
  readonly delayMs?: number;
  /** Force an error to exercise the Error state. */
  readonly failWith?: AppError;
  /** Return an empty list to exercise the Empty state. */
  readonly volumes?: readonly VolumeInfo[];
}

/**
 * Deterministic volumes.
 *
 * Figures are fixed literals — two runs are byte-identical. The boot volume's
 * numbers deliberately match `MockStorageService`'s `DEFAULT_OVERVIEW`, since
 * both can be on screen at once and must not contradict each other.
 */
export const MOCK_VOLUMES: readonly VolumeInfo[] = [
  {
    id: '/' as VolumeId,
    name: 'Macintosh HD',
    totalBytes: 494_384_795_648, // ~460 GB
    freeBytes: 138_143_795_648, // ~128 GB
    usedBytes: 356_241_000_000, // ~331 GB
    isBootVolume: true,
  },
  {
    id: '/Volumes/Example External' as VolumeId,
    name: 'Example External',
    totalBytes: 1_000_204_886_016, // ~931 GB
    freeBytes: 750_153_664_512,
    usedBytes: 250_051_221_504,
    isBootVolume: false,
  },
];

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Mock `VolumeService`. Every UI state is reachable by construction. */
export class MockVolumeService implements VolumeService {
  readonly #options: MockVolumeOptions;

  constructor(options: MockVolumeOptions = {}) {
    this.#options = options;
  }

  async listVolumes(): Promise<Result<readonly VolumeInfo[], AppError>> {
    await delay(this.#options.delayMs ?? 0);
    if (this.#options.failWith) return err(this.#options.failWith);
    return ok(this.#options.volumes ?? MOCK_VOLUMES);
  }

  async getBootVolume(): Promise<Result<VolumeInfo | null, AppError>> {
    const listed = await this.listVolumes();
    if (!listed.ok) return listed;
    return ok(listed.value.find((volume) => volume.isBootVolume) ?? null);
  }
}

/** The Error state, ready to drop into a test or a Sprint 06 story. */
export const volumeUnavailableError = (): AppError =>
  new AppError('Volume unavailable', {
    code: 'VOLUME_UNAVAILABLE',
    userMessage: 'Luman could not read that drive.',
  });
