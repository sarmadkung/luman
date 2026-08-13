import { describe, expect, it } from 'vitest';
import { baseName, isWithin, joinPath, normalizePath, parentPath, pathSegments } from './paths';

describe('normalizePath', () => {
  it('collapses duplicate and trailing slashes', () => {
    expect(normalizePath('/a//b///c/')).toBe('/a/b/c');
  });

  it('drops "." segments', () => {
    expect(normalizePath('/a/./b/./c')).toBe('/a/b/c');
  });

  it('resolves ".." against the preceding segment', () => {
    expect(normalizePath('/Users/x/Documents/../Downloads')).toBe('/Users/x/Downloads');
  });

  it('clamps ".." at the root instead of escaping', () => {
    expect(normalizePath('/../../etc')).toBe('/etc');
    expect(normalizePath('/..')).toBe('/');
  });

  it('keeps leading ".." on a relative path — nothing to resolve against', () => {
    expect(normalizePath('../a')).toBe('../a');
    expect(normalizePath('../../a/b')).toBe('../../a/b');
  });

  it('returns "." for an empty relative path', () => {
    expect(normalizePath('')).toBe('.');
    expect(normalizePath('.')).toBe('.');
  });

  it('preserves the root', () => {
    expect(normalizePath('/')).toBe('/');
  });
});

describe('pathSegments', () => {
  it('ignores empty segments', () => {
    expect(pathSegments('//a//b/')).toEqual(['a', 'b']);
    expect(pathSegments('/')).toEqual([]);
  });
});

describe('joinPath', () => {
  it('joins and normalises in one step', () => {
    expect(joinPath('/a/b', 'c')).toBe('/a/b/c');
    expect(joinPath('/a/b', '../c')).toBe('/a/c');
  });

  it('skips empty parts', () => {
    expect(joinPath('/a', '', 'b')).toBe('/a/b');
  });
});

describe('parentPath', () => {
  it('returns the containing directory', () => {
    expect(parentPath('/a/b/c')).toBe('/a/b');
  });

  it('stops at the root', () => {
    expect(parentPath('/')).toBe('/');
    expect(parentPath('/a')).toBe('/');
  });
});

describe('baseName', () => {
  it('returns the final segment', () => {
    expect(baseName('/a/b/c.txt')).toBe('c.txt');
  });

  it('returns empty string for the root', () => {
    expect(baseName('/')).toBe('');
  });
});

describe('isWithin', () => {
  it('accepts a path at or beneath the base', () => {
    expect(isWithin('/a/b', '/a/b')).toBe(true);
    expect(isWithin('/a/b/c', '/a/b')).toBe(true);
  });

  it('rejects a sibling', () => {
    expect(isWithin('/a/c', '/a/b')).toBe(false);
  });

  it('compares segments, so /Systemic is not inside /System', () => {
    // A startsWith check would wrongly accept this.
    expect(isWithin('/Systemic', '/System')).toBe(false);
    expect(isWithin('/Systemic/data', '/System')).toBe(false);
  });

  it('normalises before comparing', () => {
    expect(isWithin('/a/b/../b/c', '/a/b')).toBe(true);
    expect(isWithin('/a/b/../c', '/a/b')).toBe(false);
  });

  it('treats the root as containing everything', () => {
    expect(isWithin('/anywhere/at/all', '/')).toBe(true);
  });
});
