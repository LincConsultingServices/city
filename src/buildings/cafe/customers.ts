// Ambient customers (PRD §5.7). Unnamed people in their own clothes on one
// shared loop, the way a real café's visit goes: come in, queue, order and pay at
// the till, wait for it to be made, collect it at the pickup, then either sit
// down at a table to eat and drink or take it away.
//
// They never speak a line the player has to read and they are never an
// objective. Their whole job is to make the room feel like it exists when
// nothing is being asked of you — the difference between a café and a set.
//
// Pure: the phases, the routes, the seats, and how many of them there are.
// customersView.ts walks them. Splitting it that way is what makes the facts
// that actually matter testable without a renderer — nobody is ever routed into
// a wall, every seat is a real chair at a real table, and nobody takes the
// interviewer's chair.
import type { Cell } from "@/lib/pathfinding";
import { EXIT } from "./room";
import type { World } from "./world";

/**
 * One customer's visit, in order. `away` is the resting state — a customer who
 * is not in the room is not drawn and costs nothing but a hidden sprite.
 */
export type Phase =
  | "away"
  | "entering"
  | "queueing"
  | "ordering"
  | "waiting"
  | "collecting"
  | "seating"
  | "seated"
  | "leaving";

/** The door threshold. They arrive and leave through the player's own door. */
export const DOOR: Cell = EXIT;

/** Just inside it, on the floor, where they become a person rather than a bell. */
export const INSIDE: Cell = { x: 4, y: 8 };

/** In front of the till at (2,2), under the ORDER & PAY sign. */
export const ORDER_AT: Cell = { x: 2, y: 3 };

/**
 * The queue, nearest the till first. A customer takes the first free slot and
 * shuffles up as the one ahead of them moves off, which is the read that makes a
 * queue a queue rather than three people standing near each other.
 */
export const QUEUE: readonly Cell[] = [
  { x: 2, y: 4 },
  { x: 2, y: 5 },
  { x: 2, y: 6 },
];

/** In front of the pickup at (5,2), under the PICK UP sign. */
export const PICKUP_AT: Cell = { x: 5, y: 3 };

/**
 * Where you stand once you have paid: along the counter between the pickup and
 * the live kitchen, watching your order being made.
 */
export const WAIT: readonly Cell[] = [
  { x: 6, y: 3 },
  { x: 7, y: 3 },
  { x: 8, y: 3 },
];

/**
 * A place to sit: the chair itself, the floor you step onto it from, and the
 * table it faces — which is where their plate goes. Chairs block, so a seat is
 * reached by walking to `approach` and then sitting down onto `chair`, never by
 * pathfinding through furniture.
 */
export interface Seat {
  chair: Cell;
  approach: Cell;
  table: Cell;
}

/**
 * Every chair a customer may take. The interview table's two chairs are not in
 * here at all: (7,6) is Owen's and (9,6) is Marcus's.
 */
export const SEATS: readonly Seat[] = [
  { chair: { x: 4, y: 5 }, approach: { x: 4, y: 4 }, table: { x: 5, y: 5 } },
  { chair: { x: 6, y: 5 }, approach: { x: 6, y: 4 }, table: { x: 5, y: 5 } },
  { chair: { x: 1, y: 5 }, approach: { x: 1, y: 4 }, table: { x: 1, y: 6 } },
  { chair: { x: 1, y: 7 }, approach: { x: 2, y: 7 }, table: { x: 1, y: 6 } },
  { chair: { x: 10, y: 6 }, approach: { x: 10, y: 5 }, table: { x: 10, y: 7 } },
  { chair: { x: 10, y: 8 }, approach: { x: 9, y: 8 }, table: { x: 10, y: 7 } },
  { chair: { x: 5, y: 8 }, approach: { x: 5, y: 7 }, table: { x: 6, y: 8 } },
  { chair: { x: 7, y: 8 }, approach: { x: 8, y: 8 }, table: { x: 6, y: 8 } },
];

