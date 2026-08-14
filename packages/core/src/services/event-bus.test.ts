import { describe, expect, it, vi } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
// Aliased for the same reason as packages/ui/src/styles/tokens.test.ts: Vite
// rewrites the literal text `new URL('...', import.meta.url)` into an asset URL.
import { fileURLToPath, URL as NodeURL } from 'node:url';
import {
  InMemoryEventBus,
  StubEventBus,
  UNPUBLISHABLE_EVENTS,
  type EventBus,
  type EventName,
} from './event-bus';

describe('publish / subscribe', () => {
  it('delivers a payload to a subscriber', () => {
    const bus = new InMemoryEventBus();
    const listener = vi.fn();
    bus.subscribe('ScanCompleted', listener);

    bus.publish('ScanCompleted', { scanId: 's1', findingCount: 3 });

    expect(listener).toHaveBeenCalledWith({ scanId: 's1', findingCount: 3 });
  });

  it('narrows the payload type by event name without a cast', () => {
    const bus = new InMemoryEventBus();
    let seen = 0;
    // `progress` is only on ScanProgressed; this compiles only if narrowed.
    bus.subscribe('ScanProgressed', (payload) => {
      seen = payload.progress.itemsSeen;
    });

    bus.publish('ScanProgressed', {
      scanId: 's1',
      progress: {
        phase: 'enumerating',
        itemsSeen: 42,
        bytesSeen: 100,
        currentPath: null,
        fraction: null,
      },
    });

    expect(seen).toBe(42);
  });

  it('delivers synchronously — assertions need no flush', () => {
    const bus = new InMemoryEventBus();
    let delivered = false;
    bus.subscribe('ScanCancelled', () => {
      delivered = true;
    });

    bus.publish('ScanCancelled', { scanId: 's1' });
    expect(delivered).toBe(true);
  });

  it('delivers in subscription order', () => {
    const bus = new InMemoryEventBus();
    const order: number[] = [];
    bus.subscribe('ScanCancelled', () => order.push(1));
    bus.subscribe('ScanCancelled', () => order.push(2));
    bus.subscribe('ScanCancelled', () => order.push(3));

    bus.publish('ScanCancelled', { scanId: 's1' });
    expect(order).toEqual([1, 2, 3]);
  });

  it('ignores an event with no subscribers', () => {
    const bus = new InMemoryEventBus();
    expect(() => bus.publish('ScanCancelled', { scanId: 's1' })).not.toThrow();
  });

  it('does not deliver an event to a different event’s listener', () => {
    const bus = new InMemoryEventBus();
    const listener = vi.fn();
    bus.subscribe('ScanCompleted', listener);

    bus.publish('ScanCancelled', { scanId: 's1' });
    expect(listener).not.toHaveBeenCalled();
  });
});

describe('a throwing subscriber is isolated', () => {
  it('still delivers to the other subscribers', () => {
    const bus = new InMemoryEventBus();
    const after = vi.fn();
    bus.subscribe('ScanCompleted', () => {
      throw new Error('subscriber exploded');
    });
    bus.subscribe('ScanCompleted', after);

    bus.publish('ScanCompleted', { scanId: 's1', findingCount: 0 });
    expect(after).toHaveBeenCalledOnce();
  });

  it('does not fail the publisher', () => {
    const bus = new InMemoryEventBus();
    bus.subscribe('ScanCompleted', () => {
      throw new Error('subscriber exploded');
    });

    // A scan reporting progress must not die because a widget threw.
    expect(() => bus.publish('ScanCompleted', { scanId: 's1', findingCount: 0 })).not.toThrow();
  });

  it('logs the failure when a logger is supplied', () => {
    const error = vi.fn();
    const logger = { error, warn: vi.fn(), info: vi.fn(), debug: vi.fn(), child: vi.fn() };
    const bus = new InMemoryEventBus(logger as never);
    bus.subscribe('ScanCompleted', () => {
      throw new Error('boom');
    });

    bus.publish('ScanCompleted', { scanId: 's1', findingCount: 0 });
    expect(error).toHaveBeenCalledOnce();
  });
});

