/** Opaque identifier helpers. IDs are strings (UUID-like) throughout the app. */
export type Id = string;

/**
 * Generate an RFC4122-ish v4 identifier. Uses the platform crypto when
 * available and falls back to a Math.random implementation for test envs.
 */
export function createId(): Id {
  const c = globalThis.crypto as Crypto | undefined;
  if (c && typeof c.randomUUID === 'function') return c.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (ch) => {
    const r = (Math.random() * 16) | 0;
    const v = ch === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
