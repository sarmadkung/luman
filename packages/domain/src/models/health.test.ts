import { describe, it, expect } from 'vitest';
import { computeHealthScore } from './health';

const GB = 1024 ** 3;

/** Build an input with a given free fraction and reclaimable fraction. */
function input(freeFraction: number, reclaimableFraction = 0) {
  const totalBytes = 1000 * GB;
  return {
    totalBytes,
    freeBytes: totalBytes * freeFraction,
    reclaimableBytes: totalBytes * reclaimableFraction,
  };
}

describe('computeHealthScore', () => {
  it('scores a nearly empty disk at the top of the range', () => {
    expect(computeHealthScore(input(1)).score).toBe(100);
  });

  it('scores a full but clutter-free disk at the cleanliness floor', () => {
    // No free space at all still earns the full 20 cleanliness points.
    expect(computeHealthScore(input(0, 0)).score).toBe(20);
  });

  it('scores a full disk that is also full of clutter at zero', () => {
    expect(computeHealthScore(input(0, 1)).score).toBe(0);
  });

  it('weights free space at 80% and cleanliness at 20%', () => {
    // free 0.5, reclaimable 0 -> (0.5*100*0.8) + (1*100*0.2) = 40 + 20 = 60
    expect(computeHealthScore(input(0.5, 0)).score).toBe(60);
    // free 0.5, reclaimable 0.5 -> 40 + (0.5*100*0.2) = 40 + 10 = 50
    expect(computeHealthScore(input(0.5, 0.5)).score).toBe(50);
  });

  it('bands a score of 80 or more as healthy', () => {
    const result = computeHealthScore(input(0.75, 0));
    expect(result.score).toBe(80);
    expect(result.band).toBe('healthy');
  });

  it('bands a score just below 80 as attention', () => {
    const result = computeHealthScore(input(0.74, 0));
    expect(result.score).toBe(79);
    expect(result.band).toBe('attention');
  });

  it('bands a score of exactly 60 as attention', () => {
    expect(computeHealthScore(input(0.5, 0)).band).toBe('attention');
  });

  it('bands a score just below 60 as low', () => {
    const result = computeHealthScore(input(0.48, 0));
    expect(result.score).toBe(58);
    expect(result.band).toBe('low');
  });

  it('returns a zero low score rather than dividing by zero', () => {
    const result = computeHealthScore({ totalBytes: 0, freeBytes: 0, reclaimableBytes: 0 });
    expect(result.score).toBe(0);
    expect(result.band).toBe('low');
  });

  it('clamps nonsensical input into the 0-100 range', () => {
    const total = 100 * GB;
    const result = computeHealthScore({
      totalBytes: total,
      freeBytes: total * 2,
      reclaimableBytes: -total,
    });
    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.score).toBeGreaterThanOrEqual(0);
  });

  it('never claims hardware-level health it cannot observe', () => {
    for (const f of [0, 0.3, 0.6, 0.9, 1]) {
      expect(computeHealthScore(input(f)).description).not.toMatch(/sector/i);
    }
  });

  it('describes each band in plain language', () => {
    expect(computeHealthScore(input(0.9)).description).toBe('Plenty of free space.');
    expect(computeHealthScore(input(0.6)).description).toBe('Free space is getting tight.');
    expect(computeHealthScore(input(0.1)).description).toBe('Very little free space left.');
  });
});
