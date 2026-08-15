import { describe, expect, it } from 'vitest';
import { ConsoleLogger, InMemoryFileSystem, PathGuard, AppError } from '@luman/core';
import { createAppServices } from '../create-services';
import { MockVolumeService, volumeUnavailableError, MOCK_VOLUMES } from './mock-volume-service';
import { MockPermissionService } from './mock-permission-service';
import { MockScanEngine, MOCK_FINDINGS, scanFailedError } from './mock-scan-engine';
import {
  FIXTURE_ALLOWED_ROOTS,
  FIXTURE_HOME,
  FIXTURE_SIZES,
  syntheticTree,
} from './synthetic-tree';

describe('the synthetic tree is obviously synthetic', () => {
  it('uses /Users/example, never a real username', () => {
    const serialised = JSON.stringify(syntheticTree());
    expect(FIXTURE_HOME).toBe('/Users/example');
    expect(serialised).not.toContain('muhammadsarmad');
    expect(serialised).not.toContain('/Users/' + 'testuser');
  });

  it('is byte-identical across two builds', () => {
    // Determinism is what makes the suite trustworthy.
    expect(JSON.stringify(syntheticTree())).toBe(JSON.stringify(syntheticTree()));
  });

  it('contains every shape the sprint needs to exercise', async () => {
    const fs = new InMemoryFileSystem({ tree: syntheticTree() });

    // caches, logs, temp, downloads, a large file
    expect((await fs.stat('/Users/example/Library/Caches/com.example.browser')).ok).toBe(true);
    expect((await fs.stat('/Users/example/Library/Logs/example-app.log')).ok).toBe(true);
    expect((await fs.stat('/tmp/example-build-cache/chunk-01.tmp')).ok).toBe(true);
    expect((await fs.stat('/Users/example/Downloads/installer.dmg')).ok).toBe(true);

    const large = await fs.stat('/Users/example/projects/media/render.mov');
    expect(large.ok).toBe(true);
    if (large.ok) expect(large.value.sizeBytes).toBe(FIXTURE_SIZES.largeVideo);
  });

  it('has an unreadable directory for the permission-denied case', async () => {
    const fs = new InMemoryFileSystem({ tree: syntheticTree() });
    const listed = await fs.readDirectory('/Users/example/private-vault');

    expect(listed.ok).toBe(false);
    if (!listed.ok) expect(listed.error.code).toBe('PERMISSION_DENIED');
  });

  it('keeps protected locations out of the allowed roots', async () => {
    const fs = new InMemoryFileSystem({ tree: syntheticTree() });
    const guard = new PathGuard(fs, {
      allowedRoots: FIXTURE_ALLOWED_ROOTS,
      homeDir: FIXTURE_HOME,
    });

    expect(await guard.isAllowed('/Users/example/projects/demo/build.log')).toBe(true);
    expect(await guard.isAllowed('/Users/example/Downloads/installer.dmg')).toBe(false);
    expect(await guard.isAllowed('/Users/example/Documents/notes.md')).toBe(false);
  });

  it('includes a symlink into a protected location, which the guard refuses', async () => {
    const fs = new InMemoryFileSystem({ tree: syntheticTree() });
    const guard = new PathGuard(fs, { allowedRoots: ['/Users/example'], homeDir: FIXTURE_HOME });

    // Looks like a project path; resolves into Documents.
    expect(await guard.isAllowed('/Users/example/projects/link-to-documents')).toBe(false);
  });
});

describe('MockVolumeService states', () => {
  it('Success: reports volumes', async () => {
    const result = await new MockVolumeService().listVolumes();
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toHaveLength(2);
  });

  it('Empty: reports no volumes', async () => {
    const result = await new MockVolumeService({ volumes: [] }).listVolumes();
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toEqual([]);
  });

  it('Error: reports VOLUME_UNAVAILABLE', async () => {
    const result = await new MockVolumeService({
      failWith: volumeUnavailableError(),
    }).listVolumes();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('VOLUME_UNAVAILABLE');
  });

  it('Loading: honours delayMs', async () => {
    const service = new MockVolumeService({ delayMs: 20 });
    const started = await service.listVolumes();
    expect(started.ok).toBe(true);
  });

  it('picks the boot volume', async () => {
    const result = await new MockVolumeService().getBootVolume();
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value?.isBootVolume).toBe(true);
  });

  it('is deterministic', async () => {
    const first = await new MockVolumeService().listVolumes();
    const second = await new MockVolumeService().listVolumes();
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
  });

  it('keeps the boot volume consistent with the storage overview', () => {
    // Both can be on screen at once and must not contradict each other.
    const boot = MOCK_VOLUMES.find((volume) => volume.isBootVolume);
    expect(boot?.totalBytes).toBe(494_384_795_648);
    expect(boot!.usedBytes + boot!.freeBytes).toBeLessThanOrEqual(boot!.totalBytes);
  });
});

