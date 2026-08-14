import { describe, expect, it, vi } from 'vitest';
import type { ScanProgress } from '@luman/domain';
import { PROGRESS_THROTTLE_MS, ProgressReporter } from './progress-reporter';

/** A reporter with a hand-driven clock, so throttling is deterministic. */
function reporter(throttleMs = PROGRESS_THROTTLE_MS) {
  const emitted: ScanProgress[] = [];
  let clock = 0;
  const subject = new ProgressReporter({
    emit: (progress) => emitted.push(progress),
    now: () => clock,
    throttleMs,
  });
  return {
    subject,
    emitted,
    tick: (ms: number) => {
      clock += ms;
    },
  };
}

describe('counters', () => {
  it('accumulates items and bytes', () => {
    const { subject, tick } = reporter();
    subject.advance({ items: 2, bytes: 100 });
    tick(200);
    subject.advance({ items: 3, bytes: 50 });

    expect(subject.snapshot().itemsSeen).toBe(5);
    expect(subject.snapshot().bytesSeen).toBe(150);
  });

  it('never decreases, even if a plugin reports a negative delta', () => {
    // A progress bar going backwards reads as a bug to the user.
    const { subject } = reporter();
    subject.advance({ items: 5, bytes: 100 });
    subject.advance({ items: -3, bytes: -50 });

    expect(subject.snapshot().itemsSeen).toBe(5);
    expect(subject.snapshot().bytesSeen).toBe(100);
  });

  it('is non-decreasing across a long run of updates', () => {
    const { subject, emitted, tick } = reporter(0);
    for (let i = 0; i < 50; i++) {
      subject.advance({ items: 1, bytes: i });
      tick(1);
    }

    const items = emitted.map((e) => e.itemsSeen);
    const bytes = emitted.map((e) => e.bytesSeen);
    expect(items).toEqual([...items].sort((a, b) => a - b));
    expect(bytes).toEqual([...bytes].sort((a, b) => a - b));
  });
});

describe('fraction', () => {
  it('is null until a total is known', () => {
    const { subject } = reporter();
    subject.advance({ items: 10 });
    expect(subject.snapshot().fraction).toBeNull();
  });

  it('is never fabricated from items seen so far', () => {
    // A denominator that grows with discovery makes the bar jump backwards.
    const { subject } = reporter();
    subject.advance({ items: 100 });
    expect(subject.snapshot().fraction).toBeNull();
  });

  it('is computed once a total is set', () => {
    const { subject } = reporter();
    subject.setTotal(4);
    subject.advance({ items: 1 });
    expect(subject.snapshot().fraction).toBe(0.25);
  });

  it('never exceeds 1, even past the total', () => {
    const { subject } = reporter();
    subject.setTotal(2);
    subject.advance({ items: 10 });
    expect(subject.snapshot().fraction).toBe(1);
  });

  it('stays within [0, 1] across every emission', () => {
    const { subject, emitted, tick } = reporter(0);
    subject.setTotal(5);
    for (let i = 0; i < 20; i++) {
      subject.advance({ items: 1 });
      tick(1);
    }

    for (const { fraction } of emitted) {
      if (fraction !== null) {
        expect(fraction).toBeGreaterThanOrEqual(0);
        expect(fraction).toBeLessThanOrEqual(1);
      }
    }
  });

  it('ignores a nonsensical total', () => {
    const { subject } = reporter();
    subject.setTotal(0);
    subject.setTotal(-5);
    subject.setTotal(Number.NaN);
    subject.advance({ items: 1 });
    expect(subject.snapshot().fraction).toBeNull();
  });
});

describe('throttling', () => {
  it('emits at most once per window', () => {
    const { subject, emitted } = reporter(100);
    subject.advance({ items: 1 });
    subject.advance({ items: 1 });
    subject.advance({ items: 1 });

    expect(emitted).toHaveLength(1);
  });

  it('emits again once the window has passed', () => {
    const { subject, emitted, tick } = reporter(100);
    subject.advance({ items: 1 });
    tick(150);
    subject.advance({ items: 1 });

    expect(emitted).toHaveLength(2);
  });

  it('does not throttle a phase change', () => {
    // Phase transitions are rare and meaningful — always worth showing.
    const { subject, emitted } = reporter(100);
    subject.advance({ items: 1 });
    subject.setPhase('analyzing');

    expect(emitted).toHaveLength(2);
    expect(emitted[1]?.phase).toBe('analyzing');
  });

  it('ignores a repeated phase', () => {
    const { subject, emitted } = reporter(100);
    subject.setPhase('enumerating');
    subject.setPhase('enumerating');
    expect(emitted).toHaveLength(1);
  });

  it('uses no timer, so nothing can leak', () => {
    // Throttling is a timestamp comparison; there is no interval to clear.
    const setInterval = vi.spyOn(globalThis, 'setInterval');
    const setTimeout = vi.spyOn(globalThis, 'setTimeout');

    const { subject, tick } = reporter(10);
    subject.advance({ items: 1 });
    tick(50);
    subject.advance({ items: 1 });
    subject.finish();

    expect(setInterval).not.toHaveBeenCalled();
    expect(setTimeout).not.toHaveBeenCalled();
    setInterval.mockRestore();
    setTimeout.mockRestore();
  });
});

describe('finish', () => {
  it('emits a final snapshot regardless of the throttle', () => {
    const { subject, emitted } = reporter(1000);
    subject.advance({ items: 1 });
    subject.finish();

    expect(emitted).toHaveLength(2);
    expect(emitted[1]?.phase).toBe('finalizing');
  });

  it('clears the current path', () => {
    const { subject } = reporter();
    subject.advance({ path: '/tmp/a.bin' });
    subject.finish();
    expect(subject.snapshot().currentPath).toBeNull();
  });

  it('is idempotent', () => {
    const { subject, emitted } = reporter(0);
    subject.finish();
    subject.finish();
    subject.finish();
    expect(emitted).toHaveLength(1);
  });

  it('silences every later report', () => {
    // A plugin that ignored its cancellation signal must not be able to
    // resurrect a settled scan.
    const { subject, emitted, tick } = reporter(0);
    subject.finish();
    const after = emitted.length;

    tick(1000);
    subject.advance({ items: 100, bytes: 100 });
    subject.setPhase('enumerating');
    subject.setTotal(10);

    expect(emitted).toHaveLength(after);
    expect(subject.finished).toBe(true);
  });
});
