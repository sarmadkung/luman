import type { Finding, PluginMetadata, Recommendation } from '@luman/domain';
import type { AnalyzeContext, CleanContext, ScanContext } from './context';

/** Common surface shared by every plugin kind. */
export interface BasePlugin {
  readonly metadata: PluginMetadata;
  /** Called once when the plugin is registered. Optional setup. */
  activate?(): Promise<void> | void;
  /** Called when the plugin is disabled/unloaded. Optional teardown. */
  deactivate?(): Promise<void> | void;
}

/** Read-only discovery of reclaimable/noteworthy items. */
export interface ScannerPlugin extends BasePlugin {
  readonly metadata: PluginMetadata & { kind: 'scanner' };
  scan(context: ScanContext): Promise<readonly Finding[]>;
}

/** Executes deletions — only ever after an explicit, confirmed user action. */
export interface CleanerPlugin extends BasePlugin {
  readonly metadata: PluginMetadata & { kind: 'cleaner' };
  clean(context: CleanContext): Promise<{ reclaimedBytes: number }>;
}

/** Turns findings into explainable recommendations. Read-only. */
export interface AnalyzerPlugin extends BasePlugin {
  readonly metadata: PluginMetadata & { kind: 'analyzer' };
  analyze(context: AnalyzeContext): Promise<readonly Recommendation[]>;
}

export type AnyPlugin = ScannerPlugin | CleanerPlugin | AnalyzerPlugin;
