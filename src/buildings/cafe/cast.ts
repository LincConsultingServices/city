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
// §bakePersonTextures), which takes a palette, so seven people cost seven
// palettes and no art. What they wear says who they are before they speak: the
// staff are in the house uniform — white shirt, black apron, black trousers —
// Owen is in a suit because he is the one person here who does not work in this
// room, and everyone who comes in off the street is in their own clothes.
import type { Cell } from "@/lib/pathfinding";
import type { Cardinal } from "@/world/assets";
import type { PersonPalette } from "@/world/characterArt";
import { CAFE_CAST, paletteOf } from "@/ui/characters";
import { GUIDE, type GuidePlace } from "./room";
import type { Speaker } from "./Sheet";

export type CastId = "priya" | "owen" | "tomas" | "marcus" | "nadia" | "ray" | "ellery";

/**
 * Anyone the room draws: somewhere to stand, a loop to walk, a palette, and how
 * close you get before they look up. The cast are figures you can talk to; the
 * crew (crew.ts) are figures you cannot.
 */
export interface Figure {
  id: string;
  palette: PersonPalette;
  anchor: Cell;
  patrol: readonly Cell[];
  seated: boolean;
  noticesAt: number;
}

export interface CastMember extends Figure {
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
   * Where you stand to talk to them, when that is not their own cell.
   *
   * **Required for anyone seated.** A seated person is on furniture, furniture
   * is blocked, and the guided-navigation list routes you to the cell it is
   * given: aimed at the chair itself it finds no path, says "there's no way
   * through to there", and leaves a keyboard-only player unable to reach the
   * one person in the room worth reaching.
   */
  approach?: Cell;
  /**
   * How close you have to be before they look up, in cells. The counter is a
   * cell deep, so anything under 2 means the staff never acknowledge a customer.
   */
  noticesAt: number;
  /**
   * How close you have to be to speak to them. Two for anyone working behind the
   * counter or standing at it, because the counter run is a solid cell between
   * you; one for anyone sitting down, because you go to their table.
   */
  talkRadius: number;
  /**
   * What they say when there is nothing going on. Cycled, in character, and
   * about the room rather than about you — nobody in this building comments on
   * how the player is doing.
   */
  ambientLines: readonly string[];
}

/**
 * Seven people, two of whom are in the room (ADR-005 §15 caps skinned meshes,
 * and the fiction caps them harder — this is a café with four staff, not a
 * crowd). `castFor` decides which; the rest are written and waiting for the
 * stages of the career that come after the interview.
 */
