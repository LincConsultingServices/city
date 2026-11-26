// Meridian Bank's room — pure data and pure logic. No Pixi, no React, no DOM, so
// the layout rules that matter (can you reach every counter? does nobody stand
// inside a desk?) are unit tests (room.test.ts). Same shape as the Café's and
// MAISON's room modules, which is what the interior framework expects.
//
// Laid out on the city's own isometric grid (@/lib/iso), so walking in from
// Downtown never changes the camera angle.
//
//       x0  x1  x2  x3  x4  x5  x6  x7  x8  x9  x10 x11 x12 x13 x14 x15
// y0    W   W   W   W   W   W   W   Wc  W   WL  W   W   W   WV  W   W    back wall · clock · logo · vault
// y1    Bk  ·   ·   Mg  P   G   Fc  ·   ·   ·   Bd  Bd  ·   ·   ·   Sf   MANAGER'S OFFICE | back office
// y2    ·   ·   Md  Md  ·   G   ·   ·   ·   ·   ·   ·   ·   ·   ·   ·
// y3    ·   ·   ·   ·   ·   G   ·   ·   T1  ·   T2  ·   T3  ·   ·   ·    tellers stand here
// y4    ·   ·   ·   ·   ·   G   C   C   C1  C   C2  C   C3  C   C   C    THE COUNTER (three windows)
// y5    G   G   G   gd  G   ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   P    glass front of the office · its door
// y6    Rb  ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ·    rates board
// y7    Pp  ·   ·   ·   ·   ·   Lr  ·   ·   ·   ·   ·   ·   Da  Do  ·    passbook printer · leaflets · NEW ACCOUNTS
// y8    At  ·   ·   ·   Ft  ·   ·   ·   Bn  Bn  Bn  ·   ·   ·   ·   ·    ATM · form table · benches
// y9    At  ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   Ds  Fa  ·    ATM · · SAVINGS & DEPOSITS
// y10   Db  ·   ·   Ro  ·   ·   ·   ·   Bn  Bn  Bn  ·   ·   ·   ·   ·    drop box · Rosa · benches
// y11   ·   ·   ·   Wd  Wd  ·   ·   ·   ·   ·   ·   ·   ·   Dl  So  ·    welcome desk · LOANS
// y12   P   ·   ·   ·   ·   ·   Tk  ·   ·   ·   Gu  ·   ·   ·   ·   P    token machine · the guard
// y13   S   S   S   S   S   S   S   D   S   S   S   S   S   S   S   S    glass shopfront · the door
//
// Customers keep to the front half; the counter and the glass office split the
// back into rooms the staff work in. You can see into all of it — the vault,
// the tellers, the manager at his desk — but only the office has a door for you.
import { TILE_W, TILE_H } from "@/lib/iso";
import type { Cell, Grid } from "@/lib/pathfinding";

export const ROOM_W = 16;
export const ROOM_H = 14;

/** One cell of wall outside the play area on the two open sides (see MAISON). */
export const SHELL = 1;

/** On-screen size of the whole room including its shell, in world pixels. */
export const ROOM_PX_W = (ROOM_W + ROOM_H + 4 * SHELL) * (TILE_W / 2);
export const ROOM_PX_H = (ROOM_W + ROOM_H + 4 * SHELL) * (TILE_H / 2);

/** You arrive just inside the door, facing the counter. */
export const SPAWN: Cell = { x: 7, y: 12 };
/** The front door. Always available. */
export const EXIT: Cell = { x: 7, y: 13 };

/** The counter row. Everything behind it is staff only. */
export const COUNTER_Y = 4;

// ── Props ─────────────────────────────────────────────────────────────────────

export type PropKind =
  // architecture
  | "wall"
  | "wall_clock"
  | "wall_logo"
  | "wall_vault"
  | "shopfront"
  | "door"
  | "wall_sill"
  | "glass"
  | "glass_door"
  // the counter and the back office
  | "counter"
  | "counter_window"
  | "filing_cabinet"
  | "back_desk"
  | "safe"
  // the manager's office
  | "bookshelf"
  | "manager_desk"
  // the banking hall
  | "rates_board"
  | "passbook_printer"
  | "atm"
  | "drop_box"
  | "form_table"
  | "leaflet_rack"
  | "bench"
  | "desk"
  | "welcome_desk"
  | "token_machine"
  | "plant";

export interface Furniture {
  kind: PropKind;
  cell: Cell;
  /** false → you can walk over it (the door, the office's glass door). */
  blocking: boolean;
}

/** Kinds that must never draw over the player — the near edge of the room. */
export const NEAR_EDGE: ReadonlySet<PropKind> = new Set<PropKind>([
  "shopfront",
  "door",
  "wall_sill",
]);

const f = (kind: PropKind, x: number, y: number, blocking = true): Furniture => ({
  kind,
  cell: { x, y },
  blocking,
});

const range = (from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, i) => from + i);

const row = (kind: PropKind, y: number, xs: number[], blocking = true): Furniture[] =>
  xs.map((x) => f(kind, x, y, blocking));

