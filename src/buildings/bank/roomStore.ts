// Where you are in the bank, and what is open. Per-visit: it dies with the
// interior. Same split as the Café and MAISON — the Pixi ticker writes through
// `getState()`, React reads through selectors, and setters are identity-guarded
// because the ticker calls them every frame.
import { create } from "zustand";
import type { Cell } from "@/lib/pathfinding";
import { audio } from "@/framework/audio/audioManager";
import { SPAWN, stationById, zoneAt, type ZoneId } from "./room";
import { staffAtStation, type StaffId } from "./cast";

/** What is open over the room. */
export type Panel =
  | { kind: "talk"; staff: StaffId }
  | { kind: "rates" }
  | { kind: "leaflets" }
  | { kind: "map" }
  | { kind: "open_account" }
  | { kind: "passbook" }
  | { kind: "close_account" }
  | { kind: "ticket" }
  | { kind: "slip"; slip: "deposit" | "withdrawal" }
  | { kind: "printer" }
  | { kind: "window2" }
  | { kind: "payin"; dropBox: boolean }
  | { kind: "cash_cheque" }
  | { kind: "chequebook" }
  | { kind: "spot" }
  | { kind: "calculator" }
  | { kind: "open_deposit"; deposit: "fd" | "rd" }
  | { kind: "my_deposits" }
  | { kind: "transfer" }
  | { kind: "salary" }
  | { kind: "credit" }
  | { kind: "borrow" }
  | { kind: "my_loan" }
  | { kind: "atm" };

export interface Announcement {
  text: string;
  /** Bumped on every push so repeating the same text still re-announces. */
  seq: number;
}

/**
 * What a ticket is for. A real branch splits its queue the same way: cash at
 * window 1, cheques and passbooks at window 2.
 */
export type TicketService = "cash" | "desk";

export const SERVICE_WINDOW: Record<TicketService, 1 | 2> = { cash: 1, desk: 2 };
const SERVICE_LETTER: Record<TicketService, string> = { cash: "A", desk: "B" };

/** The queue. Your ticket, and the number the screen over the counter shows. */
export interface Queue {
  serving: number;
  ticket: number | null;
  service: TicketService | null;
  /** The window your ticket was called to, once it has been. */
  calledTo: number | null;
}

/** The ticket the hall is on when you walk in. */
export const FIRST_SERVING = 41;

interface RoomState {
  charCell: Cell;
  zoneId: ZoneId;
  nearExit: boolean;
  nearStationId: string | null;
  inputLocked: boolean;
  panel: Panel | null;
  /** A request from the DOM for the room to walk somewhere. */
  walkTo: Cell | null;
  queue: Queue;
  /** The last thing a station said, shown on screen for a few seconds. */
  note: Announcement;
  announcement: Announcement;

  setCharCell: (cell: Cell) => void;
  setNearExit: (near: boolean) => void;
  setNearStation: (id: string | null) => void;
  setInputLocked: (locked: boolean) => void;
  setPanel: (panel: Panel | null) => void;
  setWalkTo: (cell: Cell | null) => void;
  setQueue: (queue: Queue) => void;
  announce: (text: string) => void;
  /** Say something on screen AND to a screen reader. */
  say: (text: string) => void;
}

const fresh = () => ({
  charCell: { ...SPAWN },
  zoneId: zoneAt(SPAWN).id,
  nearExit: false,
  nearStationId: null,
  inputLocked: false,
  panel: null,
  walkTo: null,
  queue: { serving: FIRST_SERVING, ticket: null, service: null, calledTo: null },
  note: { text: "", seq: 0 },
  announcement: { text: "", seq: 0 },
});

export const useRoomStore = create<RoomState>((set) => ({
  ...fresh(),

  setCharCell: (charCell) =>
    set((s) => {
      if (s.charCell.x === charCell.x && s.charCell.y === charCell.y) return s;
      const zoneId = zoneAt(charCell).id;
      return zoneId === s.zoneId ? { charCell } : { charCell, zoneId };
    }),
  setNearExit: (nearExit) => set((s) => (s.nearExit === nearExit ? s : { nearExit })),
  setNearStation: (nearStationId) =>
    set((s) => (s.nearStationId === nearStationId ? s : { nearStationId })),
  setInputLocked: (inputLocked) =>
    set((s) => (s.inputLocked === inputLocked ? s : { inputLocked })),
  setPanel: (panel) => set({ panel }),
  setWalkTo: (walkTo) => set({ walkTo }),
  setQueue: (queue) => set({ queue }),
  announce: (text) => set((s) => ({ announcement: { text, seq: s.announcement.seq + 1 } })),
  say: (text) =>
    set((s) => ({
      note: { text, seq: s.note.seq + 1 },
      announcement: { text, seq: s.announcement.seq + 1 },
    })),
}));

