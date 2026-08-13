import { describe, expect, it, vi } from 'vitest';
import type { VolumeInfo } from '@luman/domain';
import type { VolumeService } from '@luman/core';
import { ok } from '@luman/shared';
import { TauriVolumeService, type InvokeFn } from './tauri-volume-service';

const MOCK_VOLUME = {
  id: '/mock',
  name: 'Mock Disk',
  totalBytes: 500,
  freeBytes: 200,
  usedBytes: 300,
  isBootVolume: true,
} as unknown as VolumeInfo;

/** Stands in for the INF-013 mock, recording whether it was consulted. */
function fallbackService(): VolumeService & { calls: number } {
  return {
    calls: 0,
    async listVolumes() {
      this.calls += 1;
      return ok([MOCK_VOLUME]);
    },
    async getBootVolume() {
      return ok(MOCK_VOLUME);
    },
  } as VolumeService & { calls: number };
}

describe('outside the Tauri runtime', () => {
  it('never invokes a native command', async () => {
    // The web dev shell has no bridge; attempting a call would throw at runtime.
    const invoke = vi.fn<InvokeFn>();
    const service = new TauriVolumeService({
      fallback: fallbackService(),
      isTauriRuntime: () => false,
      invoke,
    });

    await service.listVolumes();
    expect(invoke).not.toHaveBeenCalled();
  });

  it('returns the fallback data', async () => {
    const fallback = fallbackService();
    const service = new TauriVolumeService({
      fallback,
      isTauriRuntime: () => false,
      invoke: vi.fn<InvokeFn>(),
    });

    const result = await service.listVolumes();
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value[0]?.id).toBe('/mock');
    expect(fallback.calls).toBe(1);
  });
});

describe('with the flag off inside Tauri', () => {
  it('falls back to the mock when the command rejects', async () => {
    // volumes.rs returns Err whenever LUMAN_REAL_VOLUMES is not set.
    const fallback = fallbackService();
    const service = new TauriVolumeService({
      fallback,
      isTauriRuntime: () => true,
      invoke: vi.fn<InvokeFn>().mockRejectedValue(new Error('flag not enabled')),
    });

    const result = await service.listVolumes();
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value[0]?.id).toBe('/mock');
    expect(fallback.calls).toBe(1);
  });

  it('surfaces no raw OS error to the caller', async () => {
    const service = new TauriVolumeService({
      fallback: fallbackService(),
      isTauriRuntime: () => true,
      invoke: vi.fn<InvokeFn>().mockRejectedValue(new Error('/Users/someone/secret: EACCES')),
    });

    const result = await service.listVolumes();
    // The raw message must not leak — the fallback answer is returned instead.
    expect(result.ok).toBe(true);
    if (result.ok) expect(JSON.stringify(result.value)).not.toContain('EACCES');
  });
});

describe('with the flag on inside Tauri', () => {
  const rawVolumes = [
    { id: '/', name: 'Macintosh HD', totalBytes: 1000, availableBytes: 400, isBootVolume: true },
    {
      id: '/Volumes/Ext',
      name: 'External',
      totalBytes: 2000,
      availableBytes: 1500,
      isBootVolume: false,
    },
  ];

  it('maps native figures into VolumeInfo', async () => {
    const fallback = fallbackService();
    const service = new TauriVolumeService({
      fallback,
      isTauriRuntime: () => true,
      invoke: vi.fn<InvokeFn>().mockResolvedValue(rawVolumes),
    });

    const result = await service.listVolumes();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toHaveLength(2);
      expect(result.value[0]?.usedBytes).toBe(600);
    }
    expect(fallback.calls).toBe(0);
  });

  it('picks the boot volume', async () => {
    const service = new TauriVolumeService({
      fallback: fallbackService(),
      isTauriRuntime: () => true,
      invoke: vi.fn<InvokeFn>().mockResolvedValue(rawVolumes),
    });

    const result = await service.getBootVolume();
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value?.id).toBe('/');
  });

  it('falls back when the command returns a non-array', async () => {
    const fallback = fallbackService();
    const service = new TauriVolumeService({
      fallback,
      isTauriRuntime: () => true,
      invoke: vi.fn<InvokeFn>().mockResolvedValue({ unexpected: true }),
    });

    await service.listVolumes();
    expect(fallback.calls).toBe(1);
  });

  it('reports VOLUME_UNAVAILABLE when the native side returns nothing', async () => {
    const service = new TauriVolumeService({
      fallback: fallbackService(),
      isTauriRuntime: () => true,
      invoke: vi.fn<InvokeFn>().mockResolvedValue([]),
    });

    const result = await service.listVolumes();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('VOLUME_UNAVAILABLE');
      expect(result.error.userMessage).not.toContain('/');
    }
  });
});
