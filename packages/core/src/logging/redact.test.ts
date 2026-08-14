import { describe, expect, it } from 'vitest';
import { redactFields, redactPath } from './redact';

describe('redactPath', () => {
  it('collapses a home-relative path to ~/…/basename', () => {
    expect(redactPath('~/Documents/taxes.pdf')).toBe('~/…/taxes.pdf');
  });

  it('removes the username from an absolute home path', () => {
    const redacted = redactPath('/Users/alice/Documents/taxes.pdf');
    expect(redacted).toBe('~/…/taxes.pdf');
    expect(redacted).not.toContain('alice');
  });

  it('redacts a nested protected path without revealing the structure', () => {
    const redacted = redactPath('/Users/alice/Library/Caches/com.example.app/blob.bin');
    expect(redacted).toBe('~/…/blob.bin');
    expect(redacted).not.toContain('alice');
    expect(redacted).not.toContain('Library');
  });

  it('reduces the home directory itself to ~', () => {
    expect(redactPath('/Users/alice')).toBe('~');
    expect(redactPath('/Users/alice/')).toBe('~');
    expect(redactPath('~')).toBe('~');
  });

  it('keeps a single-segment home path readable', () => {
    expect(redactPath('/Users/alice/notes.txt')).toBe('~/notes.txt');
  });

  it('handles the Linux /home form too', () => {
    expect(redactPath('/home/bob/docs/a.txt')).toBe('~/…/a.txt');
  });

  it('passes a non-home absolute path through unharmed', () => {
    // No user data in the path — mangling it would lose diagnostic value.
    expect(redactPath('/System/Library/Caches')).toBe('/System/Library/Caches');
    expect(redactPath('/tmp/scratch.tmp')).toBe('/tmp/scratch.tmp');
  });

  it('passes a non-POSIX path through unharmed', () => {
    expect(redactPath('C:\\Users\\alice\\file.txt')).toBe('C:\\Users\\alice\\file.txt');
  });

  it('passes an empty string through', () => {
    expect(redactPath('')).toBe('');
  });

  it('never throws on malformed input', () => {
    expect(() => redactPath(undefined as unknown as string)).not.toThrow();
    expect(() => redactPath(null as unknown as string)).not.toThrow();
  });
});

describe('redactFields', () => {
  it('redacts a path value', () => {
    expect(redactFields({ path: '/Users/alice/Documents/a.txt' })).toEqual({
      path: '~/…/a.txt',
    });
  });

  it('leaves non-path strings alone', () => {
    expect(redactFields({ message: 'scan completed', count: 3 })).toEqual({
      message: 'scan completed',
      count: 3,
    });
  });

  it('redacts paths nested inside objects and arrays', () => {
    // A path three levels down leaks exactly as much as a top-level one.
    const redacted = redactFields({
      context: { paths: ['/Users/alice/Documents/a.txt', '/tmp/b.txt'] },
    });
    expect(redacted).toEqual({ context: { paths: ['~/…/a.txt', '/tmp/b.txt'] } });
  });

  it('reduces an Error to name and message', () => {
    const redacted = redactFields(new Error('/Users/alice/secret.key')) as {
      name: string;
      message: string;
    };
    expect(redacted.name).toBe('Error');
    expect(redacted.message).not.toContain('alice');
  });

  it('terminates on deeply nested input', () => {
    let nested: Record<string, unknown> = { path: '/Users/alice/a.txt' };
    for (let i = 0; i < 20; i++) nested = { nested };
    expect(() => redactFields(nested)).not.toThrow();
  });

  it('terminates on a cyclic object', () => {
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;
    expect(() => redactFields(cyclic)).not.toThrow();
  });

  it('preserves null and primitives', () => {
    expect(redactFields({ a: null, b: 1, c: true })).toEqual({ a: null, b: 1, c: true });
  });
});