export const CAST: readonly CastMember[] = [
  {
    id: "priya",
    name: "Priya",
    role: "head barista",
    // Warm skin, dark hair losing its tie, in the house uniform like the rest
    // of the staff. She is findable by where she stands: at the machine.
    palette: paletteOf(CAFE_CAST.priya.look),
    anchor: { x: 4, y: 1 }, // at the machine, which stands on the wall behind her
    // machine → grinder → the end of the counter run → back. She rarely leaves
    // the bar and never leaves the staff side of it.
    patrol: [
      { x: 4, y: 1 },
      { x: 5, y: 1 },
      { x: 6, y: 1 },
    ],
    // Where you go to speak to her: across the counter at the pickup, the one
    // spot every point of her loop is in earshot of. Without it the guided list
    // sends you to her cell, behind a counter you cannot walk through.
    approach: { x: 5, y: 3 },
    seated: false,
    noticesAt: 3,
    talkRadius: 3,
    ambientLines: [
      "Machine's warm. We're good for the morning.",
      "Two of the oat cartons are near date. I put them at the front so they go first.",
      "Marcus was in at twenty to. Same as ever.",
      "I did the grinder. Don't touch the grinder.",
    ],
  },
  {
    id: "tomas",
    name: "Tomas",
    role: "second barista",
    palette: paletteOf(CAFE_CAST.tomas.look),
    anchor: { x: 5, y: 1 }, // the grinder end
    patrol: [
      { x: 5, y: 1 },
      { x: 8, y: 1 }, // through to the pass-through and back
    ],
    seated: false,
    noticesAt: 2,
    talkRadius: 2,
    ambientLines: [
      "I moved my Thursday. It's fine — I cleared it.",
      "Bar's set. I'd do the milk fridge next if it were me.",
      "You want me on the machine or on the till? I'm faster on the machine.",
    ],
  },
  {
    id: "marcus",
    name: "Marcus",
    role: "the regular",
    // A coat he never takes off, and the most static silhouette in the room.
    palette: paletteOf(CAFE_CAST.marcus.look),
    anchor: { x: 9, y: 6 }, // T3's chair, the four-top by the window
    approach: { x: 9, y: 7 }, // the floor in front of his table
    patrol: [],
    seated: true,
    // He looks up when you are at the table, not when you cross the room. Being
    // hard to distract is the character.
    noticesAt: 1,
    talkRadius: 1,
    ambientLines: [
      "Morning. Don't let me hold you up.",
      "Paper's mostly adverts now. I still read it.",
      "You've got a queue building. Go on.",
    ],
  },
  {
    id: "nadia",
    name: "Nadia",
    role: "the commuter",
    palette: paletteOf(CAFE_CAST.nadia.look),
    anchor: { x: 3, y: 3 }, // at the till, the customer side. She never sits.
    patrol: [],
    seated: false,
    noticesAt: 2,
    talkRadius: 2, // you serve her from behind the counter, which is two cells
    ambientLines: [
      "Just the one. I'm already late.",
      "Card. Always card.",
      "Is it still the flat white you do? I never remember.",
    ],
  },
  {
    id: "ray",
    name: "Ray",
    role: "the food truck",
    palette: paletteOf(CAFE_CAST.ray.look),
    anchor: { x: 4, y: 3 }, // leaning on the counter, once he is finally inside
    patrol: [],
    seated: false,
    noticesAt: 3,
    talkRadius: 2,
    ambientLines: [
      "Your crowd, my fries. Tell me what's wrong with that.",
      "I'm parked till four either way. Come out and look at it.",
      "You've got the corner and the coffee. I've got the fryer. That's the whole pitch.",
    ],
  },
  {
    id: "owen",
    name: "Owen",
    role: "the area manager",
    // A charcoal suit and a tie in a café: he is the one person here who does
    // not work in this room, and he should read that way before he says anything.
    palette: paletteOf(CAFE_CAST.owen.look),
    anchor: { x: 7, y: 6 }, // the room side of the four-top, laptop open on it
    approach: { x: 7, y: 7 }, // the empty floor you cross the room to stand on
    patrol: [],
    seated: true,
    noticesAt: 3,
    talkRadius: 1,
    // He is between interviews, not making conversation. Nothing here comments
    // on the player — that rule does not relax just because he is the assessor.
    ambientLines: [
      "Take a seat whenever you're ready.",
      "Nine of these, and then I'll tell you what I think.",
      "The wifi in here is terrible. Doesn't matter, this is all offline.",
    ],
  },
  {
    id: "ellery",
    name: "Ellery",
    role: "the office buyer",
    // Cooler than anything else in the room, on purpose — she is the one person
    // here lit slightly wrong for a café.
    palette: paletteOf(CAFE_CAST.ellery.look),
    anchor: { x: 9, y: 5 }, // standing over T3 — Marcus's table, which she takes
    patrol: [],
    seated: false,
    noticesAt: 2,
    talkRadius: 1,
    ambientLines: [
      "Take your time. I've got the table till eleven.",
      "It's a good spot, this. Quiet enough to work in.",
      "I should say we're also talking to the place by the station.",
    ],
  },
];

/**
 * Who is in the room when you walk in.
 *
 * **Priya is unremovable**, and that is an acceptance criterion rather than a
 * convention: a café with nobody behind the counter is not a café, and she is the
 * speaker anything without a host falls back to.
 *
 * **Owen is unremovable too, and for a blunter reason** — he is why you came in.
 */
export const OPENING_CAST: readonly CastId[] = ["priya", "owen"];

