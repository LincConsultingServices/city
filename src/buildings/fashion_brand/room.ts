// MAISON's room — pure data and pure logic. No Pixi, no React, no DOM, so the
// layout invariants that actually matter (is every station reachable? does the
// ramp reach everything the steps do?) are unit-testable on their own
// (room.test.ts). Mirrors the Café's room module, which is the shape the
// interior framework expects.
//
// Laid out on the city's own isometric grid (@/lib/iso) so walking in from
// Market Street never changes the camera angle.
//
// The plan is docs/maison.md §3.1: two levels in one volume. The boutique is at
// street level; the atelier sits on a raised platform at the back, open to it by
// sightline, reached by four broad steps AND a ramp. The ramp is not only
// accessibility housekeeping (§15) — it is how rails get wheeled between the two,
// so it earns its place in the fiction as well as in the a11y audit.
//
//       x0   x1   x2   x3   x4   x5   x6   x7   x8   x9   x10  x11
// y0    ▓W   ▓W   ▓N   ▓N   ▓N   ▓N   ▓N   ▓N   ▓N   ▓N   ▓W   ▓W    back wall · north light
// y1    ▓T   ▓T   ·    ▓M   ▓M   ▓M   ·    ▓B   ·    ▓F   ▓F   ·     cutting table · machines ×3 · Élise's bench · forms
// y2    ·    ·    ·    ·    ·    ·    ·    ·    ·    ▓F   ▓F   ·     ATELIER
// y3    ·    ▓S   ·    ·    ·    ·    ·    ·    ·    ·    ·    ·     shelving · cloth bolts
// y4    ▓C   ·    ·    ·    ·    ·    ·    ·    ·    ·    ·    ·     the steel column · the countdown
// y5    ▓=   ▓=   ▓=   ░↑   ░↑   ▓=   ▓=   ▓=   ▓=   ░/   ░/   ▓=    BALUSTRADE · steps (↑) · ramp (/)
// y6    ▓P   ·    ·    ·    ·    ·    ·    ·    ·    ·    ·    ·     press wall, along the stair run
// y7    ▓P   ·    ·    ·    ·    ·    ·    ·    ·    ·    ▓A   ▓A    fitting alcove
// y8    ▓P   ·    ·    ·    ·    ▓R   ▓R   ·    ·    ·    ▓A   ▓I    the RAIL · the mirror
// y9    ·    ·    ·    ·    ·    ·    ·    ·    ·    ·    ▓A   ▓A
// y10   ▓D   ▓D   ·    ·    ·    ·    ·    ·    ·    ·    ·    ·     the desk · the lookbook · the phone
// y11   ·    ·    ·    ·    ·    ·    ·    ·    ·    ·    ·    ·     BOUTIQUE — four metres of nothing, on purpose
// y12   ·    ·    ·    ·    ·    ·    ·    ·    ·    ·    ·    ·
// y13   ▓G   ▓G   ▓G   ▓G   ▒o   ▓G   ▓G   ▓G   ▓G   ▓G   ▓G   ▓G    shopfront glass · the heavy door
import { TILE_W, TILE_H } from "@/lib/iso";
import type { Cell, Grid } from "@/lib/pathfinding";

export const ROOM_W = 12;
export const ROOM_H = 14;

/**
 * One cell of shell outside the play area, on the two sides the layout leaves
 * open. §3.1 makes the ceiling "the single most important number in the room",
 * and a floor slab in a void conveys no height at all — MAISON was reading as a
 * platform floating in black rather than a tall room you are standing inside.
 *
 * It sits OUTSIDE the grid deliberately: it costs no walkable cell, it moves no
 * prop, and every invariant over FURNITURE stays exactly as it was.
 */
export const SHELL = 1;

/** On-screen size of the whole room including its shell, in world pixels. */
export const ROOM_PX_W = (ROOM_W + ROOM_H + 4 * SHELL) * (TILE_W / 2);
export const ROOM_PX_H = (ROOM_W + ROOM_H + 4 * SHELL) * (TILE_H / 2);

/**
 * §3.2 — you spawn at the desk, facing the rail with the atelier behind it and
 * above it. In one frame: your product, your team, and the light they work in.
 */
