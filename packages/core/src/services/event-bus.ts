import type { ScanProgress } from '@luman/domain';
import type { Logger } from '../logging';

/** Cancels a subscription. Calling it twice is safe and does nothing. */
export type Unsubscribe = () => void;

/**
 * Values an event payload may contain.
 *
 * Payloads must be **immutable, serializable data** — no functions, class
 * instances, or live object references. Enforced by this type rather than by a
 * comment, because two future things depend on it: events crossing the Tauri
 * IPC boundary, and persisting an event log. A payload carrying a live service
 * reference would also be a capability leak, letting a subscriber reach
 * something the bus never intended to hand out.
 */
export type Serializable =
  | string
  | number
  | boolean
  | null
  | readonly Serializable[]
  | { readonly [key: string]: Serializable };

/**
 * Every event the application publishes.
 *
 * The documented flow in `docs/02_ARCHITECTURE_SPEC.md` is
 * `ScanRequested → ScanCompleted → ResultsAvailable → CleanupRequested →
 * CleanupCompleted`, with `ScanProgressed`, `ScanCancelled`, and `ScanFailed`
 * as the branches a scan can take.
 *
 * Events are **notifications, not commands**. Handling one cannot cause
 * anything: no payload carries a callback or a capability, so no subscriber can
 * reach an execution path. An event that could trigger cleanup would be exactly
 * the auto-execute path AGENTS.md §6.5 forbids.
 */
export interface EventMap {
  ScanRequested: { readonly scanId: string; readonly roots: readonly string[] };
  ScanProgressed: { readonly scanId: string; readonly progress: ScanProgress };
  ScanCompleted: { readonly scanId: string; readonly findingCount: number };
  ScanCancelled: { readonly scanId: string };
  ScanFailed: { readonly scanId: string; readonly code: string };
  ResultsAvailable: { readonly scanId: string; readonly reclaimableBytes: number };
  /** Declared for the documented flow. Never published in Sprint 04. */
  CleanupRequested: { readonly actionId: string; readonly findingIds: readonly string[] };
  /** Declared for the documented flow. Never published in Sprint 04. */
  CleanupCompleted: { readonly actionId: string; readonly reclaimedBytes: number };
}

export type EventName = keyof EventMap;
export type EventListener<K extends EventName> = (payload: EventMap[K]) => void;

/**
 * Events that must have **zero publish sites** in this sprint.
 *
 * Cleanup is Sprint 07. Declaring the events keeps the documented flow whole
 * while a test asserts nothing publishes them, so the shape can exist without
 * the behavior quietly arriving with it.
 */
export const UNPUBLISHABLE_EVENTS: readonly EventName[] = ['CleanupRequested', 'CleanupCompleted'];

/**
 * Typed publish/subscribe.
 *
 * ## Ordering guarantee
 *
 * Delivery is **synchronous and in subscription order**: when `publish`
 * returns, every listener registered at the moment of the call has been
 * invoked. There is no queue, so there is nothing to grow unbounded and nothing
 * to flush in a test — assertions can run on the line after `publish`.
 *
 * The listener list is snapshotted before iteration. A subscriber that
 * unsubscribes mid-publication still receives the event in flight, and one
 * added mid-publication does not — without the snapshot, mutating the list
 * during iteration would skip a sibling or deliver twice.
 */
export interface EventBus {
  publish<K extends EventName>(event: K, payload: EventMap[K]): void;
  subscribe<K extends EventName>(event: K, listener: EventListener<K>): Unsubscribe;
  /** Subscribe for exactly one delivery, then unsubscribe automatically. */
  once<K extends EventName>(event: K, listener: EventListener<K>): Unsubscribe;
}

/**
 * In-memory `EventBus`.
 *
 * Knows nothing about services and holds no capability: publishing cannot
 * trigger a filesystem operation because the bus has no way to perform one.
 */
export class InMemoryEventBus implements EventBus {
  readonly #listeners = new Map<EventName, Set<(payload: never) => void>>();
  readonly #logger: Logger | undefined;

  constructor(logger?: Logger) {
    this.#logger = logger;
  }

  publish<K extends EventName>(event: K, payload: EventMap[K]): void {
    const registered = this.#listeners.get(event);
    if (registered === undefined) return;

    // Snapshot: a listener may unsubscribe (or subscribe) during delivery.
    for (const listener of [...registered]) {
      try {
        (listener as EventListener<K>)(payload);
      } catch (error) {
        // One bad subscriber must not deny the event to the others, nor fail
        // the publisher — which is often a scan reporting progress.
        this.#logger?.error('Event listener threw', { event, error });
      }
    }
  }

  subscribe<K extends EventName>(event: K, listener: EventListener<K>): Unsubscribe {
    const registered = this.#listeners.get(event) ?? new Set();
    registered.add(listener as (payload: never) => void);
    this.#listeners.set(event, registered);

    let active = true;
    return () => {
      if (!active) return; // Unsubscribing twice is a no-op.
      active = false;
      const current = this.#listeners.get(event);
      current?.delete(listener as (payload: never) => void);
      // Drop the empty set so listenerCount returns to zero — an empty Set
      // left behind is a small leak that hides a larger one.
      if (current !== undefined && current.size === 0) this.#listeners.delete(event);
    };
  }

  once<K extends EventName>(event: K, listener: EventListener<K>): Unsubscribe {
    const unsubscribe = this.subscribe(event, (payload) => {
      unsubscribe();
      listener(payload);
    });
    return unsubscribe;
  }

  /** Live listener count, for leak assertions. Test support, not app API. */
  listenerCount(event?: EventName): number {
    if (event !== undefined) return this.#listeners.get(event)?.size ?? 0;
    let total = 0;
    for (const set of this.#listeners.values()) total += set.size;
    return total;
  }
}

/**
 * Sprint 04 stub. Publishing is a no-op and subscribing hands back a working
 * unsubscribe, so callers can be wired before a real bus exists without
 * special-casing a null. It drops events rather than throwing, because a
 * missing bus must never fail the operation that reported progress.
 */
export class StubEventBus implements EventBus {
  publish(): void {
    // Intentionally empty.
  }
  subscribe(): Unsubscribe {
    return () => {
      // Nothing was ever registered.
    };
  }
  once(): Unsubscribe {
    return () => {
      // Nothing was ever registered.
    };
  }
}
