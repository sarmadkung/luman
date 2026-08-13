/**
 * The read-only filesystem layer. Nothing here can modify a file — see
 * `file-system.ts` for why that is a type-level guarantee rather than a
 * convention.
 */
export * from './paths';
export * from './file-system';
export * from './fs-tree';
export * from './in-memory-file-system';
export * from './path-guard';