/** Fresh state for a new visit: just inside the door, nothing open. */
export function resetRoomState(): void {
  useRoomStore.setState(fresh());
}

/** The ticket label as the screen shows it: A-043 for cash, B-043 for window 2. */
export const ticketLabel = (n: number, service: TicketService | null = "cash") =>
  `${SERVICE_LETTER[service ?? "cash"]}-${String(n).padStart(3, "0")}`;

/** Take a ticket for a service. Two people are ahead of you; it moves quickly. */
export function takeTicket(service: TicketService): void {
  const s = useRoomStore.getState();
  const q = s.queue;
  const ticket = q.serving + 2;
  s.setQueue({ serving: q.serving, ticket, service, calledTo: null });
  s.say(
    `Your ticket: ${ticketLabel(ticket, service)}. Now serving ${ticketLabel(q.serving, service)}. Watch the screen over the counter.`,
  );
}

/** Whether your ticket has been called to this window. */
export function calledTo(window: 1 | 2): boolean {
  return useRoomStore.getState().queue.calledTo === window;
}

/** You have been served: the ticket is done with. */
export function finishTicket(): void {
  const s = useRoomStore.getState();
  s.setQueue({ ...s.queue, ticket: null, service: null, calledTo: null });
}

/** Walk to a station from the "go to" list. */
export function travelTo(stationId: string): boolean {
  const s = useRoomStore.getState();
  const station = stationById(stationId);
  if (s.inputLocked || !station) return false;
  s.setWalkTo(station.cell);
  s.announce(`Walking to ${station.label}.`);
  return true;
}

/**
 * Advance the queue by one. Called on a timer by the shell while you hold a
 * ticket; when your number comes up it names a window, and the window is
 * whichever of the two open ones is free — the two take turns.
 */
export function tickQueue(): void {
  const s = useRoomStore.getState();
  const q = s.queue;
  if (q.ticket === null || q.calledTo !== null || q.service === null) return;
  const serving = q.serving + 1;
  if (serving >= q.ticket) {
    const window = SERVICE_WINDOW[q.service];
    s.setQueue({ ...q, serving: q.ticket, calledTo: window });
    audio.play("ui_open");
    s.say(`Ticket ${ticketLabel(q.ticket, q.service)}, please go to window ${window}.`);
    return;
  }
  s.setQueue({ ...q, serving });
}

/**
 * What the thing in front of you does. One guarded path, reached from the E key
 * and from a click on the prop or the person, so the two cannot drift.
 */
export function actHere(): boolean {
  const s = useRoomStore.getState();
  if (s.inputLocked) return false;

  const id = s.nearStationId;
  const person = id ? staffAtStation(id) : undefined;
  if (person) {
    audio.play("ui_open");
    s.setPanel({ kind: "talk", staff: person.id });
    s.announce(`${person.name}, ${person.role}.`);
    return true;
  }

  const read = (text: string) => {
    audio.play("ui_click");
    s.say(text);
    return true;
  };

  switch (id) {
    case "st_token": {
      const q = s.queue;
      if (q.ticket !== null && q.calledTo === null) {
        return read(
          `You already have ticket ${ticketLabel(q.ticket, q.service)}. Now serving ${ticketLabel(q.serving, q.service)}.`,
        );
      }
      audio.play("ui_open");
      s.setPanel({ kind: "ticket" });
      return true;
    }
    case "st_window3":
      return read("Window 3 is closed. A brass sign says: \"Please use windows 1 and 2.\"");
    case "st_rates":
      audio.play("ui_open");
      s.setPanel({ kind: "rates" });
      return true;
    case "st_leaflets":
      audio.play("ui_open");
      s.setPanel({ kind: "leaflets" });
      return true;
    case "st_printer":
      audio.play("ui_open");
      s.setPanel({ kind: "printer" });
      return true;
    case "st_atm":
      audio.play("ui_open");
      s.setPanel({ kind: "atm" });
      return true;
    case "st_dropbox":
      audio.play("ui_open");
      s.setPanel({ kind: "payin", dropBox: true });
      return true;
    case "st_forms":
      return read(
        "Trays of slips: deposit slips, withdrawal slips, account opening forms. The pens are on little chains, as always.",
      );
    case "st_waiting": {
      const q = s.queue;
      return read(
        q.ticket === null
          ? "Padded benches, a table of old magazines. Most people waiting are holding a ticket from the machine by the door."
          : `You sit for a moment. The screen says ${ticketLabel(q.serving, q.service)}; your ticket is ${ticketLabel(q.ticket, q.service)}.`,
      );
    }
  }

  audio.play("ui_error");
  s.announce("Nothing to use from here.");
  return false;
}
