import { describe, expect, it } from 'vitest';
import {
  isTrustworthy,
  pickBootVolume,
  toStorageOverview,
  toVolumeInfo,
  type RawVolume,
} from './volume-mapping';

const raw = (overrides: Partial<RawVolume> = {}): RawVolume => ({
  id: '/',
  name: 'Macintosh HD',
  totalBytes: 1000,
  availableBytes: 400,
  isBootVolume: true,
  ...overrides,
});

describe('isTrustworthy', () => {
  it('accepts an ordinary reading', () => {
    expect(isTrustworthy(raw())).toBe(true);
  });

  it('rejects a zero total — nothing is known', () => {
    expect(isTrustworthy(raw({ totalBytes: 0 }))).toBe(false);
  });

  it('rejects free exceeding total', () => {
    // Real on macOS: APFS containers share space and purgeable counts as free.
    expect(isTrustworthy(raw({ totalBytes: 1000, availableBytes: 1200 }))).toBe(false);
  });

  it('rejects negative and non-finite figures', () => {
    expect(isTrustworthy(raw({ totalBytes: -1 }))).toBe(false);
    expect(isTrustworthy(raw({ availableBytes: -1 }))).toBe(false);
    expect(isTrustworthy(raw({ totalBytes: Number.NaN }))).toBe(false);
    expect(isTrustworthy(raw({ availableBytes: Number.POSITIVE_INFINITY }))).toBe(false);
  });

  it('accepts a completely full volume', () => {
    expect(isTrustworthy(raw({ availableBytes: 0 }))).toBe(true);
  });
});

describe('toVolumeInfo', () => {
  it('derives usedBytes from total minus available', () => {
    const volume = toVolumeInfo(raw());
    expect(volume.totalBytes).toBe(1000);
    expect(volume.freeBytes).toBe(400);
    expect(volume.usedBytes).toBe(600);
  });

  it('reports zeros — never a negative used — when free exceeds total', () => {
    const volume = toVolumeInfo(raw({ totalBytes: 1000, availableBytes: 1200 }));
    expect(volume.usedBytes).toBe(0);
    expect(volume.usedBytes).toBeGreaterThanOrEqual(0);
    expect(volume.totalBytes).toBe(0);
    expect(volume.freeBytes).toBe(0);
  });

  it('reports zeros for a zero total rather than an empty disk', () => {
    const volume = toVolumeInfo(raw({ totalBytes: 0, availableBytes: 0 }));
    expect(volume.totalBytes).toBe(0);
    expect(volume.usedBytes).toBe(0);
  });

  it('falls back to the id when the name is empty', () => {
    expect(toVolumeInfo(raw({ name: '', id: '/Volumes/Ext' })).name).toBe('/Volumes/Ext');
  });

  it('carries the boot flag through', () => {
    expect(toVolumeInfo(raw({ isBootVolume: false })).isBootVolume).toBe(false);
  });
});

describe('toStorageOverview', () => {
  it('projects capacity onto the dashboard shape', () => {
    const overview = toStorageOverview(toVolumeInfo(raw()));
    expect(overview).toEqual({
      totalBytes: 1000,
      usedBytes: 600,
      freeBytes: 400,
      reclaimableBytes: 0,
      volume: '/',
    });
  });

  it('always reports reclaimableBytes as 0 — no scan data exists yet', () => {
    // Guessing here would put an unsupported number in front of the user.
    expect(toStorageOverview(toVolumeInfo(raw())).reclaimableBytes).toBe(0);
  });
});

describe('pickBootVolume', () => {
  it('prefers the flagged boot volume', () => {
    const volumes = [
      toVolumeInfo(raw({ id: '/Volumes/Ext', isBootVolume: false })),
      toVolumeInfo(raw({ id: '/', isBootVolume: true })),
    ];
    expect(pickBootVolume(volumes)?.id).toBe('/');
  });

  it('falls back to the first volume when none is flagged', () => {
    const volumes = [toVolumeInfo(raw({ id: '/Volumes/Ext', isBootVolume: false }))];
    expect(pickBootVolume(volumes)?.id).toBe('/Volumes/Ext');
  });

  it('returns null for an empty list', () => {
    expect(pickBootVolume([])).toBeNull();
  });
});
