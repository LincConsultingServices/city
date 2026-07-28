// The Café's room — pure data and pure logic. No Pixi, no React, no DOM, so the
// layout invariants that actually matter (is the staff zone sealed? can you reach
// every corner?) are unit-testable on their own (room.test.ts).
//
// The room is laid out on the city's own isometric grid (TILE_W 132 × TILE_H 66,
// @/lib/iso) so walking in from Market Street never changes the camera angle.
// Contents, palette and prop list come from cafe.jpg — see cafedev.md §2-3.
//
//        x0    x1    x2    x3    x4    x5    x6    x7    x8    x9
//  y0    ▓W    ▓W    ▓M    ▓W    ▓A    ▓A    ▓W    ▓A    ▓T    ▓T   back wall
//  y1    ·p    ·p    ·     ·     ·     ·     ▓P    ·     ·     ·    STAFF ZONE
//  y2    ▓C    ▓C    ▓C    ╪F    ▓C    ▓C    ·     ·     ▓X    ▓X   counter run
//  y3    ▓s    ▓s    ·     ·     ▓s    ·     ·     ▓J    ·     ▓X
//  y4    ·     ·     ·     ▒r    ▒r    ·     ▒o    ·     ·     ▓R   open lane
//  y5    ▓1    ▓c    ·     ▒r    ▒r    ▓2    ·     ·     ·     ·
//  y6    ▓c    ·     ·     ·     ·     ▓c    ·     ▓3    ▓c    ·
//  y7    ▓w    ▓w    ▓w    ▒D    ▓w    ▓w    ▓w    ▓w    ▓w    ▓w   front wall
import { TILE_W, TILE_H } from "@/lib/iso";
import type { Cell, Grid } from "@/lib/pathfinding";

export const ROOM_W = 10;
export const ROOM_H = 8;

/** On-screen size of the whole room, in world pixels — drives the fit-to-viewport camera. */
export const ROOM_PX_W = (ROOM_W + ROOM_H) * (TILE_W / 2);
export const ROOM_PX_H = (ROOM_W + ROOM_H) * (TILE_H / 2);

export const SPAWN: Cell = { x: 3, y: 6 }; // just inside the door, facing into the room
export const EXIT: Cell = { x: 3, y: 7 }; // the door threshold

// ── Props ─────────────────────────────────────────────────────────────────────

export type PropKind =
  // walls and architecture
  | "wall_plank"
  | "wall_window"
  | "wall_menu"
  | "wall_art"
  /**
   * The near edge of the room. Kept low on purpose: a full-height wall between
   * the camera and the floor would stand in front of the player every time they
   * walked along the front of the room.
   */
  | "wall_sill"
  | "stairs"
  // the counter run
  | "counter"
  | "flap"
  | "stool"
  // furniture
  | "table"
  | "chair"
  | "dresser"
  | "jukebox"
  | "radiator"
  | "plant"
  // walk-over dressing
  | "rug_persian"
  | "rug_oval"
  | "door_mat"
  // overlays — drawn on a host cell without claiming it
  | "pastry_case"
  | "espresso_machine"
  | "till";

export interface Furniture {
  kind: PropKind;
  cell: Cell;
  /** false → you can walk over it (rugs, the doormat, the door threshold). */
  blocking: boolean;
  /**
   * Drawn on top of its host cell without claiming it. Overlays are how the
   * pastry case, espresso machine and till exist without eating cells the staff
   * zone needs to stay navigable.
   */
  overlay?: boolean;
}

const f = (kind: PropKind, x: number, y: number, blocking = true): Furniture => ({
  kind,
  cell: { x, y },
  blocking,
});
const over = (kind: PropKind, x: number, y: number): Furniture => ({
  kind,
  cell: { x, y },
  blocking: false,
  overlay: true,
});

export const FURNITURE: readonly Furniture[] = [
  // y0 — the plank back wall: windows with blinds, the menu board, framed art,
  // and the stairs in the far corner (decorative; never climbed).
  f("wall_window", 0, 0),
  f("wall_plank", 1, 0),
  f("wall_menu", 2, 0),
  f("wall_plank", 3, 0),
  f("wall_art", 4, 0),
  f("wall_art", 5, 0),
  f("wall_window", 6, 0),
  f("wall_art", 7, 0),
  f("stairs", 8, 0),
  f("stairs", 9, 0),
  // …with the tall units standing in front of it, drawn but not blocking.
  over("pastry_case", 1, 0),
  over("espresso_machine", 3, 0),

  // y1 — the staff zone. Walkable, and sealed except through the flap. The plant
  // at (6,1) is what closes the right-hand approach; see the reachability tests.
  f("plant", 6, 1),

  // y2 — the counter run. (3,2) is the flap: a gate, not furniture — see GATES.
  f("counter", 0, 2),
  f("counter", 1, 2),
  f("counter", 2, 2),
  f("counter", 4, 2),
  f("counter", 5, 2),
  over("till", 1, 2),
  f("dresser", 8, 2),
  f("dresser", 9, 2),

  // y3 — stools along the bar, the jukebox against the wall, cabinets right.
  f("stool", 0, 3),
  f("stool", 1, 3),
  f("stool", 4, 3),
  f("jukebox", 7, 3),
  f("dresser", 9, 3),

  // y4 — the open lane. Rugs are walk-over; the radiator is not.
  f("rug_persian", 3, 4, false),
  f("rug_persian", 4, 4, false),
  f("rug_oval", 6, 4, false),
  f("radiator", 9, 4),

  // y5 / y6 — the dining floor. Table 3's chair sits at (8,6) rather than (6,5)
  // so the (6,6) corner keeps a way out; room.test.ts locks that in.
  f("table", 0, 5),
  f("chair", 1, 5),
  f("rug_persian", 3, 5, false),
  f("rug_persian", 4, 5, false),
  f("table", 5, 5),
  f("chair", 0, 6),
  f("chair", 5, 6),
  f("table", 7, 6),
  f("chair", 8, 6),

  // y7 — the near edge, with the door and its mat at (3,7). Low sills, not walls:
  // this row sits between the camera and the floor.
  f("wall_sill", 0, 7),
  f("wall_sill", 1, 7),
  f("wall_sill", 2, 7),
  f("door_mat", 3, 7, false),
  f("wall_sill", 4, 7),
  f("wall_sill", 5, 7),
  f("wall_sill", 6, 7),
  f("wall_sill", 7, 7),
  f("wall_sill", 8, 7),
  f("wall_sill", 9, 7),
];

