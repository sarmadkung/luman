import { describe, expect, it } from 'vitest';
import { PROTECTED_PATH_PATTERNS, expandProtectedPath } from '@luman/domain';
import { InMemoryFileSystem } from './in-memory-file-system';
import { PathGuard } from './path-guard';
import { directory, file, standardFixture, symlink } from './fs-tree';

/** Synthetic home — never derived from os.homedir() (AGENTS.md §6.8). */
const HOME = '/Users/testuser';

function guard(allowedRoots: readonly string[] = ['/Users/testuser', '/tmp']): PathGuard {
  return new PathGuard(new InMemoryFileSystem({ tree: standardFixture() }), {
    allowedRoots,
    homeDir: HOME,
  });
}

describe('PathGuard — admission', () => {
  it('admits a path inside an allowed root', async () => {
    const result = await guard().resolve('/Users/testuser/projects/luman');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toBe('/Users/testuser/projects/luman');
  });

  it('returns the resolved real path, not the requested one', async () => {
    const result = await guard(['/Users/testuser', '/tmp']).resolve('/tmp/../tmp/scratch.tmp');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toBe('/tmp/scratch.tmp');
  });

  it('isAllowed mirrors resolve without surfacing the reason', async () => {
    expect(await guard().isAllowed('/Users/testuser/projects/luman')).toBe(true);
    expect(await guard().isAllowed('/Users/testuser/Documents')).toBe(false);
  });
});

describe('PathGuard — rejections', () => {
  it('rejects a relative path', async () => {
    const result = await guard().resolve('Users/testuser/projects');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('PATH_NOT_ALLOWED');
      expect(result.error.context?.reason).toBe('relative-path');
    }
  });

  it('rejects an absolute path outside every allowed root', async () => {
    const result = await guard().resolve('/System/Library');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.context?.reason).toBe('outside-allowed-roots');
  });

  it('rejects a "../" escape from an allowed root', async () => {
    // Normalises to /System/Library, which is outside the roots.
    const result = await guard().resolve('/Users/testuser/../../System/Library');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('PATH_NOT_ALLOWED');
  });

  it('allows nothing when the allowed-root list is empty', async () => {
    // Default-closed: a misconfigured guard blocks rather than opens.
    const result = await guard([]).resolve('/Users/testuser/projects/luman');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.context?.reason).toBe('outside-allowed-roots');
  });

  it('never throws — every refusal is an Err', async () => {
    await expect(guard().resolve('/Users/testuser/Documents')).resolves.toHaveProperty('ok', false);
    await expect(guard().resolve('nonsense')).resolves.toHaveProperty('ok', false);
  });
});

describe('PathGuard — protected paths', () => {
  // One case per entry in docs/05_BUSINESS_RULES.md §Protected paths.
  for (const { pattern } of PROTECTED_PATH_PATTERNS) {
    it(`rejects ${pattern}`, async () => {
      const expanded = expandProtectedPath(pattern, HOME);
      // Allow the root so the refusal can only come from the protected check.
      const result = await guard(['/']).resolve(expanded);
      expect(result.ok, `${expanded} should be refused`).toBe(false);
      if (!result.ok) expect(result.error.code).toBe('PATH_NOT_ALLOWED');
    });
  }

  it('rejects a subpath of a protected location', async () => {
    const result = await guard(['/']).resolve('/Users/testuser/Documents/taxes.pdf');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.context?.reason).toBe('protected-path');
  });

  it('rejects a cache inside ~/Library — protected beats allowed', async () => {
    const result = await guard(['/']).resolve(
      '/Users/testuser/Library/Caches/com.example.app/cache.bin',
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.context?.reason).toBe('protected-path');
  });

  it('admits an unprotected sibling under home', async () => {
    // `~` is exact-match, so home's own contents are not blanket-protected.
    const result = await guard(['/']).resolve('/Users/testuser/projects/luman/README.md');
    expect(result.ok).toBe(true);
  });

  it('names the offending pattern in the user-facing message', async () => {
    const result = await guard(['/']).resolve('/Users/testuser/Documents');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.userMessage).toContain('Documents');
  });
});

describe('PathGuard — resolve before comparing', () => {
  it('catches a symlink pointing from an allowed path into a protected one', async () => {
    // The requested path looks innocent; only symlink resolution exposes it.
    const result = await guard(['/']).resolve('/Users/testuser/projects/link-to-docs');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.context?.reason).toBe('protected-path');
  });

  it('catches a symlink escaping the allowed roots', async () => {
    const fs = new InMemoryFileSystem({
      tree: {
        allowed: directory({ escape: symlink('/elsewhere/secret.txt') }),
        elsewhere: directory({ 'secret.txt': file(1) }),
      },
    });
    const pathGuard = new PathGuard(fs, { allowedRoots: ['/allowed'], homeDir: HOME });
    const result = await pathGuard.resolve('/allowed/escape');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.context?.reason).toBe('outside-allowed-roots');
  });

  it('classifies Documents/../Downloads as Downloads, not Documents', async () => {
    const fs = new InMemoryFileSystem({
      tree: { Users: directory({ testuser: directory({ Downloads: directory({}) }) }) },
    });
    const pathGuard = new PathGuard(fs, { allowedRoots: ['/'], homeDir: HOME });
    const result = await pathGuard.resolve('/Users/testuser/Documents/../Downloads');
    expect(result.ok).toBe(false);
    // Refused as Downloads — both are protected, but the message proves which.
    if (!result.ok) expect(result.error.userMessage).toContain('Downloads');
  });
});

describe('PathGuard — resolution failures are not permission', () => {
  it('propagates PATH_NOT_FOUND rather than admitting the path', async () => {
    const result = await guard().resolve('/Users/testuser/projects/missing');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('PATH_NOT_FOUND');
  });

  it('propagates SYMLINK_LOOP rather than admitting the path', async () => {
    const result = await guard().resolve('/Users/testuser/loop-a');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('SYMLINK_LOOP');
  });
});
