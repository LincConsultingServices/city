// Typed event bus (PRD §12.1) — decoupled cross-cutting signals (session, toasts,
// economy celebrations). World ↔ UI communicate via this + stores, never directly.
import type { Badge, SubmitResponse } from "@/framework/api/schemas";

export type ToastKind = "info" | "success" | "error";

export interface EventMap {
  session_lost: string; // reason
  toast: { message: string; kind: ToastKind };
  coins_changed: number; // new balance
  badge_awarded: Badge;
  activity_completed: SubmitResponse;
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
