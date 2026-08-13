import type { VolumeInfo } from '@luman/domain';
import type { Result } from '@luman/shared';
import { ok, err } from '@luman/shared';
import type { VolumeService } from '@luman/core';
import { AppError, pickBootVolume, toVolumeInfo, type RawVolume } from '@luman/core';
import { isTauri } from '../database/client';

/** The native command's shape, injected so tests never touch a real bridge. */
export type InvokeFn = (command: string, args?: Record<string, unknown>) => Promise<unknown>;

export interface TauriVolumeServiceOptions {
  /** Falls back to this whenever real figures are unavailable. */
  readonly fallback: VolumeService;
  /** Overridable for tests. Defaults to the real Tauri runtime check. */
  readonly isTauriRuntime?: () => boolean;
  /** Overridable for tests. Defaults to Tauri's `invoke`. */
  readonly invoke?: InvokeFn;
}

/**
 * `VolumeService` backed by the native capacity command, with the mock behind
 * it.
 *
 * The real path is off by default and **the flag lives in Rust** — see
 * `volumes.rs`. TypeScript cannot read `LUMAN_REAL_VOLUMES`, because Vite
 * exposes only `VITE_`-prefixed variables and `process.env` is absent from the
 * renderer bundle. So this service does not try to check the flag: it asks the
 * native side, and treats an error as "use the fallback". With the flag off the
 * command always errors, so the default path is the mock.
 *
 * Outside the Tauri runtime — the plain web dev shell — no native call is
 * attempted at all, since there is nothing to call.
 */
export class TauriVolumeService implements VolumeService {
  readonly #fallback: VolumeService;
  readonly #isTauriRuntime: () => boolean;
  readonly #invoke: InvokeFn | undefined;

  constructor(options: TauriVolumeServiceOptions) {
    this.#fallback = options.fallback;
    this.#isTauriRuntime = options.isTauriRuntime ?? isTauri;
    this.#invoke = options.invoke;
  }

  async listVolumes(): Promise<Result<readonly VolumeInfo[], AppError>> {
    const raw = await this.#readNative();
    if (raw === null) return this.#fallback.listVolumes();

    const volumes = raw.map(toVolumeInfo);
    if (volumes.length === 0) {
      return err(
        new AppError('No volumes were reported.', {
          code: 'VOLUME_UNAVAILABLE',
          userMessage: 'Luman could not read any drives.',
        }),
      );
    }
    return ok(volumes);
  }

  async getBootVolume(): Promise<Result<VolumeInfo | null, AppError>> {
    const listed = await this.listVolumes();
    if (!listed.ok) return listed;
    return ok(pickBootVolume(listed.value));
  }

  /**
   * Raw volumes from the native side, or null to mean "fall back".
   *
   * Every failure collapses to null on purpose: a disabled flag, a missing
   * command, and a runtime error are all the same decision here. Raw OS errors
   * never reach the UI — they would leak paths and mean nothing to a user.
   */
  async #readNative(): Promise<readonly RawVolume[] | null> {
    if (!this.#isTauriRuntime()) return null;

    const invoke = this.#invoke ?? (await loadInvoke());
    if (invoke === null) return null;

    try {
      const result = await invoke('list_volumes');
      return Array.isArray(result) ? (result as RawVolume[]) : null;
    } catch {
      // Flag off, command missing, or the bridge failed — use the mock.
      return null;
    }
  }
}

/** Load Tauri's `invoke` lazily so the web shell never imports it. */
async function loadInvoke(): Promise<InvokeFn | null> {
  try {
    const core = await import('@tauri-apps/api/core');
    return core.invoke as InvokeFn;
  } catch {
    return null;
  }
}
