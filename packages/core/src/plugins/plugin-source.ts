import type { AnyPlugin } from '@luman/plugin-sdk';

/**
 * Where plugins come from. Abstracting discovery lets us swap the empty Sprint-1
 * source for a real one (bundled + user-installed) without changing the manager.
 */
export interface PluginSource {
  discover(): Promise<readonly AnyPlugin[]>;
}

/** Sprint 1 ships no built-in plugins. */
export class EmptyPluginSource implements PluginSource {
  async discover(): Promise<readonly AnyPlugin[]> {
    return [];
  }
}
