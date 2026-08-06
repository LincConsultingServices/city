// The Café's cast — who is in the room, where they stand, and what they do when
// nothing is being asked of them.
//
// Pure data and pure logic, like room.ts: no Pixi, no store, no ticker. The
// things worth locking down are layout facts — nobody is anchored inside a wall,
// whoever is seated has a chair under them, and everyone can actually be walked
// up to — and those are unit-testable only if this file stays free of a
// renderer. castView.ts does the drawing.
//
// Characters are drawn with the city's own procedural rig (world/characterArt.ts
// §bakePersonTextures), which takes a palette, so six people cost six palettes
// and no art. The palettes are pulled toward the room's own colours rather than
// the city's, because these are people who work here.
import type { Cell } from "@/lib/pathfinding";
import type { Cardinal } from "@/world/assets";
import type { PersonPalette } from "@/world/characterArt";

export type CastId = "priya" | "tomas" | "marcus" | "nadia" | "ray" | "ellery";

export interface CastMember {
  id: CastId;
  name: string;
  /** How they are introduced — "Priya, head barista" in the guided-nav list. */
  role: string;
  palette: PersonPalette;
  /** Where they are when nothing is happening. */
  anchor: Cell;
  /**
   * The cells they move between while idle, anchor first, looping. Empty means
   * they never leave the anchor.
   */
  patrol: readonly Cell[];
  /**
   * Sitting on furniture rather than standing on floor, so their cell is a
   * blocked one and they never walk.
   */
  seated: boolean;
  /**
   * How close you have to be before they look up, in cells. The counter is a
   * cell deep, so anything under 2 means the staff never acknowledge a customer.
   */
  noticesAt: number;
  /**
   * How close you have to be to speak to them. Priya's is 2 because the whole
   * point of a counter is that you talk across it; Marcus's is 1 because you go
   * to his table.
   */
  talkRadius: number;
}

/**
 * Six people, four of whom are never in the room at the same time (ADR-005 §15
 * caps skinned meshes, and the fiction caps them harder — this is a café with
 * four staff, not a crowd).
 */
export const CAST: readonly CastMember[] = [
  {
    id: "priya",
    name: "Priya",
    role: "head barista",
    // Warm skin, dark hair losing its tie, and the one green element that makes
    // her findable across the room — the room's own green, so she belongs to it.
    palette: { shirt: 0x4e7a3c, legs: 0x2f3a52, skin: 0xc98e5a, hair: 0x241d18 },
    anchor: { x: 4, y: 1 }, // at the machine, which stands on the wall behind her
    // machine → grinder → the end of the counter run → back. She rarely leaves
    // the bar and never leaves the staff side of it.
    patrol: [
      { x: 4, y: 1 },
      { x: 5, y: 1 },
      { x: 6, y: 1 },
    ],
    seated: false,
    noticesAt: 3,
    talkRadius: 2,
  },
  {
    id: "tomas",
    name: "Tomas",
    role: "second barista",
    palette: { shirt: 0xb5836a, legs: 0x3a3134, skin: 0xf0d9b5, hair: 0x5a5a5a },
    anchor: { x: 5, y: 1 }, // the grinder end
    patrol: [
      { x: 5, y: 1 },
      { x: 2, y: 1 }, // through to the pass-through and back
    ],
    seated: false,
    noticesAt: 2,
    talkRadius: 2,
  },
  {
    id: "marcus",
    name: "Marcus",
    role: "the regular",
    // A coat he never takes off, and the most static silhouette in the room.
    palette: { shirt: 0x5c3a28, legs: 0x3a3134, skin: 0x8d5a3b, hair: 0xd8d2c8 },
    anchor: { x: 9, y: 6 }, // T3's chair, the four-top by the window
    patrol: [],
    seated: true,
    // He looks up when you are at the table, not when you cross the room. Being
    // hard to distract is the character.
    noticesAt: 1,
    talkRadius: 1,
  },
  {
    id: "nadia",
    name: "Nadia",
    role: "the commuter",
    palette: { shirt: 0x96453f, legs: 0x2c3a45, skin: 0xe8c9a0, hair: 0x201a14 },
    anchor: { x: 3, y: 3 }, // at the till, the customer side. She never sits.
    patrol: [],
    seated: false,
    noticesAt: 2,
    talkRadius: 1,
  },
  {
    id: "ray",
    name: "Ray",
    role: "the food truck",
    palette: { shirt: 0xc9a227, legs: 0x4a4139, skin: 0xd9a066, hair: 0x2e2622 },
    anchor: { x: 4, y: 3 }, // leaning on the counter, once he is finally inside
    patrol: [],
    seated: false,
    noticesAt: 3,
    talkRadius: 2,
  },
  {
    id: "ellery",
    name: "Ellery",
    role: "the office buyer",
    // Cooler than anything else in the room, on purpose — she is the one person
    // here lit slightly wrong for a café.
    palette: { shirt: 0x9fb7bd, legs: 0x33415e, skin: 0xf5e0c4, hair: 0x3b2d23 },
    anchor: { x: 7, y: 6 }, // the far side of T3 — Marcus's table, which she takes
    patrol: [],
    seated: false,
    noticesAt: 2,
    talkRadius: 1,
  },
];

/**
 * Who is in the room before the season has decided anything. Week one of Level A
 * is Priya, Marcus and the customers; everyone else arrives with the mission
 * that needs them.
 */
export const OPENING_CAST: readonly CastId[] = ["priya", "marcus"];

export function castById(id: CastId): CastMember | null {
  return CAST.find((m) => m.id === id) ?? null;
}

/** The people in the room right now, in declaration order. */
export function castPresent(present: readonly CastId[]): CastMember[] {
  return CAST.filter((m) => present.includes(m.id));
}

/**
 * The person you are close enough to speak to, if any. Ties go to whoever is
 * nearer, then to declaration order, so the answer never depends on which way
 * you happened to walk in.
 */
export function castNear(cell: Cell, present: readonly CastId[]): CastMember | null {
  let best: CastMember | null = null;
  let bestDist = Infinity;
  for (const m of castPresent(present)) {
    const d = manhattan(cell, m.anchor);
    if (d <= m.talkRadius && d < bestDist) {
      best = m;
      bestDist = d;
    }
  }
  return best;
}

/**
 * Which way someone at `from` turns to look at `to`, on the map's axes rather
 * than the screen's. The renderer converts screen motion the other way round for
 * the player; here we already have cells, so the dominant axis is the answer.
 */
export function facingFrom(from: Cell, to: Cell): Cardinal {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (dx === 0 && dy === 0) return "S";
  return Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? "E" : "W") : dy > 0 ? "S" : "N";
}

const manhattan = (a: Cell, b: Cell) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

/** Unhurried. Slower than the player's 175 px/sec — nobody here is in a rush. */
export const CAST_WALK_SPEED = 52;
/** How long they stand at each patrol point before moving on. */
export const CAST_PAUSE_S = 4.5;
