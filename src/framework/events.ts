// Typed event bus (PRD §12.1) — decoupled cross-cutting signals (session, toasts,
// economy celebrations). World ↔ UI communicate via this + stores, never directly.
import type { Badge, SubmitResponse } from "@/framework/api/schemas";
import type { EggId } from "@/lib/eggs";

export type ToastKind = "info" | "success" | "error";

export interface EventMap {
  session_lost: string; // reason
  toast: { message: string; kind: ToastKind };
  coins_changed: number; // new balance
  badge_awarded: Badge;
  activity_completed: SubmitResponse;
  egg_found: { id: EggId; title: string }; // easter egg discovered (eggStore)
  world_interact: { kind: "plaque" | "billboard" }; // Pixi prop click → DOM panel
  venue_opened: string; // venue id — DOM panel opened → world plays a building pop
  konami: null; // the code was entered → world throws a block party
}

type Handler<K extends keyof EventMap> = (payload: EventMap[K]) => void;
type AnyHandler = (payload: never) => void;

class EventBus {
  private handlers = new Map<keyof EventMap, Set<AnyHandler>>();

  on<K extends keyof EventMap>(type: K, handler: Handler<K>): () => void {
    let set = this.handlers.get(type);
    if (!set) {
      set = new Set();
      this.handlers.set(type, set);
    }
    set.add(handler as AnyHandler);
    return () => set?.delete(handler as AnyHandler);
  }

  emit<K extends keyof EventMap>(type: K, payload: EventMap[K]): void {
    this.handlers.get(type)?.forEach((h) => (h as Handler<K>)(payload));
  }
}

export const events = new EventBus();
