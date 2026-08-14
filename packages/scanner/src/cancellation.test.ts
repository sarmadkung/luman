import { describe, expect, it, vi } from 'vitest';
import type { Finding } from '@luman/domain';
import type { ScanContext, ScannerPlugin } from '@luman/plugin-sdk';
import {
  ConsoleLogger,
  InMemoryEventBus,
  InMemoryFileSystem,
  PathGuard,
  directory,
  file,
} from '@luman/core';
import { DefaultScanEngine } from './scan-engine';

const HOME = '/Users/testuser';
const TREE = {
  Users: directory({ testuser: directory({ projects: directory({ 'a.bin': file(100) }) }) }),
};

const finding = (overrides: Partial<Finding> = {}): Finding => ({
  id: 'f1',
  scanId: 's1',
  category: 'cache',
  path: '/Users/testuser/projects/a.bin',
  size: 100,
  safeToDelete: true,
  safety: 'safe',
  plugin: 'p1',
  ...overrides,
});

function plugin(
  id: string,
  scan: (context: ScanContext) => Promise<readonly Finding[]>,
): ScannerPlugin {
  return { metadata: { id, name: id, version: '1.0.0', kind: 'scanner' }, scan } as ScannerPlugin;
}

function engine(plugins: readonly ScannerPlugin[], timeoutMs = 50) {
  const fs = new InMemoryFileSystem({ tree: TREE });
  const guard = new PathGuard(fs, { allowedRoots: ['/Users/testuser'], homeDir: HOME });
  const events = new InMemoryEventBus();
  let counter = 0;
  return {
    events,
    engine: new DefaultScanEngine({
      plugins,
      guard,
      events,
      logger: new ConsoleLogger({
        minLevel: 'error',
        sink: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
      }),
      pluginTimeoutMs: timeoutMs,
      progressThrottleMs: 0,
      now: () => '2026-01-01T00:00:00.000Z',
      createId: () => `scan-${++counter}`,
    }),
  };
}

/** A plugin that respects its signal, resolving once cancelled. */
const cooperative = (id: string) =>
  plugin(id, async (context) => {
    for (let i = 0; i < 20; i++) {
      if (context.signal.aborted) return [];
      await new Promise((resolve) => setTimeout(resolve, 1));
    }
    return [finding({ id: `${id}-f` })];
  });

describe('cancellation', () => {
  it('settles as cancelled with completedAt set', async () => {
    const { engine: subject } = engine([cooperative('slow')]);
    const handle = await subject.run();
    await handle.cancel();

    const settled = await handle.settled();
    expect(settled.status).toBe('cancelled');
    expect(settled.completedAt).not.toBeNull();
  });

  it('discards partial findings that plugins already returned', async () => {
    // A cancelled scan that kept results would look complete to
    // getLatestScan(), and the user would act on half a picture.
    const { engine: subject } = engine([
      plugin('fast', async () => [finding({ id: 'partial' })]),
      cooperative('slow'),
    ]);

    const handle = await subject.run();
    await handle.cancel();
    await handle.settled();

    // `fast` genuinely produced a finding before cancellation landed; the
    // cancelled outcome must still carry none.
    const outcome = subject.outcomeOf(handle.scanId);
    expect(outcome?.scan.status).toBe('cancelled');
    expect(outcome?.findings).toEqual([]);
  });

  it('emits no ScanCompleted when cancelled', async () => {
    const { engine: subject, events } = engine([cooperative('slow')]);
    const completed = vi.fn();
    const cancelled = vi.fn();
    events.subscribe('ScanCompleted', completed);
    events.subscribe('ScanCancelled', cancelled);

    const handle = await subject.run();
    await handle.cancel();
    await handle.settled();

    expect(completed).not.toHaveBeenCalled();
    expect(cancelled).toHaveBeenCalledOnce();
  });

  it('emits no further progress after settling', async () => {
    const { engine: subject, events } = engine([cooperative('slow')]);
    const handle = await subject.run();
    await handle.cancel();
    await handle.settled();

    const later = vi.fn();
    events.subscribe('ScanProgressed', later);
    await new Promise((resolve) => setTimeout(resolve, 30));

    expect(later).not.toHaveBeenCalled();
  });
});