/**
 * Who is in the room, for a posting.
 *
 * The five who were benched when the season was taken out are back, and they
 * arrive with the stages that give them something to do. That was always the
 * intent — the note left on `CAST` said they were staying "because the stages
 * after the interview will want them" — and the rule is the same one that
 * emptied the room in the first place: **somebody you cannot do anything with
 * reads as clutter rather than as life.**
 *
 * So they arrive by posting, not all at once:
 *
 *   - **candidate** — Priya and Owen. You are here for one conversation.
 *   - **employee** — the regulars arrive, because working the counter means
 *     serving them: Marcus in his chair, Nadia on her way through.
 *   - **branch_manager** — Tomas, because the pass is his and the team is now
 *     the job.
 *   - **ceo** — Ray and Ellery, the two people who turn up when the business is
 *     yours to negotiate with. Owen stops coming; there is nobody left to
 *     review you.
 */
export function castFor(role: string = "candidate"): CastId[] {
  switch (role) {
    case "employee":
      return ["priya", "owen", "marcus", "nadia"];
    case "branch_manager":
      return ["priya", "owen", "tomas", "marcus"];
    case "ceo":
      return ["priya", "tomas", "marcus", "ray", "ellery"];
    default:
      return [...OPENING_CAST];
  }
}

export function castById(id: CastId): CastMember | null {
  return CAST.find((m) => m.id === id) ?? null;
}

/**
 * Everything a conversation box needs to show who is speaking. The portrait is
 * their design in ui/characters.ts — or their painted art, once it is dropped
 * into assets/characters as `<id>.png`.
 */
export function speakerFor(id: CastId): Speaker | null {
  const m = castById(id);
  if (!m) return null;
  return { id, name: m.name, role: m.role, look: CAFE_CAST[id].look };
}

/** The people in the room right now, in declaration order. */
export function castPresent(present: readonly CastId[]): CastMember[] {
  return CAST.filter((m) => present.includes(m.id));
}

/**
 * Somebody and the cell they are standing on *now*. Priya walks her loop, so
 * asking where she is has to mean the sprite rather than the anchor — otherwise
 * the prompt to speak to her hangs in the air at the machine after she has moved
 * on, and disappears where she actually is.
 */
export interface CastAt {
  member: CastMember;
  cell: Cell;
}

/** Everyone at the cell they start from. The layout view, and what tests use. */
export function atAnchors(present: readonly CastId[]): CastAt[] {
  return castPresent(present).map((member) => ({ member, cell: member.anchor }));
}

/**
 * The person you are close enough to speak to, if any. Ties go to whoever is
 * nearer, then to declaration order, so the answer never depends on which way
 * you happened to walk in.
 */
export function castNear(cell: Cell, present: readonly CastAt[]): CastMember | null {
  let best: CastMember | null = null;
  let bestDist = Infinity;
  for (const { member, cell: theirs } of present) {
    const d = manhattan(cell, theirs);
    if (d <= member.talkRadius && d < bestDist) {
      best = member;
      bestDist = d;
    }
  }
  return best;
}

/**
 * The guided-navigation list with the people in it — the places first, then
 * whoever is in the room, by name and role (ADR-005 §14.2). Cast entries walk
 * you to the cell beside them rather than onto them.
 */
export function guideWithCast(
  present: readonly CastAt[],
  places: readonly GuidePlace[] = GUIDE,
): GuidePlace[] {
  return [
    ...places,
    ...present.map(({ member, cell }) => ({
      id: member.id,
      label: `${member.name}, ${member.role}`,
      // Their own cell if you can stand on it, otherwise the floor beside them.
      // Anyone working the staff row is spoken to across the counter, from the
      // floor in front of where they are — their own cell is behind a flap
      // that may well be down.
      cell: member.approach ?? (cell.y === STAFF_ROW ? { x: cell.x, y: STAFF_ROW + 2 } : cell),
    })),
  ];
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

/** The row behind the counter run (room.ts §layout); the counter itself is the row below. */
const STAFF_ROW = 1;

const manhattan = (a: Cell, b: Cell) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

/** Unhurried. Slower than the player's 175 px/sec — nobody here is in a rush. */
export const CAST_WALK_SPEED = 52;
/** How long they stand at each patrol point before moving on. */
export const CAST_PAUSE_S = 4.5;
