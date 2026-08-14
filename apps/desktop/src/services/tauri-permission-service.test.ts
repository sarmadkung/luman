import { describe, expect, it, vi } from 'vitest';
import type { PermissionStatus } from '@luman/domain';
import { AppError, FixedPermissionService, PERMISSION_SCOPES } from '@luman/core';
import { TauriPermissionService } from './tauri-permission-service';
import type { InvokeFn } from './tauri-volume-service';

const service = (options: { status?: PermissionStatus; inTauri?: boolean; invoke?: InvokeFn }) =>
  new TauriPermissionService({
    fallback: new FixedPermissionService(options.status ?? 'unknown'),
    isTauriRuntime: () => options.inTauri ?? false,
    invoke: options.invoke,
  });

describe('flag off / outside Tauri', () => {
  it('performs no native probe', async () => {
    const invoke = vi.fn<InvokeFn>();
    await service({ inTauri: false, invoke }).check('full-disk');
    expect(invoke).not.toHaveBeenCalled();
  });

  it('falls back to the mock status when the command rejects', async () => {
    // permissions.rs returns Err whenever LUMAN_REAL_PERMISSIONS is unset.
    const result = await service({
      status: 'not-determined',
      inTauri: true,
      invoke: vi.fn<InvokeFn>().mockRejectedValue(new Error('flag not enabled')),
    }).check('full-disk');
    expect(result).toBe('not-determined');
  });
});

describe('all four statuses are reachable', () => {
  for (const status of ['granted', 'denied', 'not-determined', 'unknown'] as const) {
    it(`reports ${status} from the mock`, async () => {
      expect(await service({ status }).check('full-disk')).toBe(status);
    });

    it(`reports ${status} from the native probe`, async () => {
      const result = await service({
        inTauri: true,
        invoke: vi.fn<InvokeFn>().mockResolvedValue(status),
      }).check('full-disk');
      expect(result).toBe(status);
    });
  }
});

describe('denial is a normal outcome', () => {
  it('returns denied rather than throwing', async () => {
    const check = service({ inTauri: true, invoke: vi.fn<InvokeFn>().mockResolvedValue('denied') });
    await expect(check.check('full-disk')).resolves.toBe('denied');
  });

  it('ignores an unrecognised status and falls back', async () => {
    const result = await service({
      status: 'unknown',
      inTauri: true,
      invoke: vi.fn<InvokeFn>().mockResolvedValue('totally-made-up'),
    }).check('full-disk');
    expect(result).toBe('unknown');
  });
});

describe('caching', () => {
  it('probes once per scope for the instance lifetime', async () => {
    const invoke = vi.fn<InvokeFn>().mockResolvedValue('granted');
    const instance = service({ inTauri: true, invoke });

    await instance.check('full-disk');
    await instance.check('full-disk');
    await instance.check('full-disk');

    expect(invoke).toHaveBeenCalledTimes(1);
  });

  it('does not share a cache between instances', async () => {
    // A module-level cache would leak state across tests.
    const invoke = vi.fn<InvokeFn>().mockResolvedValue('granted');
    await service({ inTauri: true, invoke }).check('full-disk');
    await service({ inTauri: true, invoke }).check('full-disk');
    expect(invoke).toHaveBeenCalledTimes(2);
  });
});

describe('request()', () => {
  it('throws NOT_IMPLEMENTED — no code path may raise an OS prompt', () => {
    // Deleting this test is the only way to ship a prompt, which is the point.
    let caught: unknown;
    try {
      void service({}).request();
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(AppError);
    expect((caught as AppError).code).toBe('NOT_IMPLEMENTED');
  });
});

describe('describe()', () => {
  it('gives every scope a title, a reason, and how to grant it', () => {
    const instance = service({});
    for (const scope of PERMISSION_SCOPES) {
      const description = instance.describe(scope);
      expect(description.title.length).toBeGreaterThan(0);
      expect(description.reason.length).toBeGreaterThan(0);
      expect(description.howToGrant).toContain('System Settings');
    }
  });

  it('never blames the user', () => {
    const instance = service({});
    for (const scope of PERMISSION_SCOPES) {
      const copy = `${instance.describe(scope).reason} ${instance.describe(scope).howToGrant}`;
      expect(copy.toLowerCase()).not.toContain('you failed');
      expect(copy.toLowerCase()).not.toContain('you must');
    }
  });
});
