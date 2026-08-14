import { describe, expect, it } from 'vitest';
import { FILE_SYSTEM_METHODS } from './file-system';
import { InMemoryFileSystem } from './in-memory-file-system';
import { standardFixture } from './fs-tree';

/**
 * The port must stay read-only. These tests fail if anyone widens it, so the
 * safety question gets asked at the moment of the change rather than in review.
 */

const MUTATION_METHODS = [
  'write',
  'writeFile',
  'delete',
  'unlink',
  'remove',
  'move',
  'rename',
  'trash',
  'mkdir',
  'rmdir',
  'copy',
  'truncate',
  'chmod',
  'append',
] as const;

/** Public method names on an instance, including inherited prototype members. */
function methodNames(instance: object): readonly string[] {
  const names = new Set<string>();
  let current: object | null = instance;
  while (current && current !== Object.prototype) {
    for (const name of Object.getOwnPropertyNames(current)) {
      if (name === 'constructor') continue;
      if (name.startsWith('#') || name.startsWith('_')) continue;
      const descriptor = Object.getOwnPropertyDescriptor(current, name);
      if (typeof descriptor?.value === 'function') names.add(name);
    }
    current = Object.getPrototypeOf(current) as object | null;
  }
  return [...names];
}

describe('FILE_SYSTEM_METHODS', () => {
  it('contains exactly the four read-only operations', () => {
    expect([...FILE_SYSTEM_METHODS]).toEqual(['stat', 'readDirectory', 'exists', 'realPath']);
  });

  it('names no mutation operation', () => {
    for (const method of FILE_SYSTEM_METHODS) {
      expect(MUTATION_METHODS).not.toContain(method);
    }
  });
});

describe('InMemoryFileSystem conforms to the port', () => {
  const instance = new InMemoryFileSystem({ tree: standardFixture() });

  it('exposes exactly the allow-listed methods, and nothing more', () => {
    // Private helpers are excluded above; anything else public is a widening.
    expect([...methodNames(instance)].sort()).toEqual([...FILE_SYSTEM_METHODS].sort());
  });

  it('exposes no mutation method', () => {
    const offenders = methodNames(instance).filter((name) =>
      MUTATION_METHODS.some((verb) => name.toLowerCase().startsWith(verb)),
    );
    expect(offenders).toEqual([]);
  });

  it('would catch a mutation method if one were added', () => {
    // Guards the guard: a silently broken matcher would make the above vacuous.
    class Offender {
      stat(): void {}
      deleteFile(): void {}
    }
    const offenders = methodNames(new Offender()).filter((name) =>
      MUTATION_METHODS.some((verb) => name.toLowerCase().startsWith(verb)),
    );
    expect(offenders).toEqual(['deleteFile']);
  });
});
