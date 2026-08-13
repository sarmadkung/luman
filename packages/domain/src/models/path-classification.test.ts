import { describe, expect, it } from 'vitest';
import {
  PROTECTED_PATH_PATTERNS,
  expandProtectedPath,
  findProtectingPattern,
  isProtectedPath,
} from './path-classification';

/** A synthetic home directory. Never derived from os.homedir() — AGENTS.md §6.8. */
const HOME = '/Users/testuser';

describe('PROTECTED_PATH_PATTERNS', () => {
  it('has exactly the eleven canonical entries', () => {
    expect(PROTECTED_PATH_PATTERNS).toHaveLength(11);
  });

  it('matches the business-rules table verbatim, in order', () => {
    expect(PROTECTED_PATH_PATTERNS.map((p) => p.pattern)).toEqual([
      '~',
      '~/Desktop',
      '~/Documents',
      '~/Downloads',
      '~/Pictures',
      '~/Movies',
      '~/Music',
      '~/Library',
      '/System',
      '/Library',
      '/private',
    ]);
  });

  it('stores relative patterns only, never an absolute home path', () => {
    for (const { pattern } of PROTECTED_PATH_PATTERNS) {
      expect(pattern.startsWith('/Users/')).toBe(false);
      expect(pattern).not.toContain('testuser');
    }
  });

  it('treats home itself as exact and every other entry as a prefix', () => {
    const exact = PROTECTED_PATH_PATTERNS.filter((p) => p.matchMode === 'exact');
    expect(exact.map((p) => p.pattern)).toEqual(['~']);
  });
});

describe('expandProtectedPath', () => {
  it('expands a bare tilde to the home directory', () => {
    expect(expandProtectedPath('~', HOME)).toBe(HOME);
  });

  it('expands a tilde-prefixed pattern', () => {
    expect(expandProtectedPath('~/Documents', HOME)).toBe('/Users/testuser/Documents');
  });

  it('leaves an absolute pattern untouched', () => {
    expect(expandProtectedPath('/System', HOME)).toBe('/System');
  });
});

describe('isProtectedPath', () => {
  it('protects each expanded pattern itself', () => {
    for (const { pattern } of PROTECTED_PATH_PATTERNS) {
      expect(isProtectedPath(expandProtectedPath(pattern, HOME), HOME)).toBe(true);
    }
  });

  it('protects subpaths of a prefix entry', () => {
    expect(isProtectedPath('/Users/testuser/Documents/taxes/2025.pdf', HOME)).toBe(true);
    expect(isProtectedPath('/System/Library/Caches', HOME)).toBe(true);
    expect(isProtectedPath('/private/var/tmp', HOME)).toBe(true);
  });

  it('protects a cache inside ~/Library — protected beats safe', () => {
    expect(isProtectedPath('/Users/testuser/Library/Caches/com.example.app', HOME)).toBe(true);
  });

  it('does not protect unrelated locations under home', () => {
    // `~` is exact, so home's own contents are not blanket-protected —
    // otherwise the seven ~/… rows below it would be redundant.
    expect(isProtectedPath('/Users/testuser/projects/luman', HOME)).toBe(false);
    expect(isProtectedPath('/Users/testuser/.cache', HOME)).toBe(false);
  });

  it('protects the home directory itself as a target', () => {
    expect(isProtectedPath(HOME, HOME)).toBe(true);
  });

  it('does not protect paths outside any pattern', () => {
    expect(isProtectedPath('/Volumes/External/scratch', HOME)).toBe(false);
    expect(isProtectedPath('/opt/homebrew', HOME)).toBe(false);
  });

  it('matches on whole segments, not string prefixes', () => {
    // /Systemic must not match /System.
    expect(isProtectedPath('/Systemic/data', HOME)).toBe(false);
    expect(isProtectedPath('/Users/testuser/Documentation', HOME)).toBe(false);
  });

  it('tolerates trailing slashes', () => {
    expect(isProtectedPath('/Users/testuser/Documents/', HOME)).toBe(true);
    expect(isProtectedPath('/System//', HOME)).toBe(true);
  });

  it('treats an unresolved path as protected rather than trusting it', () => {
    // The caller is required to resolve first. If one slips through, the
    // cautious answer wins — this is Documents, not Downloads.
    expect(isProtectedPath('/Users/testuser/Documents/../Downloads', HOME)).toBe(true);
    expect(isProtectedPath('/opt/../Users/testuser/projects', HOME)).toBe(true);
  });
});

describe('findProtectingPattern', () => {
  it('names the pattern responsible, for explaining a refusal', () => {
    expect(findProtectingPattern('/Users/testuser/Pictures/a.jpg', HOME)?.pattern).toBe(
      '~/Pictures',
    );
    expect(findProtectingPattern('/System/Library', HOME)?.pattern).toBe('/System');
  });

  it('returns null for an unprotected path', () => {
    expect(findProtectingPattern('/Users/testuser/projects', HOME)).toBeNull();
  });
});
