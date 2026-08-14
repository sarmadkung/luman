/** What a filesystem entry is. `other` covers sockets, devices, and FIFOs. */
export type FsEntryKind = 'file' | 'directory' | 'symlink' | 'other';

/**
 * One entry observed during enumeration. This is an *observation*, not a
 * handle: it carries no capability to open, move, or delete the path it names.
 * Scanners must not be able to reach a write operation (AGENTS.md §6.3).
 */
export interface FsEntry {
  /** Absolute path as resolved by the enumerator. */
  readonly path: string;
  readonly kind: FsEntryKind;
  /** Size in bytes. Zero for directories — directory totals are computed, not read. */
  readonly sizeBytes: number;
  /** ISO-8601 timestamp. */
  readonly modifiedAt: string;
  /**
   * True when the process could not read this entry (permission denied, or an
   * I/O error). The entry is still reported so the UI can explain the gap
   * rather than silently under-count.
   */
  readonly unreadable: boolean;
}