describe('unsubscribe', () => {
  it('stops delivery', () => {
    const bus = new InMemoryEventBus();
    const listener = vi.fn();
    const unsubscribe = bus.subscribe('ScanCancelled', listener);

    unsubscribe();
    bus.publish('ScanCancelled', { scanId: 's1' });

    expect(listener).not.toHaveBeenCalled();
  });

  it('is safe to call twice', () => {
    const bus = new InMemoryEventBus();
    const unsubscribe = bus.subscribe('ScanCancelled', vi.fn());
    expect(() => {
      unsubscribe();
      unsubscribe();
    }).not.toThrow();
  });

  it('releases the listener — the count returns to zero', () => {
    const bus = new InMemoryEventBus();
    const unsubscribe = bus.subscribe('ScanCancelled', vi.fn());
    expect(bus.listenerCount()).toBe(1);

    unsubscribe();
    expect(bus.listenerCount()).toBe(0);
    expect(bus.listenerCount('ScanCancelled')).toBe(0);
  });

  it('unsubscribing during publication neither skips nor double-delivers', () => {
    const bus = new InMemoryEventBus();
    const calls: string[] = [];

    const unsubscribeB = bus.subscribe('ScanCancelled', () => {
      calls.push('a');
      unsubscribeB(); // Remove a *later* listener mid-delivery.
    });
    bus.subscribe('ScanCancelled', () => calls.push('b'));
    bus.subscribe('ScanCancelled', () => calls.push('c'));

    bus.publish('ScanCancelled', { scanId: 's1' });

    // The snapshot means every listener registered at publish time still runs.
    expect(calls).toEqual(['a', 'b', 'c']);
    // ...and exactly once each.
    expect(calls.filter((c) => c === 'b')).toHaveLength(1);
  });

  it('a listener added during publication is not delivered this round', () => {
    const bus = new InMemoryEventBus();
    const late = vi.fn();
    bus.subscribe('ScanCancelled', () => {
      bus.subscribe('ScanCancelled', late);
    });

    bus.publish('ScanCancelled', { scanId: 's1' });
    expect(late).not.toHaveBeenCalled();

    bus.publish('ScanCancelled', { scanId: 's1' });
    expect(late).toHaveBeenCalledOnce();
  });
});

describe('once', () => {
  it('delivers exactly one time', () => {
    const bus = new InMemoryEventBus();
    const listener = vi.fn();
    bus.once('ScanCompleted', listener);

    bus.publish('ScanCompleted', { scanId: 's1', findingCount: 1 });
    bus.publish('ScanCompleted', { scanId: 's2', findingCount: 2 });

    expect(listener).toHaveBeenCalledOnce();
    expect(listener).toHaveBeenCalledWith({ scanId: 's1', findingCount: 1 });
  });

  it('releases its listener after firing', () => {
    const bus = new InMemoryEventBus();
    bus.once('ScanCompleted', vi.fn());
    bus.publish('ScanCompleted', { scanId: 's1', findingCount: 0 });
    expect(bus.listenerCount()).toBe(0);
  });

  it('can be cancelled before it fires', () => {
    const bus = new InMemoryEventBus();
    const listener = vi.fn();
    bus.once('ScanCompleted', listener)();

    bus.publish('ScanCompleted', { scanId: 's1', findingCount: 0 });
    expect(listener).not.toHaveBeenCalled();
    expect(bus.listenerCount()).toBe(0);
  });
});

describe('StubEventBus', () => {
  it('drops events and hands back working unsubscribes', () => {
    // Typed as the contract: the stub's methods declare zero parameters.
    const bus: EventBus = new StubEventBus();
    expect(() => bus.publish('ScanCancelled', { scanId: 's1' })).not.toThrow();
    expect(() => {
      bus.subscribe('ScanCancelled', () => {})();
      bus.once('ScanCancelled', () => {})();
    }).not.toThrow();
  });
});

/**
 * Cleanup events must have zero publish sites in this sprint.
 *
 * Chosen approach: a **static scan of the source tree**, not a runtime spy. A
 * spy only proves the paths the suite happened to exercise never published; a
 * source scan proves no such call exists anywhere, including code no test
 * reaches. That is the claim the sprint actually needs.
 */
describe('cleanup events are unpublishable in Sprint 04', () => {
  // packages/core/src/services → repo root.
  const repoRoot = fileURLToPath(new NodeURL('../../../..', import.meta.url));

  /** Directories with no first-party TypeScript, some of them very large. */
  const SKIP = new Set(['node_modules', 'dist', 'target', 'gen', 'coverage']);

  function sourceFiles(dir: string, found: string[] = []): string[] {
    for (const entry of readdirSync(dir)) {
      if (SKIP.has(entry) || entry.startsWith('.')) continue;
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) sourceFiles(full, found);
      else if (/\.tsx?$/.test(entry) && !entry.includes('.test.')) found.push(full);
    }
    return found;
  }

  it.each(UNPUBLISHABLE_EVENTS)('nothing publishes %s', (event: EventName) => {
    const offenders = sourceFiles(repoRoot).filter((file) =>
      new RegExp(`publish\\s*\\(\\s*['"\`]${event}['"\`]`).test(readFileSync(file, 'utf8')),
    );
    expect(offenders, `publish sites found: ${offenders.join(', ')}`).toEqual([]);
  });

  it('would catch a publish site if one existed', () => {
    // Guards the guard: proves the regex matches the shape it claims to find.
    const pattern = new RegExp(`publish\\s*\\(\\s*['"\`]CleanupRequested['"\`]`);
    expect(pattern.test(`bus.publish('CleanupRequested', { actionId: 'a' })`)).toBe(true);
  });
});
