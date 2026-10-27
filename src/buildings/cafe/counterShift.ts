// Who comes up to you during a stage you run from one spot — and when.
//
// A shift at the till, the branch at the pass, the business at the table: each
// is worked from a station, and each scene there is somebody coming to you.
// They walk up — a customer in off the street, Tomas from the grinder, Ray from
// his truck — and only once they are standing in front of you do they say what
// they want. Somebody arriving is what starts a conversation, so the scene
// waits for them rather than appearing in front of an empty spot.
//
// Pure data, like cast.ts — the canvas walks them (walkInView.ts), the
// interior waits for them (Interior.tsx), the decision box shows who they are.
import type { Cell } from "@/lib/pathfinding";
import type { Cardinal } from "@/world/assets";
import type { PersonPalette } from "@/world/characterArt";
import { CAFE_CREW, CROWD, paletteOf } from "@/ui/characters";
import { ORDER_AT, DOOR } from "./customers";
import { castById, speakerFor, type CastId } from "./cast";
import { CREW } from "./crew";
import type { Scene, Stage } from "./journey";
import type { Speaker } from "./Sheet";

/** Where you stand to work the till: the staff side of it, under ORDER & PAY. */
export const TILL_STATION = "st_till";

/** Where a customer stands to be served: in front of the till. */
export const SERVE_AT: Cell = ORDER_AT;

/** How a stage worked from one spot brings people to you. */
export interface WalkUpPlan {
  /** Where they stop, and which way they face you from there. */
  serveAt: Cell;
  face: Cardinal;
  /** Whether the staff come over too, or only people from outside. */
  staffToo: boolean;
  /**
   * Who a unit is, where the scene does not say ("room") or has no speaker at
   * all (a tree). Unit id → cast or crew id.
   */
  who?: Readonly<Record<string, string>>;
}

const PLANS: Readonly<Record<string, WalkUpPlan>> = {
  // The till: customers, in off the street, to the front of it.
  "cafe.l1": { serveAt: ORDER_AT, face: "N", staffToo: false },
  // The pass: your team comes to you, along the staff side of the counter.
  // The scene about somebody clocking in late is about Sam, and so is the one
  // where you catch somebody serving well.
  "cafe.l2": {
    serveAt: { x: 7, y: 1 },
    face: "E",
    staffToo: true,
    who: { "cafe.l2.s1": "crew_till", "cafe.l2.s3": "crew_till" },
  },
  // The table that is yours now: whoever has the business decision brings it.
  // A product that is not selling is Priya's to report, the food truck is Ray,
  // the numbers are Tomas, and the competition is Ellery's news.
  "cafe.l3": {
    serveAt: { x: 9, y: 5 },
    face: "W",
    staffToo: true,
    who: {
      "cafe.l3.s1": "priya",
      "cafe.l3.s2": "ray",
      "cafe.l3.s3": "tomas",
      "cafe.l3.s4": "ellery",
    },
  },
};

/** The staff: they come over from where they work, not in through the door. */
const STAFF: ReadonlySet<string> = new Set(["priya", "tomas", "owen", "crew_till", "crew_kitchen"]);

/** The walk-up plan for a stage, if it has people come to you. */
export function planFor(stage: Stage | undefined): WalkUpPlan | null {
  return (stage && PLANS[stage.id]) ?? null;
}

/** True for a shift worked at the till, whose scenes are customers coming up to it. */
export function servesAtTill(stage: Stage | undefined): boolean {
  return !!stage && stage.kind === "scenarios" && stage.station === TILL_STATION;
}

/** One unit of a stage, as far as who comes for it is concerned. */
export interface Unit {
  unitId: string;
  /** The scene's own speaker; trees have none. */
  speaker?: string;
}

/** The units of a stage people come to you for, in play order. */
export function unitsFor(stage: Stage | undefined): Unit[] {
  if (!stage) return [];
  return [
    ...(stage.scenes ?? []).map((s: Scene) => ({ unitId: s.unitId, speaker: s.speaker })),
    ...(stage.trees ?? []).map((t) => ({ unitId: t.unitId })),
  ];
}

/** Somebody coming up to you for a unit. */
export interface WalkIn {
  /** The unit they are here for. Changes when the next one is due. */
  key: string;
  /** The cast or crew member it is, when it is somebody named. */
  who: string | null;
  palette: PersonPalette;
  speaker: Speaker;
  /** Where they come from and go back to: the door, or their own spot. */
  from: Cell;
  serveAt: Cell;
  face: Cardinal;
}

/** A named person's palette, speaker and own spot, cast or crew. */
function person(id: string): { palette: PersonPalette; speaker: Speaker; home: Cell } | null {
  const member = castById(id as CastId);
  if (member) {
    return {
      palette: member.palette,
      speaker: speakerFor(member.id)!,
      home: member.anchor,
    };
  }
  const crew = CREW.find((c) => c.id === id);
  const design = (CAFE_CREW as Record<string, (typeof CAFE_CREW)[keyof typeof CAFE_CREW]>)[id];
  if (crew && design) {
    return {
      palette: crew.palette,
      speaker: { id, name: design.name, role: design.role, look: design.look },
      home: crew.anchor,
    };
  }
  return null;
}

/**
 * Who comes up for `unit`, the `n`th of the stage. A named person is
 * themselves; "a customer" is somebody from the crowd, a different one each
 * time. Null when nobody walks up for it.
 */
export function walkInFor(stage: Stage | undefined, unit: Unit, n: number): WalkIn | null {
  const plan = planFor(stage);
  if (!plan) return null;
  const id = plan.who?.[unit.unitId] ?? unit.speaker ?? "room";
  if (STAFF.has(id) && !plan.staffToo) return null;
  const base = { key: unit.unitId, serveAt: plan.serveAt, face: plan.face };
  const named = id === "room" ? null : person(id);
  if (named) {
    return {
      ...base,
      who: id,
      palette: named.palette,
      speaker: named.speaker,
      from: STAFF.has(id) ? named.home : DOOR,
    };
  }
  const look = CROWD[n % CROWD.length];
  return {
    ...base,
    who: null,
    palette: paletteOf(look),
    speaker: { name: "Customer", role: "at the till", look },
    from: DOOR,
  };
}

/** Who is due right now, for the unit on screen. */
export function walkInNow(stage: Stage | undefined, unit: Unit | undefined): WalkIn | null {
  if (!unit) return null;
  const n = unitsFor(stage).findIndex((u) => u.unitId === unit.unitId);
  return walkInFor(stage, unit, Math.max(0, n));
}

/**
 * The named people who come in through the door during this stage, kept out of
 * their usual places for the whole of it so nobody is in the room twice.
 */
export function walkInCast(stage: Stage | undefined): Set<string> {
  const out = new Set<string>();
  unitsFor(stage).forEach((u, i) => {
    const w = walkInFor(stage, u, i);
    if (w?.who && !STAFF.has(w.who)) out.add(w.who);
  });
  return out;
}

/**
 * Staff who stay at their own spot during this stage instead of walking their
 * loop: the ones who come over to you (so they set off from where you expect
 * them), and the cook, whose loop runs through the pass you are standing at.
 */
export function stillFor(stage: Stage | undefined): Set<string> {
  const out = new Set<string>();
  unitsFor(stage).forEach((u, i) => {
    const w = walkInFor(stage, u, i);
    if (w?.who && STAFF.has(w.who)) out.add(w.who);
  });
  if (stage?.station === "st_pass" && planFor(stage)) out.add("crew_kitchen");
  return out;
}
