import { describe, expect, it } from 'vitest';
import type { AppError } from '../errors';
import { InMemoryFileSystem } from './in-memory-file-system';
import { directory, file, other, standardFixture, symlink } from './fs-tree';

const fs = () => new InMemoryFileSystem({ tree: standardFixture() });

/** Unwrap an Err, failing loudly if the call unexpectedly succeeded. */
function errorOf<T>(result: { ok: boolean; error?: AppError; value?: T }): AppError {
  expect(result.ok, 'expected a failure, got success').toBe(false);
  return result.error as AppError;
}

describe('stat', () => {
  it('reports a file with its size and kind', async () => {
    const result = await fs().stat('/Users/testuser/Documents/taxes.pdf');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.kind).toBe('file');
      expect(result.value.sizeBytes).toBe(2048);
      expect(result.value.unreadable).toBe(false);
    }
  });

  it('reports a directory with size zero', async () => {
    const result = await fs().stat('/Users/testuser/Documents');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.kind).toBe('directory');
      expect(result.value.sizeBytes).toBe(0);
    }
  });

  it('fails with PATH_NOT_FOUND for a missing path', async () => {
    const result = await fs().stat('/Users/testuser/nope.txt');
    expect(errorOf(result).code).toBe('PATH_NOT_FOUND');
  });

  it('fails for a path that descends through a file', async () => {
    const result = await fs().stat('/Users/testuser/Documents/taxes.pdf/inner');
    expect(errorOf(result).code).toBe('PATH_NOT_FOUND');
  });

  it('rejects a relative path rather than guessing a working directory', async () => {
    const result = await fs().stat('Users/testuser');
    expect(errorOf(result).code).toBe('PATH_NOT_ALLOWED');
  });

  it('resolves ".." before looking up', async () => {
    const result = await fs().stat('/Users/testuser/Documents/../projects/luman/README.md');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.sizeBytes).toBe(512);
  });

  it('reports a non-file, non-directory entry as "other"', async () => {
    const system = new InMemoryFileSystem({ tree: { dev: directory({ sock: other() }) } });
    const result = await system.stat('/dev/sock');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.kind).toBe('other');
  });
});

describe('readDirectory', () => {
  it('lists immediate children, sorted, without recursing', async () => {
    const result = await fs().readDirectory('/Users/testuser/projects');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.map((entry) => entry.path)).toEqual([
        '/Users/testuser/projects/link-to-docs',
        '/Users/testuser/projects/luman',
      ]);
    }
  });

  it('reports a symlink child as a symlink, not as its target', async () => {
    // Enumeration must not silently follow links into another tree.
    const result = await fs().readDirectory('/Users/testuser/projects');
    expect(result.ok).toBe(true);
    if (result.ok) {
      const link = result.value.find((entry) => entry.path.endsWith('link-to-docs'));
      expect(link?.kind).toBe('symlink');
    }
  });

  it('returns an empty array for an empty directory', async () => {
    const result = await fs().readDirectory('/System/Library');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toEqual([]);
  });

  it('fails with PERMISSION_DENIED for an unreadable directory', async () => {
    const result = await fs().readDirectory('/Users/testuser/secrets');
    expect(errorOf(result).code).toBe('PERMISSION_DENIED');
  });

  it('fails when the path is a file', async () => {
    const result = await fs().readDirectory('/Users/testuser/Documents/taxes.pdf');
    expect(errorOf(result).code).toBe('PATH_NOT_ALLOWED');
  });

  it('fails with PATH_NOT_FOUND for a missing directory', async () => {
    const result = await fs().readDirectory('/Users/testuser/missing');
    expect(errorOf(result).code).toBe('PATH_NOT_FOUND');
  });
});

describe('symlinks', () => {
  it('follows a link to its target', async () => {
    const result = await fs().stat('/Users/testuser/projects/link-to-docs/taxes.pdf');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.sizeBytes).toBe(2048);
  });

  it('terminates on a symlink loop instead of hanging', async () => {
    const result = await fs().stat('/Users/testuser/loop-a');
    expect(errorOf(result).code).toBe('SYMLINK_LOOP');
  });

  it('terminates on a self-referential link', async () => {
    const system = new InMemoryFileSystem({ tree: { self: symlink('/self') } });
    expect(errorOf(await system.stat('/self')).code).toBe('SYMLINK_LOOP');
  });

  it('terminates on a long non-cyclic chain via the depth bound', async () => {
    // 60 links, each pointing at the next — no cycle, so only the bound stops it.
    const tree: Record<string, ReturnType<typeof symlink> | ReturnType<typeof file>> = {};
    for (let i = 0; i < 60; i++) tree[`link${i}`] = symlink(`/link${i + 1}`);
    tree.link60 = file(1);
    const system = new InMemoryFileSystem({ tree });
    expect(errorOf(await system.stat('/link0')).code).toBe('SYMLINK_LOOP');
  });

  it('resolves a relative link target against the link parent', async () => {
    const system = new InMemoryFileSystem({
      tree: { a: directory({ target: file(7), link: symlink('target') }) },
    });
    const result = await system.stat('/a/link');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.sizeBytes).toBe(7);
  });
});

describe('realPath', () => {
  it('returns the canonical path with symlinks resolved', async () => {
    const result = await fs().realPath('/Users/testuser/projects/link-to-docs');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toBe('/Users/testuser/Documents');
  });

  it('normalises ".." in the result', async () => {
    const result = await fs().realPath('/Users/testuser/Documents/../projects/luman');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toBe('/Users/testuser/projects/luman');
  });

  it('fails for a missing path', async () => {
    expect(errorOf(await fs().realPath('/nope')).code).toBe('PATH_NOT_FOUND');
  });
});

describe('exists', () => {
  it('is true for a present path and false for a missing one', async () => {
    expect(await fs().exists('/Users/testuser/Documents')).toBe(true);
    expect(await fs().exists('/Users/testuser/missing')).toBe(false);
  });

  it('is false rather than throwing on a symlink loop', async () => {
    expect(await fs().exists('/Users/testuser/loop-a')).toBe(false);
  });
});

describe('deeply nested trees', () => {
  it('walks a 200-level tree iteratively without exhausting the stack', async () => {
    let node = directory({ 'leaf.txt': file(3) });
    for (let i = 0; i < 200; i++) node = directory({ [`d${i}`]: node });
    const system = new InMemoryFileSystem({ tree: { deep: node } });

    const segments = ['deep'];
    for (let i = 199; i >= 0; i--) segments.push(`d${i}`);
    segments.push('leaf.txt');

    const result = await system.stat(`/${segments.join('/')}`);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.sizeBytes).toBe(3);
  });
});
