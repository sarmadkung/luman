import { describe, expect, it } from 'vitest';
import { StubVolumeService } from './volume-service';
import { StubPermissionService } from './permission-service';
import { StubScanEngine } from './scan-engine';
import { StubEventBus } from './event-bus';
import { DenyAllSafetyGate } from './safety-gate';
import { StubScannerService } from './scanner-service';
import type { VolumeService } from './volume-service';
import type { PermissionService } from './permission-service';
import type { ScanEngine } from './scan-engine';
import type { EventBus } from './event-bus';
import type { SafetyGate } from './safety-gate';
import type { ScannerService } from './scanner-service';

/**
 * Scanner-side contracts must be structurally incapable of mutating the
 * filesystem (AGENTS.md §6.3). This is enforced two ways: the type assertions
 * below fail `pnpm typecheck` if a mutation-shaped method is ever added, and
 * the runtime sweep catches one added to an implementation but not its
 * interface.
 *
 * Repositories are deliberately excluded — they write rows to Luman's own
 * database, never files.
 */

/** Verbs that would indicate a capability to change something on disk. */
type MutationVerb =
  | 'delete'
  | 'remove'
  | 'write'
  | 'move'
  | 'rename'
  | 'trash'
  | 'unlink'
  | 'copy'
  | 'mkdir'
  | 'rmdir'
  | 'truncate'
  | 'chmod'
  | 'empty'
  | 'purge'
  | 'clean';

/** Keys of `T` that begin with a mutation verb, in any casing. */
export type MutatingKeys<T> = Extract<
  keyof T,
  MutationVerb | `${MutationVerb}${string}` | `${Capitalize<MutationVerb>}${string}`
>;

type Assert<T extends true> = T;
type HasNoMutation<T> = [MutatingKeys<T>] extends [never] ? true : false;

// Each line is a compile-time proof. Adding e.g. `deleteFile` to any of these
// contracts turns the corresponding alias into a type error.
export type _ScannerServiceIsReadOnly = Assert<HasNoMutation<ScannerService>>;
export type _ScanEngineIsReadOnly = Assert<HasNoMutation<ScanEngine>>;
export type _VolumeServiceIsReadOnly = Assert<HasNoMutation<VolumeService>>;
export type _PermissionServiceIsReadOnly = Assert<HasNoMutation<PermissionService>>;
export type _EventBusIsReadOnly = Assert<HasNoMutation<EventBus>>;
export type _SafetyGateIsReadOnly = Assert<HasNoMutation<SafetyGate>>;

const MUTATION_VERBS: readonly string[] = [
  'delete',
  'remove',
  'write',
  'move',
  'rename',
  'trash',
  'unlink',
  'copy',
  'mkdir',
  'rmdir',
  'truncate',
  'chmod',
  'empty',
  'purge',
  'clean',
];

/** Every method name on an object, including inherited prototype members. */
function methodNames(instance: object): readonly string[] {
  const names = new Set<string>();
  let current: object | null = instance;
  while (current && current !== Object.prototype) {
    for (const name of Object.getOwnPropertyNames(current)) {
      if (name !== 'constructor') names.add(name);
    }
    current = Object.getPrototypeOf(current) as object | null;
  }
  return [...names];
}

describe('scanner-side contracts expose no mutation capability', () => {
  const instances: readonly [string, object][] = [
    ['StubScannerService', new StubScannerService()],
    ['StubScanEngine', new StubScanEngine()],
    ['StubVolumeService', new StubVolumeService()],
    ['StubPermissionService', new StubPermissionService()],
    ['StubEventBus', new StubEventBus()],
    ['DenyAllSafetyGate', new DenyAllSafetyGate()],
  ];

  for (const [name, instance] of instances) {
    it(`${name} has no mutation-shaped method`, () => {
      const offenders = methodNames(instance).filter((method) =>
        MUTATION_VERBS.some((verb) => method.toLowerCase().startsWith(verb)),
      );
      expect(offenders, `${name} exposes: ${offenders.join(', ')}`).toEqual([]);
    });
  }

  it('would catch a mutation method if one were added', () => {
    // Guards the guard: if this sweep silently matched nothing, the tests above
    // would pass no matter what was added.
    class Offender {
      deleteEverything(): void {}
    }
    const offenders = methodNames(new Offender()).filter((method) =>
      MUTATION_VERBS.some((verb) => method.toLowerCase().startsWith(verb)),
    );
    expect(offenders).toEqual(['deleteEverything']);
  });
});
