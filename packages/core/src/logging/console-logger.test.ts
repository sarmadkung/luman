import { describe, expect, it, vi } from 'vitest';
import { ConsoleLogger } from './console-logger';
import { LOG_BUFFER_SIZE, LogBuffer } from './log-buffer';
import type { LogLevel } from './logger';

const sink = () => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() });

describe('level filtering', () => {
  it('drops a debug call at warn level', () => {
    const target = sink();
    new ConsoleLogger({ minLevel: 'warn', sink: target }).debug('quiet');
    expect(target.debug).not.toHaveBeenCalled();
  });

  it.each([
    ['debug' as LogLevel, ['debug', 'info', 'warn', 'error']],
    ['info' as LogLevel, ['info', 'warn', 'error']],
    ['warn' as LogLevel, ['warn', 'error']],
    ['error' as LogLevel, ['error']],
  ])('at %s, emits only %j', (minLevel, expected) => {
    const target = sink();
    const logger = new ConsoleLogger({ minLevel, sink: target });
    logger.debug('d');
    logger.info('i');
    logger.warn('w');
    logger.error('e');

    const emitted = (['debug', 'info', 'warn', 'error'] as const).filter(
      (level) => target[level].mock.calls.length > 0,
    );
    expect(emitted).toEqual(expected);
  });
});

describe('default level', () => {
  it('is debug in a development build', () => {
    const target = sink();
    new ConsoleLogger({ sink: target, isDev: true }).debug('verbose');
    expect(target.debug).toHaveBeenCalledOnce();
  });

  it('is info otherwise — the doc comment’s long-standing promise', () => {
    // The code previously defaulted to 'debug' unconditionally, which meant
    // shipped builds logged everything.
    const target = sink();
    new ConsoleLogger({ sink: target, isDev: false }).debug('verbose');
    expect(target.debug).not.toHaveBeenCalled();
  });

  it('still emits info in a non-dev build', () => {
    const target = sink();
    new ConsoleLogger({ sink: target, isDev: false }).info('shown');
    expect(target.info).toHaveBeenCalledOnce();
  });
});

describe('redaction', () => {
  it('redacts a path in the fields before it reaches the sink', () => {
    const target = sink();
    new ConsoleLogger({ minLevel: 'debug', sink: target }).info('scanned', {
      path: '/Users/alice/Documents/taxes.pdf',
    });

    const entry = target.info.mock.calls[0]?.[0] as { path: string };
    expect(entry.path).toBe('~/…/taxes.pdf');
    expect(JSON.stringify(entry)).not.toContain('alice');
  });

  it('redacts bindings inherited from a child logger', () => {
    const target = sink();
    const logger = new ConsoleLogger({ minLevel: 'debug', sink: target }).child({
      root: '/Users/alice/projects',
    });
    logger.info('working');

    expect(JSON.stringify(target.info.mock.calls[0]?.[0])).not.toContain('alice');
  });
});

describe('child()', () => {
  it('merges bindings and keeps the level', () => {
    const target = sink();
    const parent = new ConsoleLogger({ minLevel: 'warn', sink: target, bindings: { a: 1 } });
    parent.child({ b: 2 }).warn('hello');

    expect(target.warn.mock.calls[0]?.[0]).toMatchObject({ a: 1, b: 2, message: 'hello' });
  });

  it('does not emit below the inherited level', () => {
    const target = sink();
    new ConsoleLogger({ minLevel: 'warn', sink: target }).child({}).info('quiet');
    expect(target.info).not.toHaveBeenCalled();
  });

  it('shares the parent’s ring buffer', () => {
    const logger = new ConsoleLogger({ minLevel: 'debug', sink: sink() });
    logger.child({ scope: 'child' }).info('from child');
    expect(logger.recent().map((e) => e.message)).toContain('from child');
  });
});

describe('never throws', () => {
  it('swallows a throwing sink', () => {
    const target = sink();
    target.error.mockImplementation(() => {
      throw new Error('sink exploded');
    });
    const logger = new ConsoleLogger({ minLevel: 'debug', sink: target });

    expect(() => logger.error('boom')).not.toThrow();
  });

  it('warns once, then stays quiet about further sink failures', () => {
    const target = sink();
    target.error.mockImplementation(() => {
      throw new Error('sink exploded');
    });
    const logger = new ConsoleLogger({ minLevel: 'debug', sink: target });

    logger.error('one');
    logger.error('two');
    logger.error('three');

    expect(target.warn).toHaveBeenCalledOnce();
  });

  it('still records the entry when the sink fails', () => {
    const target = sink();
    target.info.mockImplementation(() => {
      throw new Error('sink exploded');
    });
    const logger = new ConsoleLogger({ minLevel: 'debug', sink: target });

    logger.info('kept');
    expect(logger.recent().map((e) => e.message)).toContain('kept');
  });
});

describe('ring buffer', () => {
  it('retains recent entries', () => {
    const logger = new ConsoleLogger({ minLevel: 'debug', sink: sink() });
    logger.info('first');
    logger.info('second');
    expect(logger.recent().map((e) => e.message)).toEqual(['first', 'second']);
  });

  it('never exceeds its bound, dropping oldest first', () => {
    const buffer = new LogBuffer(3);
    const logger = new ConsoleLogger({ minLevel: 'debug', sink: sink(), buffer });

    for (const message of ['a', 'b', 'c', 'd', 'e']) logger.info(message);

    expect(buffer.size).toBe(3);
    expect(logger.recent().map((e) => e.message)).toEqual(['c', 'd', 'e']);
  });

  it('does not buffer filtered-out entries', () => {
    const logger = new ConsoleLogger({ minLevel: 'warn', sink: sink() });
    logger.debug('dropped');
    expect(logger.recent()).toEqual([]);
  });

  it('defaults to the documented capacity', () => {
    expect(new LogBuffer().capacity).toBe(LOG_BUFFER_SIZE);
  });

  it('returns a copy a caller cannot mutate', () => {
    const buffer = new LogBuffer(2);
    buffer.push({ level: 'info', time: 't', message: 'm', fields: {} });
    (buffer.entries() as unknown[]).push('tampered');
    expect(buffer.size).toBe(1);
  });

  it('clamps a nonsensical capacity to at least one', () => {
    const buffer = new LogBuffer(0);
    buffer.push({ level: 'info', time: 't', message: 'm', fields: {} });
    expect(buffer.size).toBe(1);
  });
});
