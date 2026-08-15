import { describe, expect, it, vi } from 'vitest';
import { ConsoleLogger, createServices, type Services } from '@luman/core';
import { bootstrap } from './bootstrap';
import { createAppServices } from './create-services';

const silentLogger = () =>
  new ConsoleLogger({
    minLevel: 'error',
    sink: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  });

/**
 * A service graph whose infrastructure methods fail the test if touched.
 *
 * `bootstrap` runs on every app launch, before the user has asked for
 * anything. A scan, a permission probe, or a volume read here would be work
 * nobody requested — and for permissions specifically, a probe at launch is the
 * shape of thing that grows into a prompt at launch.
 */
function tripwireServices(): Services {
  const base = createServices({ logger: silentLogger() });
  const forbid = (what: string) => () => {
    throw new Error(`bootstrap must not ${what}`);
  };

  return {
    ...base,
    volumes: {
      listVolumes: forbid('read volumes'),
      getBootVolume: forbid('read volumes'),
    } as unknown as Services['volumes'],
    permissions: {
      check: forbid('probe permissions'),
      describe: forbid('probe permissions'),
      request: forbid('request permissions'),
    } as unknown as Services['permissions'],
    scanEngine: {
      run: forbid('start a scan'),
      cancel: forbid('start a scan'),
      subscribeProgress: forbid('start a scan'),
    } as unknown as Services['scanEngine'],
    safety: {
      plan: forbid('evaluate a safety plan'),
    } as unknown as Services['safety'],
  };
}

describe('bootstrap side effects', () => {
  it('starts no scan, probes no permission, reads no volume', async () => {
    // Outside Tauri the database step is skipped, so this exercises the rest.
    await expect(bootstrap(tripwireServices())).resolves.toBeUndefined();
  });

  it('runs plugin discovery and nothing more', async () => {
    const services = tripwireServices();
    const discover = vi.spyOn(services.plugins, 'discover');

    await bootstrap(services);

    expect(discover).toHaveBeenCalledOnce();
  });

  it('is safe to run against the real default graph', async () => {
    await expect(bootstrap(createAppServices(silentLogger()))).resolves.toBeUndefined();
  });
});

describe('the service graph', () => {
  it('exposes every contract the sprint added', () => {
    const services = createAppServices(silentLogger());

    for (const key of [
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

  it('keeps the original Sprint 01 services intact', () => {
    // The whole point of this task: new infrastructure slots in behind the
    // existing contracts without disturbing what was already there.
    const services = createAppServices(silentLogger());

    for (const key of [
      'logger',
      'scanner',
      'cleanup',
      'storage',
      'recommendations',
      'history',
      'plugins',
    ] as const) {
      expect(services[key], `missing service: ${key}`).toBeDefined();
    }
  });

  it('reaches no real implementation without a flag', async () => {
    // Both Tauri adapters are gated in Rust and unwired here; the graph must
    // answer from mocks alone.
    const services = createAppServices(silentLogger());
    const result = await services.volumes.listVolumes();

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value[0]?.name).toBe('Macintosh HD');
  });
});