describe('cancellation is idempotent', () => {
  it('tolerates a double cancel', async () => {
    const { engine: subject } = engine([cooperative('slow')]);
    const handle = await subject.run();

    await expect(
      Promise.all([handle.cancel(), handle.cancel(), handle.cancel()]),
    ).resolves.toBeDefined();
    await handle.settled();
  });

  it('tolerates cancelling an unknown id', async () => {
    await expect(engine([]).engine.cancel('does-not-exist')).resolves.toBeUndefined();
  });

  it('tolerates cancelling after completion', async () => {
    const { engine: subject } = engine([plugin('quick', async () => [])]);
    const handle = await subject.run();
    await handle.settled();

    await expect(handle.cancel()).resolves.toBeUndefined();
  });

  it('produces no unhandled rejection across all three', async () => {
    const rejections: unknown[] = [];
    const onRejection = (reason: unknown) => rejections.push(reason);
    process.on('unhandledRejection', onRejection);

    const { engine: subject } = engine([cooperative('slow')]);
    const handle = await subject.run();
    await handle.cancel();
    await handle.cancel();
    await handle.settled();
    await handle.cancel();
    await subject.cancel('unknown');
    await new Promise((resolve) => setTimeout(resolve, 10));

    process.off('unhandledRejection', onRejection);
    expect(rejections).toEqual([]);
  });
});

describe('a plugin that ignores its signal', () => {
  it('does not prevent the scan from settling', async () => {
    const stubborn = plugin('stubborn', () => new Promise<readonly Finding[]>(() => {}));
    const { engine: subject } = engine([stubborn], 20);

    const handle = await subject.run();
    await handle.cancel();

    // Abandoned at the timeout boundary rather than waited on forever.
    const settled = await handle.settled();
    expect(settled.status).toBe('cancelled');
  });

  it('cannot resurrect a settled scan with late progress', async () => {
    const { engine: subject, events } = engine(
      [plugin('late', () => new Promise<readonly Finding[]>(() => {}))],
      20,
    );

    const handle = await subject.run();
    await handle.settled();

    const later = vi.fn();
    events.subscribe('ScanProgressed', later);
    await new Promise((resolve) => setTimeout(resolve, 40));

    expect(later).not.toHaveBeenCalled();
  });
});

describe('progress during a normal scan', () => {
  it('publishes ScanProgressed with non-decreasing counters', async () => {
    const { engine: subject, events } = engine([
      plugin('p1', async () => [finding({ id: 'f1', size: 100 })]),
      plugin('p2', async () => [
        finding({ id: 'f2', path: '/Users/testuser/projects/a.bin', size: 200 }),
      ]),
    ]);

    const seen: number[] = [];
    events.subscribe('ScanProgressed', (payload) => seen.push(payload.progress.itemsSeen));

    await subject.runToCompletion();

    expect(seen.length).toBeGreaterThan(0);
    expect(seen).toEqual([...seen].sort((a, b) => a - b));
  });

  it('reports a fraction within [0, 1] once the total is known', async () => {
    const { engine: subject, events } = engine([
      plugin('p1', async () => []),
      plugin('p2', async () => []),
    ]);

    const fractions: (number | null)[] = [];
    events.subscribe('ScanProgressed', (payload) => fractions.push(payload.progress.fraction));

    await subject.runToCompletion();

    for (const fraction of fractions) {
      if (fraction !== null) {
        expect(fraction).toBeGreaterThanOrEqual(0);
        expect(fraction).toBeLessThanOrEqual(1);
      }
    }
  });

  it('leaves no listener behind on the bus after settling', async () => {
    const { engine: subject, events } = engine([plugin('p1', async () => [])]);
    await subject.runToCompletion();

    // The engine subscribes to nothing; it only publishes. Anything left here
    // would be a leak that grows with every scan.
    expect(events.listenerCount()).toBe(0);
  });
});
