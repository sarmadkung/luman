import { describe, expect, it, vi } from 'vitest';
import type { Finding, SafetyLevel } from '@luman/domain';
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

/** Synthetic home — never derived from os.homedir() (AGENTS.md §6.8). */
const HOME = '/Users/testuser';

const TREE = {
  Users: directory({
    testuser: directory({
      projects: directory({
        'a.bin': file(100),
        'b.bin': file(250),
        'link-to-a': { kind: 'symlink' as const, target: '/Users/testuser/projects/a.bin' },
      }),
      Documents: directory({ 'taxes.pdf': file(999) }),
    }),
  }),
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
  return {
    metadata: { id, name: id, version: '1.0.0', kind: 'scanner' },
    scan,
  } as ScannerPlugin;
}

const reporting = (id: string, findings: readonly Finding[]): ScannerPlugin =>
  plugin(id, async () => findings);

function engine(plugins: readonly ScannerPlugin[], options: { timeoutMs?: number } = {}) {
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
      pluginTimeoutMs: options.timeoutMs ?? 50,
      now: () => '2026-01-01T00:00:00.000Z',
      createId: () => `scan-${++counter}`,
    }),
  };
}

describe('a successful scan', () => {
  it('completes with findings from three plugins', async () => {
    const { engine: subject } = engine([
      reporting('p1', [finding({ id: 'f1', path: '/Users/testuser/projects/a.bin' })]),
      reporting('p2', [finding({ id: 'f2', path: '/Users/testuser/projects/b.bin', size: 250 })]),
      reporting('p3', []),
    ]);

    const outcome = await subject.runToCompletion();

    expect(outcome.scan.status).toBe('completed');
    expect(outcome.findings).toHaveLength(2);
    expect(outcome.failures).toEqual([]);
  });

  it('records lifecycle timestamps and participating plugins', async () => {
    const { engine: subject } = engine([reporting('p1', [])]);
    const outcome = await subject.runToCompletion();

    expect(outcome.scan.startedAt).toBe('2026-01-01T00:00:00.000Z');
    expect(outcome.scan.completedAt).toBe('2026-01-01T00:00:00.000Z');
    expect(outcome.scan.plugins).toEqual(['p1']);
  });

  it('completes with no findings when no plugins are registered', async () => {
    // An empty toolbox is not an error.
    const outcome = await engine([]).engine.runToCompletion();
    expect(outcome.scan.status).toBe('completed');
    expect(outcome.findings).toEqual([]);
  });

  it('runs only the requested plugins', async () => {
    const { engine: subject } = engine([
      reporting('p1', [finding({ id: 'f1' })]),
      reporting('p2', [finding({ id: 'f2', path: '/Users/testuser/projects/b.bin' })]),
    ]);

    const outcome = await subject.runToCompletion({ pluginIds: ['p1'] });
    expect(outcome.scan.plugins).toEqual(['p1']);
    expect(outcome.findings).toHaveLength(1);
  });
});

describe('deduplication', () => {
  it('collapses two plugins reporting the same path', async () => {
    const { engine: subject } = engine([
      reporting('p1', [finding({ id: 'f1', safety: 'safe' })]),
      reporting('p2', [finding({ id: 'f2', safety: 'safe' })]),
    ]);

    expect((await subject.runToCompletion()).findings).toHaveLength(1);
  });

  it('collapses a symlink and its target — dedup is on the resolved path', async () => {
    // Reported through different paths; the same file underneath.
    const { engine: subject } = engine([
      reporting('p1', [finding({ id: 'f1', path: '/Users/testuser/projects/a.bin' })]),
      reporting('p2', [finding({ id: 'f2', path: '/Users/testuser/projects/link-to-a' })]),
    ]);

    const outcome = await subject.runToCompletion();
    expect(outcome.findings).toHaveLength(1);
    expect(outcome.findings[0]?.path).toBe('/Users/testuser/projects/a.bin');
  });

  it.each([
    ['safe', 'caution', 'caution'],
    ['safe', 'unsafe', 'unsafe'],
    ['caution', 'unsafe', 'unsafe'],
  ])('keeps the more cautious of %s and %s', async (first, second, expected) => {
    const { engine: subject } = engine([
      reporting('p1', [finding({ id: 'f1', safety: first as SafetyLevel })]),
      reporting('p2', [finding({ id: 'f2', safety: second as SafetyLevel })]),
    ]);

    const outcome = await subject.runToCompletion();
    expect(outcome.findings[0]?.safety).toBe(expected);
  });

  it('never becomes more permissive, whichever order they arrive in', async () => {
    const { engine: subject } = engine([
      reporting('p1', [finding({ id: 'f1', safety: 'unsafe' })]),
      reporting('p2', [finding({ id: 'f2', safety: 'safe' })]),
    ]);

    expect((await subject.runToCompletion()).findings[0]?.safety).toBe('unsafe');
  });
});

