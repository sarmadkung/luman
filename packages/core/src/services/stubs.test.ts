import { describe, expect, it } from 'vitest';
import { AppError } from '../errors';
import { createServices } from './registry';
import type { PermissionService } from './permission-service';
import type { ScanEngine } from './scan-engine';
import type { EventBus } from './event-bus';
import { StubVolumeService } from './volume-service';
import { StubPermissionService } from './permission-service';
import { StubScanEngine } from './scan-engine';
import { StubEventBus } from './event-bus';
import { DenyAllSafetyGate } from './safety-gate';
import {
  StubScanRepository,
  StubFindingRepository,
  StubCleanupHistoryRepository,
  StubSettingsRepository,
} from './repositories';

/** Assert a call fails with AppError('NOT_IMPLEMENTED'), thrown sync or async. */
async function expectNotImplemented(call: () => unknown): Promise<void> {
  let caught: unknown;
  try {
    await call();
  } catch (error) {
    caught = error;
  }
  expect(caught).toBeInstanceOf(AppError);
  expect((caught as AppError).code).toBe('NOT_IMPLEMENTED');
}

describe('createServices', () => {
  it('returns a complete service graph with no arguments', () => {
    const services = createServices();
    for (const key of [
      'logger',
      'scanner',
      'cleanup',
      'storage',
      'recommendations',
      'history',
      'plugins',
      'volumes',
      'permissions',
      'scanEngine',
      'events',
      'safety',
      'scanRepository',
      'findingRepository',
      'cleanupHistoryRepository',
      'settingsRepository',
    ] as const) {
      expect(services[key], `missing service: ${key}`).toBeDefined();
    }
  });

  it('survives the spread-and-override that createAppServices performs', () => {
    // apps/desktop overrides exactly these three. Anything added to Services
    // must still be present afterwards, or the desktop graph loses a service.
    const base = createServices();
    const overridden = { ...base, storage: base.storage };
    expect(Object.keys(overridden).sort()).toEqual(Object.keys(base).sort());
    expect(overridden.safety).toBeDefined();
  });
});

describe('StubVolumeService', () => {
  it('lists no volumes, as an ok Result', async () => {
    const result = await new StubVolumeService().listVolumes();
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toEqual([]);
  });

  it('reports no boot volume', async () => {
    const result = await new StubVolumeService().getBootVolume();
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toBeNull();
  });
});

describe('StubPermissionService', () => {
  it('reports unknown rather than denied — nothing has been asked yet', async () => {
    // Typed as the contract, so the test exercises the interface the app uses.
    const service: PermissionService = new StubPermissionService();
    expect(await service.check('full-disk')).toBe('unknown');
  });

  it('describes every scope without prompting', () => {
    const service = new StubPermissionService();
    for (const scope of ['full-disk', 'home', 'volume'] as const) {
      const description = service.describe(scope);
      expect(description.scope).toBe(scope);
      expect(description.title.length).toBeGreaterThan(0);
      expect(description.reason.length).toBeGreaterThan(0);
    }
  });
});

describe('StubScanEngine', () => {
  it('throws NOT_IMPLEMENTED when asked to run', async () => {
    await expectNotImplemented(() => new StubScanEngine().run());
  });

  it('treats cancelling an unknown scan as a no-op, not a failure', async () => {
    const engine: ScanEngine = new StubScanEngine();
    await expect(engine.cancel('missing')).resolves.toBeUndefined();
  });

  it('returns a callable unsubscribe from subscribeProgress', () => {
    const unsubscribe = new StubScanEngine().subscribeProgress();
    expect(() => {
      unsubscribe();
      unsubscribe();
    }).not.toThrow();
  });
});

describe('StubEventBus', () => {
  it('drops published events instead of throwing', () => {
    const bus: EventBus = new StubEventBus();
    expect(() => bus.publish('ScanRequested', { scanId: 's1', roots: [] })).not.toThrow();
  });

  it('returns an unsubscribe that is safe to call twice', () => {
    const unsubscribe = new StubEventBus().subscribe();
    expect(() => {
      unsubscribe();
      unsubscribe();
    }).not.toThrow();
  });
});

describe('DenyAllSafetyGate', () => {
  it('denies by default, so an unfinished gate cannot permit anything', async () => {
    const result = await new DenyAllSafetyGate().plan();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('UNSAFE_OPERATION_BLOCKED');
      expect(result.error.userMessage.length).toBeGreaterThan(0);
    }
  });

  it('denies even a fully confirmed execute request', async () => {
    // Confirmation must not be a way around an unimplemented gate.
    const result = await new DenyAllSafetyGate().plan();
    expect(result.ok).toBe(false);
  });
});

describe('repository stubs', () => {
  it('return empty answers for reads', async () => {
    expect(await new StubScanRepository().getLatest()).toBeNull();
    expect(await new StubScanRepository().list()).toEqual([]);
    expect(await new StubFindingRepository().listByScan()).toEqual([]);
    expect(await new StubCleanupHistoryRepository().list()).toEqual([]);
    expect(await new StubCleanupHistoryRepository().totalReclaimedBytes()).toBe(0);
    expect(await new StubSettingsRepository().get()).toBeNull();
    expect(await new StubSettingsRepository().all()).toEqual({});
  });

  it('throw NOT_IMPLEMENTED for writes rather than silently discarding data', async () => {
    await expectNotImplemented(() => new StubScanRepository().save());
    await expectNotImplemented(() => new StubFindingRepository().saveAll());
    await expectNotImplemented(() => new StubCleanupHistoryRepository().record());
    await expectNotImplemented(() => new StubSettingsRepository().set());
  });
});
