import { computeHealthScore, type StorageHealthInput } from '@luman/domain';
import { formatBytes } from '@luman/shared';

export type HeroState = 'loading' | 'error' | 'no-data' | 'ready';

export interface HeroCopy {
  readonly headline: string;
  readonly subhead: string;
}

/**
 * Derives the hero's copy from live figures. The mockup hardcoded a single
 * healthy message; the real dashboard must speak for every state it can be in.
 */
export function heroCopy(state: HeroState, overview: StorageHealthInput | null): HeroCopy {
  if (state === 'loading') {
    return {
      headline: 'Checking your storage…',
      subhead: 'One moment while we read the latest figures.',
    };
  }
  if (state === 'error') {
    return {
      headline: 'Storage status unavailable',
      subhead: "We couldn't read your storage. Try again.",
    };
  }
  if (state === 'no-data' || overview == null) {
    return {
      headline: 'Ready when you are',
      subhead: 'Run a Smart Scan to see what you can safely reclaim.',
    };
  }

  const reclaimable = formatBytes(overview.reclaimableBytes);
  const { band } = computeHealthScore(overview);

  if (band === 'healthy') {
    return {
      headline: 'Storage is healthy',
      subhead: `Your Mac is optimized. ${reclaimable} can be safely reclaimed.`,
    };
  }
  if (band === 'attention') {
    return {
      headline: 'Storage needs attention',
      subhead: `${reclaimable} can be reclaimed. A Smart Scan will find more.`,
    };
  }
  return {
    headline: 'Storage is running low',
    subhead: `Only ${formatBytes(overview.freeBytes)} free. Reclaim ${reclaimable} now.`,
  };
}
