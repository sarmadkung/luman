/** What a permission request or check covers. */
export type PermissionScope = 'full-disk' | 'home' | 'volume';

/**
 * Result of a permission check.
 *
 * `not-determined` and `unknown` are deliberately separate: the first means the
 * user has never been asked and a prompt is appropriate, the second means the
 * check itself failed to produce an answer. Collapsing them would let a failed
 * check masquerade as a fresh install and re-prompt forever.
 */
export type PermissionStatus = 'granted' | 'denied' | 'not-determined' | 'unknown';
