// Typed event bus (PRD §12.1) — the world→UI channel for discrete events.
// UI→world goes through store actions; the ticker never emits React renders.
// Ported as a concept from the Godot F0 (autoload/event_bus.gd).

export interface CityEvents {
  session_ready: void;
  session_lost: { reason: string };
  coins_changed: { balance: number; delta: number };
  badge_awarded: { badge: unknown };
  building_entered: { id: string };
  building_exited: { id: string };
  toast_requested: { message: string; level: 'info' | 'success' | 'error' };
}

type Handler<T> = (payload: T) => void;
type EventKey = keyof CityEvents;

class EventBus {
  // Per-key payload types are enforced by the public on/emit signatures; the
  // internal store is intentionally loose (Handler<any>) to avoid mapped-type
  // friction on indexed assignment.
  private handlers: Partial<Record<EventKey, Set<Handler<any>>>> = {};

  on<K extends EventKey>(key: K, handler: Handler<CityEvents[K]>): () => void {
    const set = (this.handlers[key] ??= new Set<Handler<any>>());
    set.add(handler);
    return () => set.delete(handler);
  }

  emit<K extends EventKey>(
    key: K,
    ...payload: CityEvents[K] extends void ? [] : [CityEvents[K]]
  ): void {
    const set = this.handlers[key];
    if (!set) return;
    const arg = payload[0] as CityEvents[K];
    for (const h of set) h(arg);
  }
}

export const events = new EventBus();
