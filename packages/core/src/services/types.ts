/** Application-layer view models shared by service contracts. */
export interface StorageOverview {
  readonly totalBytes: number;
  readonly usedBytes: number;
  readonly freeBytes: number;
  /** Bytes the app believes are safely reclaimable from the latest scan. */
  readonly reclaimableBytes: number;
  /** Volume identifier this overview describes (e.g. the boot volume). */
  readonly volume: string;
}

/** One slice of used storage, for the dashboard breakdown. Display-only. */
export interface StorageCategory {
  /** Stable identifier, e.g. 'system' | 'apps' | 'documents'. */
  readonly key: string;
  readonly label: string;
  readonly bytes: number;
}

export interface ScanOptions {
  /** Restrict the scan to specific scanner plugin ids. Empty = all enabled. */
  readonly pluginIds?: readonly string[];
}