/** Seconds standing at the till, ordering and paying. */
export const ORDER_S = 3.5;
/** Seconds it takes to make an order, from paying to it being ready. */
export const PREP_S: readonly [number, number] = [5, 10];
/** Seconds at the pickup, taking it off the counter. */
export const COLLECT_S = 1.4;
/** Seconds at a table before they gather their things. */
export const SIT_S: readonly [number, number] = [30, 70];
/** Seconds between one bell and the next, before density is applied. */
export const BELL_S: readonly [number, number] = [9, 18];
/** Seconds it takes to sit down onto a chair, or get up off one. */
export const HOP_S = 0.35;

/**
 * How many customers are already at a table when the door opens. A café you walk
 * into is never empty and waiting for its first customer of the day.
 */
export const OPENING_SEATED = 2;

/**
 * How many customers are in the room at once.
 *
 * Five: enough that there is usually somebody in the queue, somebody waiting on
 * an order and a table or two taken — a working café — without so many that the
 * floor is crowded around the player or the interview table.
 *
 * Reduced motion keeps the number and slows the door instead (`nextBell`):
 * an empty café is a different room, not a calmer one (ADR-005 §14.5).
 */
export function crowdSize(): number {
  return 5;
}

/**
 * Seconds until the next bell. Busier rooms ring more often, and `rand` is
 * passed in rather than reached for so the schedule is testable.
 */
export function nextBell(world: World, reduced: boolean, rand: number): number {
  const [lo, hi] = BELL_S;
  const base = lo + (hi - lo) * clamp01(rand);
  const busy = world.regulars === "full" || world.regulars === "returning" ? 0.75 : 1;
  return base * busy * (reduced ? 3 : 1);
}

/** Seconds at the table. */
export function sitFor(rand: number): number {
  const [lo, hi] = SIT_S;
  return lo + (hi - lo) * clamp01(rand);
}

/** Seconds for an order to be made. */
export function prepFor(rand: number): number {
  const [lo, hi] = PREP_S;
  return lo + (hi - lo) * clamp01(rand);
}

/**
 * Takeaway or stay. Two in three sit down when there is somewhere to sit, which
 * is the ratio that keeps the tables looking used without filling them — a café
 * where every single customer sits reads as a restaurant.
 */
export function staysIn(rand: number, freeSeats: number): boolean {
  return freeSeats > 0 && clamp01(rand) < 0.66;
}

/** The next phase after this one finishes, given whether they are staying. */
export function nextPhase(phase: Phase, stays: boolean): Phase {
  switch (phase) {
    case "away":
      return "entering";
    case "entering":
      return "queueing";
    case "queueing":
      return "ordering";
    case "ordering":
      return "waiting";
    case "waiting":
      return "collecting";
    case "collecting":
      return stays ? "seating" : "leaving";
    case "seating":
      return "seated";
    case "seated":
      return "leaving";
    case "leaving":
      return "away";
  }
}

/**
 * Where a customer in this phase is walking to, or null when they are standing.
 * `slot` is their place in whichever line they are in — the queue while
 * queueing, the wait along the counter while waiting.
 */
export function goalFor(phase: Phase, slot: number, seat: Seat | null): Cell | null {
  switch (phase) {
    case "entering":
      return INSIDE;
    case "queueing":
      return QUEUE[Math.min(slot, QUEUE.length - 1)];
    case "ordering":
      return ORDER_AT;
    case "waiting":
      return WAIT[Math.min(slot, WAIT.length - 1)];
    case "collecting":
      return PICKUP_AT;
    case "seating":
      return seat?.approach ?? null;
    case "leaving":
      return DOOR;
    case "away":
    case "seated":
      return null;
  }
}

/** Every floor cell this loop can ever route somebody to. Checked against the grid. */
export function everyRouteCell(): Cell[] {
  return [INSIDE, ORDER_AT, PICKUP_AT, ...QUEUE, ...WAIT, ...SEATS.map((s) => s.approach)];
}

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}