const col = (kind: PropKind, x: number, ys: number[], blocking = true): Furniture[] =>
  ys.map((y) => f(kind, x, y, blocking));

/** The three teller windows, left to right. */
export const WINDOW_XS = [8, 10, 12] as const;

export const FURNITURE: readonly Furniture[] = [
  // ── the back wall ───────────────────────────────────────────────────────────
  ...row(
    "wall",
    0,
    range(0, 15).filter((x) => x !== 7 && x !== 9 && x !== 13),
  ),
  f("wall_clock", 7, 0),
  f("wall_logo", 9, 0),
  f("wall_vault", 13, 0),

  // ── the manager's office: glass on two sides, so he can see the hall ───────
  f("bookshelf", 0, 1),
  f("plant", 4, 1),
  f("manager_desk", 2, 2),
  f("manager_desk", 3, 2),
  ...col("glass", 5, [1, 2, 3, 4]),
  // The corner post at (5,5) closes the gap a diagonal step would slip through.
  ...row("glass", 5, [0, 1, 2, 4, 5]),
  f("glass_door", 3, 5, false),

  // ── the back office, behind the counter ─────────────────────────────────────
  f("filing_cabinet", 6, 1),
  f("back_desk", 10, 1),
  f("back_desk", 11, 1),
  f("safe", 15, 1),

  // ── the counter: three windows, the rest solid wood ─────────────────────────
  ...row(
    "counter",
    COUNTER_Y,
    range(6, 15).filter((x) => !(WINDOW_XS as readonly number[]).includes(x)),
  ),
  ...row("counter_window", COUNTER_Y, [...WINDOW_XS]),
  f("plant", 15, 5),

  // ── the left wall: everything that works without a person ──────────────────
  f("rates_board", 0, 6),
  f("passbook_printer", 0, 7),
  f("atm", 0, 8),
  f("atm", 0, 9),
  f("drop_box", 0, 10),

  // ── the banking hall ────────────────────────────────────────────────────────
  f("leaflet_rack", 6, 7),
  f("form_table", 4, 8),
  ...row("bench", 8, [8, 9, 10]),
  ...row("bench", 10, [8, 9, 10]),

  // ── the desks down the right: accounts, savings, loans ──────────────────────
  f("desk", 13, 7),
  f("desk", 13, 9),
  f("desk", 13, 11),

  // ── by the door ─────────────────────────────────────────────────────────────
  f("welcome_desk", 3, 11),
  f("welcome_desk", 4, 11),
  f("token_machine", 6, 12),
  f("plant", 0, 12),
  f("plant", 15, 12),

  // ── the shopfront: glass, and the door ──────────────────────────────────────
  ...row(
    "shopfront",
    ROOM_H - 1,
    range(0, 15).filter((x) => x !== EXIT.x),
  ),
  f("door", EXIT.x, EXIT.y, false),
];

/**
 * The shell: the two edges the room does not wall itself. The far side (x = -1)
 * is full height; the near side (x = ROOM_W) is a low sill, so it never stands
 * between the camera and the hall.
 */
export const SHELL_WALLS: readonly Furniture[] = [
  ...Array.from({ length: ROOM_H + SHELL }, (_, i) => f("wall", -SHELL, i - SHELL)),
  ...Array.from({ length: ROOM_H }, (_, y) => f("wall_sill", ROOM_W, y)),
];

// ── Walkability ───────────────────────────────────────────────────────────────

const key = (x: number, y: number) => `${x},${y}`;

const BLOCKED: ReadonlySet<string> = new Set(
  FURNITURE.filter((p) => p.blocking).map((p) => key(p.cell.x, p.cell.y)),
);

/** Every cell a given prop stands on — the one source of layout truth. */
export const cellsOf = (kind: PropKind): Cell[] =>
  FURNITURE.filter((p) => p.kind === kind).map((p) => p.cell);

/**
 * Staff only: behind the counter. You can see it all, but there is no way round
 * the counter, so it is walled off by the furniture itself — this is just the
 * test's name for that area.
 */
export const isBackOffice = (c: Cell): boolean => c.x >= 6 && c.y >= 1 && c.y < COUNTER_Y;

/** The room's collision grid, in the shape `findPath` takes. */
export function makeRoomGrid(): Grid {
  return {
    width: ROOM_W,
    height: ROOM_H,
    isWalkable(x, y) {
      if (x < 0 || y < 0 || x >= ROOM_W || y >= ROOM_H) return false;
      return !BLOCKED.has(key(x, y));
    },
  };
}

// ── Zones ─────────────────────────────────────────────────────────────────────

export type ZoneId =
  | "z_office"
  | "z_counter"
  | "z_self_service"
  | "z_desks"
  | "z_waiting"
  | "z_entrance"
  | "z_hall";

export interface Zone {
  id: ZoneId;
  label: string;
  contains: (cell: Cell) => boolean;
}

