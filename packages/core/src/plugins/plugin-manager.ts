import type { Plugin, PluginMetadata } from '@luman/domain';
import type { AnyPlugin } from '@luman/plugin-sdk';
import { AppError } from '../errors';
import type { Logger } from '../logging';
import { EmptyPluginSource, type PluginSource } from './plugin-source';

/**
 * Owns the plugin lifecycle: discovery -> registration -> activation ->
 * deactivation. Holds no built-in plugins in Sprint 1; the surface is what
 * later sprints (and third parties) build against.
 */
export interface PluginManager {
  /** Find available plugins via the configured source(s). */
  discover(): Promise<readonly PluginMetadata[]>;
  /** Register a discovered/loaded plugin instance. */
  register(plugin: AnyPlugin): Promise<Plugin>;
  /** Remove a plugin, deactivating it first if needed. */
  unregister(id: string): Promise<void>;
  /** Activate a registered plugin (runs its `activate` hook). */
  enable(id: string): Promise<Plugin>;
  /** Deactivate an active plugin (runs its `deactivate` hook). */
  disable(id: string): Promise<Plugin>;
  get(id: string): Plugin | undefined;
  list(): readonly Plugin[];
}

interface Entry {
  instance: AnyPlugin;
  record: Plugin;
}

export class InMemoryPluginManager implements PluginManager {
  private readonly entries = new Map<string, Entry>();

  constructor(
    private readonly logger: Logger,
    private readonly source: PluginSource = new EmptyPluginSource(),
  ) {}

  async discover(): Promise<readonly PluginMetadata[]> {
    const found = await this.source.discover();
    this.logger.info('Plugin discovery complete', { count: found.length });
    return found.map((p) => p.metadata);
  }

  async register(plugin: AnyPlugin): Promise<Plugin> {
    const { id } = plugin.metadata;
    if (this.entries.has(id)) {
      throw new AppError(`Plugin "${id}" is already registered.`, {
        code: 'PLUGIN_REGISTRATION_FAILED',
        userMessage: 'That plugin is already installed.',
        context: { id },
      });
    }
    const record: Plugin = { metadata: plugin.metadata, state: 'registered', enabled: false };
    this.entries.set(id, { instance: plugin, record });
    this.logger.info('Plugin registered', { id, kind: plugin.metadata.kind });
    return record;
  }

  async unregister(id: string): Promise<void> {
    const entry = this.require(id);
    if (entry.record.enabled) await this.disable(id);
    this.entries.delete(id);
    this.logger.info('Plugin unregistered', { id });
  }

  async enable(id: string): Promise<Plugin> {
    const entry = this.require(id);
    try {
      await entry.instance.activate?.();
    } catch (cause) {
      entry.record = { ...entry.record, state: 'error' };
      throw new AppError(`Failed to activate plugin "${id}".`, {
        code: 'PLUGIN_REGISTRATION_FAILED',
        cause,
        context: { id },
      });
    }
    entry.record = { ...entry.record, state: 'active', enabled: true };
    this.logger.info('Plugin enabled', { id });
    return entry.record;
  }

  async disable(id: string): Promise<Plugin> {
    const entry = this.require(id);
    await entry.instance.deactivate?.();
    entry.record = { ...entry.record, state: 'disabled', enabled: false };
    this.logger.info('Plugin disabled', { id });
    return entry.record;
  }

  get(id: string): Plugin | undefined {
    return this.entries.get(id)?.record;
  }

  list(): readonly Plugin[] {
    return [...this.entries.values()].map((e) => e.record);
  }

  private require(id: string): Entry {
    const entry = this.entries.get(id);
    if (!entry) {
      throw new AppError(`Plugin "${id}" not found.`, {
        code: 'PLUGIN_NOT_FOUND',
        userMessage: 'That plugin could not be found.',
        context: { id },
      });
    }
    return entry;
  }
}
