import type { ScanProgress } from '@luman/domain';

/** Cancels a subscription. Calling it twice is safe and does nothing. */
export type Unsubscribe = () => void;

/**
 * Every event the application publishes, keyed by name.
 *
 * Events are **notifications, not commands**: a subscriber learns that
 * something happened and cannot cause anything by handling one. Nothing here
 * carries a callback or a capability that could reach an execution path — an
 * event that could trigger cleanup would be exactly the auto-execute path
 * AGENTS.md §6.5 forbids.
 */
export interface EventMap {
  'scan:started': { readonly scanId: string };
  'scan:progress': { readonly scanId: string; readonly progress: ScanProgress };
  'scan:completed': { readonly scanId: string };
  'scan:cancelled': { readonly scanId: string };
  'scan:failed': { readonly scanId: string; readonly code: string };
}

export type EventName = keyof EventMap;
export type EventListener<K extends EventName> = (payload: EventMap[K]) => void;

/**
 * Typed publish/subscribe. The real implementation lands in INF-009.
 *
 * Delivery is synchronous and best-effort: a listener that throws must not stop
 * the others from being called, and must not fail the publisher.
 */
export interface EventBus {
  publish<K extends EventName>(event: K, payload: EventMap[K]): void;
  subscribe<K extends EventName>(event: K, listener: EventListener<K>): Unsubscribe;
}

/**
 * Sprint 04 stub. Publishing is a no-op and subscribing hands back a working
 * unsubscribe, so callers can be wired up before INF-009 exists without
 * special-casing a null bus. It drops events rather than throwing, because a
 * missing bus must never fail the operation that reported progress.
 */
export class StubEventBus implements EventBus {
  publish(): void {
    // Intentionally empty — see INF-009.
  }
  subscribe(): Unsubscribe {
    return () => {
      // Nothing was ever registered.
    };
  }
}
