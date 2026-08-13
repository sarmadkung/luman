import { describe, expect, it } from 'vitest';
import { computeFraction } from './progress';

describe('computeFraction', () => {
  it('reports an ordinary ratio', () => {
    expect(computeFraction(25, 100)).toBe(0.25);
  });

  it('is null when the total is not yet known', () => {
    expect(computeFraction(25, null)).toBeNull();
  });

  it('is null for a zero total rather than claiming completion', () => {
    // A zero total means nothing is known to be done. Returning 1 here would
    // render a full progress bar for a scan that has not started.
    expect(computeFraction(0, 0)).toBeNull();
    expect(computeFraction(10, 0)).toBeNull();
  });

  it('is null for a negative or non-finite total', () => {
    expect(computeFraction(5, -1)).toBeNull();
    expect(computeFraction(5, Number.NaN)).toBeNull();
    expect(computeFraction(5, Number.POSITIVE_INFINITY)).toBeNull();
  });

  it('is null when the completed count is non-finite', () => {
    expect(computeFraction(Number.NaN, 100)).toBeNull();
    expect(computeFraction(Number.POSITIVE_INFINITY, 100)).toBeNull();
  });

  it('clamps an over-count to 1 so a bar cannot exceed its end', () => {
    expect(computeFraction(150, 100)).toBe(1);
  });

  it('clamps a negative count to 0', () => {
    expect(computeFraction(-5, 100)).toBe(0);
  });

  it('returns exactly 0 and 1 at the boundaries', () => {
    expect(computeFraction(0, 100)).toBe(0);
    expect(computeFraction(100, 100)).toBe(1);
  });
});
