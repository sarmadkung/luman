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

export interface ScanOptions {
  /** Restrict the scan to specific scanner plugin ids. Empty = all enabled. */
  readonly pluginIds?: readonly string[];
}