export const SPAWN: Cell = { x: 2, y: 11 };
/** The shopfront door. Always available (§7). */
export const EXIT: Cell = { x: 4, y: 13 };

/** The balustrade row — the lip of the raised platform. */
export const PLATFORM_EDGE_Y = 5;
/** §3.1: the atelier sits 0.9 m up. Rendered as a lift, not a separate scene. */
export const PLATFORM_RISE_PX = 22;

export type Level = "boutique" | "atelier";

/** Which level a cell is on. The balustrade row is the transition itself. */
export const levelAt = (cell: Cell): Level =>
  cell.y < PLATFORM_EDGE_Y ? "atelier" : cell.y === PLATFORM_EDGE_Y ? "atelier" : "boutique";

// ── Props ─────────────────────────────────────────────────────────────────────

export type PropKind =
  // architecture
  | "wall_plaster"
  | "wall_north" // the tall atelier windows — the only honest light in the building
  | "shopfront_glass"
  | "door"
  | "balustrade"
  | "steps"
  | "ramp"
  | "column" // the steel column the countdown is chalked on
  // the boutique
  | "rail" // hero
  | "desk"
  | "mirror" // hero
  | "alcove"
  | "press_frame"
  | "dress_form"
  // the atelier
  | "cutting_table"
  | "machine"
  | "bench"
  | "shelving"
  | "press_steam"
  /**
   * The near edge of the room. Kept low on purpose: a full-height wall on the
   * side nearest the camera would stand between you and the boutique floor.
   */
  | "wall_sill";

export interface Furniture {
  kind: PropKind;
  cell: Cell;
  /** false → you can walk over it (the door threshold, the steps, the ramp). */
  blocking: boolean;
}

/**
 * Kinds that must never draw over the player — the near edge of the room.
 *
 * The shopfront is the frontmost row, so by depth alone it would clip the feet
 * of anyone walking the front of the boutique. There is nothing between it and
 * the camera for it to occlude anyway. (The Café solved this same bug with the
 * same set; MAISON had it.)
 */
export const NEAR_EDGE: ReadonlySet<PropKind> = new Set<PropKind>([
  "shopfront_glass",
  "door",
  "wall_sill",
]);

const f = (kind: PropKind, x: number, y: number, blocking = true): Furniture => ({
  kind,
  cell: { x, y },
  blocking,
});

const row = (kind: PropKind, y: number, xs: number[], blocking = true): Furniture[] =>
  xs.map((x) => f(kind, x, y, blocking));

export const FURNITURE: readonly Furniture[] = [
  // ── back wall, with the north light across the middle of it ────────────────
  ...row("wall_plaster", 0, [0, 1, 10, 11]),
  ...row("wall_north", 0, [2, 3, 4, 5, 6, 7, 8, 9]),

  // ── the atelier: the only room in MAISON that is actually working ──────────
  f("cutting_table", 0, 1),
  f("cutting_table", 1, 1),
  ...row("machine", 1, [3, 4, 5]),
  f("bench", 7, 1), // Élise's
  f("dress_form", 9, 1),
  f("dress_form", 10, 1),
  f("dress_form", 9, 2),
  f("dress_form", 10, 2),
  f("shelving", 1, 3), // the cloth bolts — how `cash` reads (§12)
  f("press_steam", 11, 1),
  f("column", 0, 4), // the countdown, chalked

  // ── the platform edge: balustrade, with the steps and the ramp through it ──
  ...row("balustrade", PLATFORM_EDGE_Y, [0, 1, 2, 5, 6, 7, 8, 11]),
  ...row("steps", PLATFORM_EDGE_Y, [3, 4], false),
  ...row("ramp", PLATFORM_EDGE_Y, [9, 10], false),

  // ── the boutique ───────────────────────────────────────────────────────────
  // The press wall runs down the stair side. You pass it six times a session.
  ...row("press_frame", 6, [0]),
  ...row("press_frame", 7, [0]),
  ...row("press_frame", 8, [0]),
  // THE RAIL — centre floor, under the only hard light in the building (§3.3).
  f("rail", 5, 8),
  f("rail", 6, 8),
  // The fitting alcove, and the full-height mirror in it (§3.4).
  ...row("alcove", 7, [10, 11]),
  f("alcove", 10, 8),
  f("mirror", 11, 8),
  ...row("alcove", 9, [10, 11]),
  // The desk: the lookbook has been on it all along, and so has the phone.
  f("desk", 0, 10),
  f("desk", 1, 10),

  // ── the shopfront: glass, and a heavy door with no bell ────────────────────
  ...row("shopfront_glass", 13, [0, 1, 2, 3, 5, 6, 7, 8, 9, 10, 11]),
  f("door", 4, 13, false),
];

