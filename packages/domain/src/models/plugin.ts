import type { Id } from '@luman/shared';

/** The three plugin capabilities defined by the Plugin SDK. */
export type PluginKind = 'scanner' | 'cleaner' | 'analyzer';

/** Runtime lifecycle state tracked by the PluginManager. */
export type PluginState = 'discovered' | 'registered' | 'active' | 'disabled' | 'error';

/** Static, declarative description of a plugin. */
export interface PluginMetadata {
  readonly id: Id;
  readonly name: string;
  readonly version: string;
  readonly kind: PluginKind;
  readonly description: string;
  readonly author?: string;
}

/** A plugin as tracked by the application at runtime. */
export interface Plugin {
  readonly metadata: PluginMetadata;
  readonly state: PluginState;
  /** Whether the user has enabled the plugin. */
  readonly enabled: boolean;
}
