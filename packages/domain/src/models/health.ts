/**
 * Structural input for the health score. Deliberately NOT an import of
 * `StorageOverview`: that type lives in @luman/core, and core depends on
 * domain, not the reverse. A `StorageOverview` satisfies this shape
 * structurally, so callers pass one directly.
 */
export interface StorageHealthInput {
  readonly totalBytes: number;
  readonly freeBytes: number;
  readonly reclaimableBytes: number;
}

export type HealthBand = 'healthy' | 'attention' | 'low';

export interface StorageHealth {
  /** 0–100, where 100 is an empty, clutter-free disk. */
  readonly score: number;
  readonly band: HealthBand;
  /** One plain-language line. Never claims hardware-level knowledge. */
  readonly description: string;
}

const DESCRIPTIONS: Record<HealthBand, string> = {
  healthy: 'Plenty of free space.',
  attention: 'Free space is getting tight.',
  low: 'Very little free space left.',
};

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

/**
 * Free space dominates the score because it is what actually constrains the
 * user; reclaimable clutter penalises it mildly.
 *
 *   score = (freeRatio * 100 * 0.8) + ((1 - reclaimableRatio) * 100 * 0.2)
 *
 * A non-positive `totalBytes` means we know nothing, which is reported as the
 * worst case rather than as a division by zero.
 */
export function computeHealthScore(input: StorageHealthInput): StorageHealth {
  const { totalBytes, freeBytes, reclaimableBytes } = input;

  if (!Number.isFinite(totalBytes) || totalBytes <= 0) {
    return { score: 0, band: 'low', description: DESCRIPTIONS.low };
  }

  const freeRatio = clamp01(freeBytes / totalBytes);
  const reclaimableRatio = clamp01(reclaimableBytes / totalBytes);
  const raw = freeRatio * 100 * 0.8 + (1 - reclaimableRatio) * 100 * 0.2;
  const score = Math.max(0, Math.min(100, Math.round(raw)));

  const band: HealthBand = score >= 80 ? 'healthy' : score >= 60 ? 'attention' : 'low';
  return { score, band, description: DESCRIPTIONS[band] };
}