/** Ordered — first match wins. */
export const ZONES: readonly Zone[] = [
  { id: "z_office", label: "the manager's office", contains: (c) => c.x <= 4 && c.y <= 4 },
  { id: "z_counter", label: "the counter", contains: (c) => c.x >= 6 && c.y === 5 },
  { id: "z_self_service", label: "self-service", contains: (c) => c.x <= 2 && c.y >= 6 && c.y <= 10 },
  { id: "z_desks", label: "the customer desks", contains: (c) => c.x >= 12 && c.y >= 6 },
  {
    id: "z_waiting",
    label: "the waiting area",
    contains: (c) => c.x >= 7 && c.x <= 11 && c.y >= 7 && c.y <= 11,
  },
  { id: "z_entrance", label: "the entrance", contains: (c) => c.y >= 11 },
  { id: "z_hall", label: "the banking hall", contains: () => true },
];

export function zoneAt(cell: Cell): Zone {
  return ZONES.find((z) => z.contains(cell)) ?? ZONES[ZONES.length - 1];
}

// ── Proximity ─────────────────────────────────────────────────────────────────

const manhattan = (a: Cell, b: Cell) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

/** Standing on or beside the door. */
export const exitNear = (cell: Cell): boolean => manhattan(cell, EXIT) <= 1;

// ── Stations: the places you can walk to and use ─────────────────────────────

export interface Station {
  id: string;
  /** In the bank's own words, never "object_04". */
  label: string;
  /** Where you stand to use it — always a walkable cell, never the prop itself. */
  cell: Cell;
  /** What pressing E does here, shown on the prompt. */
  prompt: string;
  /** The prop you click in the room to come here. */
  prop?: PropKind;
  /** Only the first prop of this kind — for kinds shared by several stations. */
  propCell?: Cell;
}

export const STATIONS: readonly Station[] = [
  { id: "st_welcome", label: "the welcome desk", cell: { x: 3, y: 12 }, prompt: "talk to Rosa", prop: "welcome_desk" },
  { id: "st_token", label: "the ticket machine", cell: { x: 6, y: 11 }, prompt: "take a ticket", prop: "token_machine" },
  { id: "st_window1", label: "window 1", cell: { x: 8, y: 5 }, prompt: "talk to Mei", prop: "counter_window", propCell: { x: 8, y: 4 } },
  { id: "st_window2", label: "window 2", cell: { x: 10, y: 5 }, prompt: "talk to Omar", prop: "counter_window", propCell: { x: 10, y: 4 } },
  { id: "st_window3", label: "window 3", cell: { x: 12, y: 5 }, prompt: "read the sign", prop: "counter_window", propCell: { x: 12, y: 4 } },
  { id: "st_accounts", label: "New Accounts", cell: { x: 12, y: 7 }, prompt: "talk to Daniel", prop: "desk", propCell: { x: 13, y: 7 } },
  { id: "st_savings", label: "Savings & Deposits", cell: { x: 12, y: 9 }, prompt: "talk to Farah", prop: "desk", propCell: { x: 13, y: 9 } },
  { id: "st_loans", label: "Loans", cell: { x: 12, y: 11 }, prompt: "talk to Sofia", prop: "desk", propCell: { x: 13, y: 11 } },
  { id: "st_manager", label: "the manager's office", cell: { x: 3, y: 3 }, prompt: "talk to Mr Hale", prop: "manager_desk" },
  { id: "st_rates", label: "the rates board", cell: { x: 1, y: 6 }, prompt: "read the rates", prop: "rates_board" },
  { id: "st_printer", label: "the passbook printer", cell: { x: 1, y: 7 }, prompt: "use the printer", prop: "passbook_printer" },
  { id: "st_atm", label: "the ATMs", cell: { x: 1, y: 8 }, prompt: "use the ATM", prop: "atm" },
  { id: "st_dropbox", label: "the cheque drop box", cell: { x: 1, y: 10 }, prompt: "read the drop box", prop: "drop_box" },
  { id: "st_forms", label: "the form table", cell: { x: 4, y: 9 }, prompt: "look at the forms", prop: "form_table" },
  { id: "st_leaflets", label: "the leaflet rack", cell: { x: 6, y: 8 }, prompt: "read a leaflet", prop: "leaflet_rack" },
  { id: "st_waiting", label: "the waiting area", cell: { x: 9, y: 9 }, prompt: "sit and wait", prop: "bench" },
  { id: "st_guard", label: "the security guard", cell: { x: 10, y: 11 }, prompt: "talk to Ben" },
];

export const stationById = (id: string): Station | undefined => STATIONS.find((s) => s.id === id);

/** The station a clicked prop belongs to — how a click in the room finds a target. */
export function stationForProp(kind: PropKind, cell: Cell): Station | undefined {
  const matches = STATIONS.filter((s) => s.prop === kind);
  return (
    matches.find((s) => s.propCell && s.propCell.x === cell.x && s.propCell.y === cell.y) ??
    matches.find((s) => !s.propCell)
  );
}

/** The station you are close enough to use, if any — the nearest within a step. */
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
