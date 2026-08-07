import { describe, it, expect, vi } from 'vitest';
import type { ScannerPlugin } from '@luman/plugin-sdk';
import { ConsoleLogger } from '../logging';
import { InMemoryPluginManager } from './plugin-manager';
import type { PluginSource } from './plugin-source';

const silent = new ConsoleLogger({
  minLevel: 'error',
  sink: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
});

function makeScanner(id: string): ScannerPlugin {
  return {
    metadata: { id, name: id, version: '1.0.0', kind: 'scanner', description: '' },
    activate: vi.fn(),
    deactivate: vi.fn(),
    async scan() {
      return [];
    },
  };
}

describe('InMemoryPluginManager', () => {
  it('discovers nothing by default (no built-in plugins in Sprint 1)', async () => {
    const mgr = new InMemoryPluginManager(silent);
    expect(await mgr.discover()).toEqual([]);
    expect(mgr.list()).toEqual([]);
  });

  it('registers, enables, disables, and unregisters through the lifecycle', async () => {
    const mgr = new InMemoryPluginManager(silent);
    const plugin = makeScanner('cache-scanner');

    const registered = await mgr.register(plugin);
    expect(registered.state).toBe('registered');
    expect(registered.enabled).toBe(false);

    const enabled = await mgr.enable('cache-scanner');
    expect(enabled.state).toBe('active');
    expect(plugin.activate).toHaveBeenCalledOnce();

    const disabled = await mgr.disable('cache-scanner');
    expect(disabled.state).toBe('disabled');
    expect(plugin.deactivate).toHaveBeenCalledOnce();

    await mgr.unregister('cache-scanner');
    expect(mgr.get('cache-scanner')).toBeUndefined();
  });

  it('rejects duplicate registration and unknown ids', async () => {
    const mgr = new InMemoryPluginManager(silent);
    await mgr.register(makeScanner('dup'));
    await expect(mgr.register(makeScanner('dup'))).rejects.toThrow(/already registered/);
    await expect(mgr.enable('nope')).rejects.toThrow(/not found/);
  });

  it('discovers plugins from an injected source', async () => {
    const source: PluginSource = { discover: async () => [makeScanner('from-source')] };
    const mgr = new InMemoryPluginManager(silent, source);
    const found = await mgr.discover();
    expect(found).toHaveLength(1);
    expect(found[0]?.id).toBe('from-source');
  });
});