/** Kinds that must never draw over the player — the near edge of the room. */
export const NEAR_EDGE: ReadonlySet<PropKind> = new Set<PropKind>(["wall_sill"]);

// ── The counter flap ──────────────────────────────────────────────────────────

export type GateId = "counter_flap";

export interface Gate {
  id: GateId;
  cell: Cell;
  /** Prompt shown when you are next to it and it is closed / open. */
  openPrompt: string;
  closePrompt: string;
  /** Announced to the live region on each transition. */
  openedSays: string;
  closedSays: string;
}

export const GATES: readonly Gate[] = [
  {
    id: "counter_flap",
    cell: { x: 3, y: 2 },
    openPrompt: "lift the counter flap",
    closePrompt: "lower the counter flap",
    openedSays: "The counter flap is up. You can get behind the bar.",
    closedSays: "The counter flap is down.",
  },
];

// ── Walkability ───────────────────────────────────────────────────────────────

const key = (x: number, y: number) => `${x},${y}`;

const BLOCKED: ReadonlySet<string> = new Set(
  FURNITURE.filter((p) => p.blocking && !p.overlay).map((p) => key(p.cell.x, p.cell.y)),
);

const GATE_AT: ReadonlyMap<string, Gate> = new Map(GATES.map((g) => [key(g.cell.x, g.cell.y), g]));

export const NO_GATES_OPEN: ReadonlySet<GateId> = new Set();

/**
 * The room's collision grid, as a pure function of which gates are open. Satisfies
 * the `Grid` interface `findPath` takes (@/lib/pathfinding), so pathing needs no
 * special-casing — a closed flap is simply a wall.
 */
export function makeRoomGrid(openGates: ReadonlySet<GateId>): Grid {
  return {
    width: ROOM_W,
    height: ROOM_H,
    isWalkable(col, row) {
      if (col < 0 || row < 0 || col >= ROOM_W || row >= ROOM_H) return false;
      const gate = GATE_AT.get(key(col, row));
      if (gate) return openGates.has(gate.id);
      return !BLOCKED.has(key(col, row));
    },
  };
}

// ── Zones ─────────────────────────────────────────────────────────────────────

export type ZoneId = "z_pass" | "z_behind" | "z_window" | "z_floor";

export interface Zone {
  id: ZoneId;
  /** The room's own words, used for prompts and live-region announcements. */
  label: string;
  contains: (cell: Cell) => boolean;
}

/** Ordered — first match wins, so the pass-through beats the wider staff zone. */
export const ZONES: readonly Zone[] = [
  { id: "z_pass", label: "the pass-through", contains: (c) => c.y === 1 && c.x <= 1 },
  { id: "z_behind", label: "behind the counter", contains: (c) => c.y === 1 && c.x <= 5 },
  { id: "z_window", label: "by the window", contains: (c) => c.x >= 8 },
  { id: "z_floor", label: "the floor", contains: () => true },
];

export function zoneAt(cell: Cell): Zone {
  return ZONES.find((z) => z.contains(cell)) ?? ZONES[ZONES.length - 1];
}

/** Every cell the flap gates access to — the sealed side of the counter. */
export const STAFF_CELLS: readonly Cell[] = Array.from({ length: 6 }, (_, x) => ({ x, y: 1 }));

// ── Proximity ─────────────────────────────────────────────────────────────────

const manhattan = (a: Cell, b: Cell) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

/** Standing on or beside the door. */
export function exitNear(cell: Cell): boolean {
  return manhattan(cell, EXIT) <= 1;
}

/** The gate you are close enough to work, if any. */
export function gateNear(cell: Cell): Gate | null {
  return GATES.find((g) => manhattan(cell, g.cell) <= 1) ?? null;
}

// ── Guided navigation (PRD §14.2) ─────────────────────────────────────────────

export interface Station {
  id: string;
  /** Labelled in the room's own words, never "object_04". */
  label: string;
  cell: Cell;
}

export const STATIONS: readonly Station[] = [
  { id: "st_counter", label: "the counter", cell: { x: 2, y: 3 } },
  { id: "st_flap", label: "the counter flap", cell: { x: 3, y: 3 } },
  { id: "st_jukebox", label: "the jukebox", cell: { x: 6, y: 3 } },
  { id: "st_tables", label: "the tables", cell: { x: 2, y: 5 } },
  { id: "st_window", label: "by the window", cell: { x: 8, y: 4 } },
  { id: "st_door", label: "the door", cell: { x: 3, y: 6 } },
];