/**
 * The shell: the two edges the room does not wall itself.
 *
 * `y = 0` is already the back wall and `y = ROOM_H - 1` is already the shopfront,
 * so only the two side runs are missing. The far side (x = -1) is full height and
 * sorts behind everything; the near side (x = ROOM_W) is a low sill, because a
 * full wall there would stand between the camera and the boutique floor — the
 * same reason the Café keeps its own near edge low.
 */
export const SHELL_WALLS: readonly Furniture[] = [
  ...Array.from({ length: ROOM_H + SHELL }, (_, i) => f("wall_plaster", -SHELL, i - SHELL)),
  ...Array.from({ length: ROOM_H }, (_, y) => f("wall_sill", ROOM_W, y)),
];

// ── Walkability ───────────────────────────────────────────────────────────────

const key = (x: number, y: number) => `${x},${y}`;

const BLOCKED: ReadonlySet<string> = new Set(
  FURNITURE.filter((p) => p.blocking).map((p) => key(p.cell.x, p.cell.y)),
);

/**
 * Every cell a given prop stands on. `room.ts` is the single source of layout
 * truth, so anything that needs to draw at a prop — or stand in front of one —
 * derives its coordinates from here rather than restating them. Three separate
 * lists of "where the machines are" had already drifted apart before this.
 */
export const cellsOf = (kind: PropKind): Cell[] =>
  FURNITURE.filter((p) => p.kind === kind).map((p) => p.cell);

/** Cells you cross to change level — the steps and the ramp (§3.1, §15). */
export const STEP_CELLS: readonly Cell[] = cellsOf("steps");
export const RAMP_CELLS: readonly Cell[] = cellsOf("ramp");

/** The brass the season hangs on (§3.3). */
export const RAIL_CELLS: readonly Cell[] = cellsOf("rail");
/** The frames along the stair run, filled from `press` (§12). */
export const PRESS_CELLS: readonly Cell[] = cellsOf("press_frame");
/** The shelf the cloth bolts sit on — how `cash` reads in the room (§12). */
export const SHELF_CELL: Cell = cellsOf("shelving")[0];
/** The steel column the countdown is chalked on (§3.5). */
export const COLUMN_CELL: Cell = cellsOf("column")[0];
/** The desk: the lookbook, the resale printout and the paperwork (§12, §13). */
export const DESK_CELLS: readonly Cell[] = cellsOf("desk");

/**
 * Where the ambient workers stand — one step in FRONT of the machine each is
 * running, because the machines themselves are solid. Derived, so a machine
 * that moves takes its operator with it (§5.8).
 */
export const WORKER_CELLS: readonly Cell[] = cellsOf("machine").map((c) => ({
  x: c.x,
  y: c.y + 1,
}));

/**
 * The room's collision grid. Satisfies the `Grid` interface `findPath` takes
 * (@/lib/pathfinding), so pathing needs no special-casing.
 *
 * `closed` exists for one reason: the §18.2.6 ramp-parity check walks the room
 * with the steps sealed off and proves every station is still reachable. No
 * content is ever gated behind the steps in play.
 */
export function makeRoomGrid(closed: readonly Cell[] = []): Grid {
  const shut = new Set(closed.map((c) => key(c.x, c.y)));
  return {
    width: ROOM_W,
    height: ROOM_H,
    isWalkable(col, row) {
      if (col < 0 || row < 0 || col >= ROOM_W || row >= ROOM_H) return false;
      if (shut.has(key(col, row))) return false;
      return !BLOCKED.has(key(col, row));
    },
  };
}

// ── Zones (§3.1) ──────────────────────────────────────────────────────────────

export type ZoneId = "z_atelier" | "z_stair" | "z_fitting" | "z_rail" | "z_boutique";