describe('guard enforcement', () => {
  it('drops a finding pointing at a protected path', async () => {
    // A plugin must not be able to put a protected location in front of a user.
    const { engine: subject } = engine([
      reporting('p1', [finding({ id: 'bad', path: '/Users/testuser/Documents/taxes.pdf' })]),
    ]);

    const outcome = await subject.runToCompletion();
    expect(outcome.findings).toEqual([]);
    expect(outcome.scan.status).toBe('completed');
  });

  it('drops a finding outside the allowed roots', async () => {
    const { engine: subject } = engine([
      reporting('p1', [finding({ id: 'bad', path: '/System/Library' })]),
    ]);

    expect((await subject.runToCompletion()).findings).toEqual([]);
  });

  it('keeps the good findings alongside a dropped one', async () => {
    const { engine: subject } = engine([
      reporting('p1', [
        finding({ id: 'good', path: '/Users/testuser/projects/a.bin' }),
        finding({ id: 'bad', path: '/Users/testuser/Documents/taxes.pdf' }),
      ]),
    ]);

    const outcome = await subject.runToCompletion();
    expect(outcome.findings.map((f) => f.id)).toEqual(['good']);
  });
});

describe('resilience', () => {
  it('completes with partial results when one plugin throws', async () => {
    const { engine: subject } = engine([
      reporting('good', [finding({ id: 'f1' })]),
      plugin('bad', async () => {
        throw new Error('plugin exploded');
      }),
    ]);

    const outcome = await subject.runToCompletion();
    expect(outcome.scan.status).toBe('completed');
    expect(outcome.findings).toHaveLength(1);
    expect(outcome.failures.map((f) => f.pluginId)).toEqual(['bad']);
  });

  it('fails the scan only when every plugin fails', async () => {
    const { engine: subject } = engine([
      plugin('bad1', async () => {
        throw new Error('nope');
      }),
      plugin('bad2', async () => {
        throw new Error('nope');
      }),
    ]);

    const outcome = await subject.runToCompletion();
    expect(outcome.scan.status).toBe('failed');
    expect(outcome.failures).toHaveLength(2);
  });

  it('times out a plugin that never resolves', async () => {
    const { engine: subject } = engine(
      [
        plugin('hangs', () => new Promise<readonly Finding[]>(() => {})),
        reporting('good', [finding({ id: 'f1' })]),
      ],
      { timeoutMs: 20 },
    );

    const outcome = await subject.runToCompletion();
    expect(outcome.scan.status).toBe('completed');
    expect(outcome.failures.map((f) => f.pluginId)).toEqual(['hangs']);
    expect(outcome.findings).toHaveLength(1);
  });

  it('clears its timer on the happy path — no leaked handles', async () => {
    // A leaked timer keeps the process alive and turns a fast suite into a
    // hanging one.
    const clearSpy = vi.spyOn(globalThis, 'clearTimeout');
    const { engine: subject } = engine([reporting('p1', [finding({ id: 'f1' })])]);

    await subject.runToCompletion();
    expect(clearSpy).toHaveBeenCalled();
    clearSpy.mockRestore();
  });
});

describe('cancellation', () => {
  it('marks a cancelled scan cancelled', async () => {
    const { engine: subject } = engine([
      plugin('slow', async (context) => {
        // Cooperative: a real plugin checks the signal.
        await new Promise((resolve) => setTimeout(resolve, 5));
        return context.signal.aborted ? [] : [finding({ id: 'f1' })];
      }),
    ]);

    const handle = await subject.run();
    await handle.cancel();
    const settled = await handle.settled();

    expect(settled.status).toBe('cancelled');
  });

  it('treats cancelling an unknown scan as a no-op', async () => {
    await expect(engine([]).engine.cancel('nope')).resolves.toBeUndefined();
  });
});

describe('events', () => {
  it('publishes ScanRequested and ScanCompleted', async () => {
    const { engine: subject, events } = engine([reporting('p1', [])]);
    const seen: string[] = [];
    events.subscribe('ScanRequested', () => seen.push('requested'));
    events.subscribe('ScanCompleted', () => seen.push('completed'));

    await subject.runToCompletion();
    expect(seen).toEqual(['requested', 'completed']);
  });

  it('publishes ScanFailed when every plugin fails', async () => {
    const { engine: subject, events } = engine([
      plugin('bad', async () => {
        throw new Error('nope');
      }),
    ]);
    const failed = vi.fn();
    events.subscribe('ScanFailed', failed);

    await subject.runToCompletion();
    expect(failed).toHaveBeenCalledOnce();
  });
});

describe('ScanContext', () => {
  it('exposes exactly scan, logger, and signal', async () => {
    // Widening this would grant every plugin a capability the SDK does not
    // document — a filesystem field here would be a scanner with file access.
    let keys: string[] = [];
    const { engine: subject } = engine([
      plugin('inspector', async (context) => {
        keys = Object.keys(context).sort();
        return [];
      }),
    ]);

    await subject.runToCompletion();
    expect(keys).toEqual(['logger', 'scan', 'signal']);
  });

  it('hands the plugin the running scan', async () => {
    let seenStatus = '';
    const { engine: subject } = engine([
      plugin('inspector', async (context) => {
        seenStatus = context.scan.status;
        return [];
      }),
    ]);

    await subject.runToCompletion();
    expect(seenStatus).toBe('running');
  });
});