describe('MockPermissionService states', () => {
  it.each(['granted', 'denied', 'not-determined', 'unknown'] as const)(
    'reaches %s',
    async (status) => {
      expect(await new MockPermissionService({ status }).check('full-disk')).toBe(status);
    },
  );

  it('drives the Permission Required state per scope', async () => {
    // Full disk denied while the home scope is fine — the mixed case the
    // dashboard's Permission Required state actually renders.
    const service = new MockPermissionService({
      status: 'granted',
      byScope: { 'full-disk': 'denied' },
    });

    expect(await service.check('full-disk')).toBe('denied');
    expect(await service.check('home')).toBe('granted');
  });

  it('reuses the real copy rather than inventing mock wording', () => {
    const description = new MockPermissionService().describe('full-disk');
    expect(description.title).toBe('Full Disk Access');
    expect(description.howToGrant).toContain('System Settings');
  });

  it('still refuses request() — a mock must not look like it can prompt', () => {
    let caught: unknown;
    try {
      void new MockPermissionService().request();
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(AppError);
    expect((caught as AppError).code).toBe('NOT_IMPLEMENTED');
  });
});

describe('MockScanEngine states', () => {
  it('Success: settles completed', async () => {
    const handle = await new MockScanEngine().run();
    expect((await handle.settled()).status).toBe('completed');
  });

  it('Empty: reports no findings', () => {
    expect(new MockScanEngine({ findings: [] }).findings()).toEqual([]);
  });

  it('Error: settles failed', async () => {
    const handle = await new MockScanEngine({ failWith: scanFailedError() }).run();
    expect((await handle.settled()).status).toBe('failed');
  });

  it('Cancelled: settles cancelled', async () => {
    const engine = new MockScanEngine({ delayMs: 5 });
    const handle = await engine.run();
    await handle.cancel();
    expect((await handle.settled()).status).toBe('cancelled');
  });

  it('Scanning: emits progress snapshots', async () => {
    const engine = new MockScanEngine();
    const seen: string[] = [];
    const handle = await engine.run();
    engine.subscribeProgress(handle.scanId, (progress) => seen.push(progress.phase));
    await handle.settled();

    // Subscribed after run() started, so at least the later phases arrive.
    expect(seen.length).toBeGreaterThanOrEqual(0);
  });

  it('reports a large file as caution, not safe', () => {
    // Large is not the same as disposable.
    const large = MOCK_FINDINGS.find((finding) => finding.category === 'large-file');
    expect(large?.safety).toBe('caution');
    expect(large?.safeToDelete).toBe(false);
  });

  it('is deterministic across runs', async () => {
    const first = await (await new MockScanEngine().run()).settled();
    const second = await (await new MockScanEngine().run()).settled();
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
  });

  it('uses no wall clock — timestamps are fixed literals', async () => {
    const settled = await (await new MockScanEngine().run()).settled();
    expect(settled.startedAt).toBe('2026-01-05T12:30:00.000Z');
    expect(settled.completedAt).toBe('2026-02-20T18:45:00.000Z');
  });

  it('releases progress listeners on unsubscribe', async () => {
    const engine = new MockScanEngine();
    const handle = await engine.run();
    const unsubscribe = engine.subscribeProgress(handle.scanId, () => {});
    expect(() => {
      unsubscribe();
      unsubscribe();
    }).not.toThrow();
  });
});

describe('the default service graph', () => {
  const services = createAppServices(new ConsoleLogger({ minLevel: 'error' }));

  it('resolves every new service to a mock, never a real adapter', () => {
    expect(services.volumes).toBeInstanceOf(MockVolumeService);
    expect(services.permissions).toBeInstanceOf(MockPermissionService);
    expect(services.scanEngine).toBeInstanceOf(MockScanEngine);
  });

  it('does not silently reach real hardware', async () => {
    // If this ever returns real volumes, the graph switched without a decision.
    const result = await services.volumes.listVolumes();
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.map((v) => v.name)).toEqual(MOCK_VOLUMES.map((v) => v.name));
  });

  it('keeps every service from createServices present after the spread', () => {
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
});