export interface Zone {
  id: ZoneId;
  /** The house's own words, used for prompts and live-region announcements. */
  label: string;
  contains: (cell: Cell) => boolean;
}

/** Ordered — first match wins, so the rail's pool of light beats the wider floor. */
export const ZONES: readonly Zone[] = [
  { id: "z_atelier", label: "the atelier", contains: (c) => c.y <= PLATFORM_EDGE_Y },
  { id: "z_stair", label: "the stair", contains: (c) => c.x <= 1 && c.y >= 6 && c.y <= 9 },
  {
    id: "z_fitting",
    label: "the fitting alcove",
    contains: (c) => c.x >= 9 && c.y >= 6 && c.y <= 9,
  },
  {
    id: "z_rail",
    label: "the rail",
    contains: (c) => c.x >= 4 && c.x <= 7 && c.y >= 7 && c.y <= 9,
  },
  { id: "z_boutique", label: "the floor", contains: () => true },
];

export function zoneAt(cell: Cell): Zone {
  return ZONES.find((z) => z.contains(cell)) ?? ZONES[ZONES.length - 1];
}

// ── Proximity ─────────────────────────────────────────────────────────────────

const manhattan = (a: Cell, b: Cell) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

/** Standing on or beside the door. */
export const exitNear = (cell: Cell): boolean => manhattan(cell, EXIT) <= 1;

// ── Guided navigation and the things you can act on (§7) ──────────────────────

export interface Station {
  id: string;
  /** Labelled in the house's own words, never "object_04" (§15). */
  label: string;
  /** Where you stand to use it — always a walkable cell, never the prop itself. */
  cell: Cell;
  /** The diegetic prompt, when this station is one you can act on. */
  prompt?: string;
  /**
   * The prop you click in the room to come here. Every sprite of this kind
   * becomes a hotspot, so any of the three press frames walks you to the press
   * wall. Stations reached on foot alone leave this off (§7).
   */
  prop?: PropKind;
}

export const STATIONS: readonly Station[] = [
  // The six the scenario spine stages its beats at (§8).
  {
    id: "st_desk",
    label: "the desk",
    cell: { x: 2, y: 10 },
    prompt: "read the lookbook",
    prop: "desk",
  },
  {
    id: "st_rail",
    label: "the rail",
    cell: { x: 5, y: 9 },
    prompt: "look at the collection",
    prop: "rail",
  },
  { id: "st_boutique_floor", label: "the floor", cell: { x: 6, y: 11 } },
  { id: "st_bench", label: "Élise's bench", cell: { x: 7, y: 2 }, prop: "bench" },
  { id: "st_atelier", label: "the atelier", cell: { x: 5, y: 3 } },
  {
    id: "st_press_wall",
    label: "the press wall",
    cell: { x: 1, y: 7 },
    prompt: "read the press wall",
    prop: "press_frame",
  },
  // The rest of §7's guided-navigation list.
  {
    id: "st_fitting",
    label: "the fitting alcove",
    cell: { x: 9, y: 8 },
    prompt: "look in the mirror",
    prop: "mirror",
  },
  { id: "st_stair", label: "the stair", cell: { x: 3, y: 6 } },
  {
    id: "st_cutting_table",
    label: "the cutting table",
    cell: { x: 1, y: 2 },
    prop: "cutting_table",
  },
  {
    id: "st_column",
    label: "the column",
    cell: { x: 1, y: 4 },
    prompt: "read the countdown",
    prop: "column",
  },
  // §9.6 — the phone is at the desk, and it works at every beat, always, free.
  { id: "st_phone", label: "the desk phone", cell: { x: 1, y: 11 }, prompt: "call Véra" },
];

export const stationById = (id: string): Station | undefined => STATIONS.find((s) => s.id === id);

/** The station a given prop belongs to — how a click in the room finds a target. */
export const stationForProp = (kind: PropKind): Station | undefined =>
  STATIONS.find((s) => s.prop === kind);

/** The station you are close enough to use, if any. */
export function stationNear(cell: Cell): Station | null {
  let best: Station | null = null;
  let bestDist = Infinity;
  for (const s of STATIONS) {
    const d = manhattan(cell, s.cell);
    if (d <= 1 && d < bestDist) {
      best = s;
      bestDist = d;
    }
  }
  return best;
}
