// Guided navigation (§7, §18.2.5). The room is twelve by fourteen and holds
// eleven stations; finding Rio on the boutique floor by walking WASD into him is
// a fine way to play and a poor way to be the only way to play.
//
// This is the list Tab cycles: where the season goes next, then the seven
// stations §7 names, then the phone and the door. It is ordered rather than
// alphabetical because the first entry is the one that moves the season, so
// Tab-once-and-walk is the whole keyboard path through a beat.
//
// Pure. It knows the season and the room, and nothing about React or Pixi.
import type { Cell } from "@/lib/pathfinding";
import { EXIT, STATIONS, stationById } from "./room";
import { nextBeat } from "./beats";
import type { Track } from "./season";
import type { Decision } from "./maisonStore";

export interface GuideTarget {
  /** The station this walks to, or null for the door. */
  stationId: string | null;
  /** Where you end up standing. */
  cell: Cell;
  /** Said aloud on arrival — the house's own words for the place (§15). */
  label: string;
}

/**
 * §7's guided-navigation stations, in the order §7 lists them. The boutique
 * floor and the atelier are not in that list because §7 reaches them "by NPCs
 * by name and role" — which is what the waiting beat at the head of the list
 * does, since those two are exactly where Rio and Élise stand.
 */
const NAMED: readonly string[] = [
  "st_desk",
  "st_rail",
  "st_fitting",
  "st_press_wall",
  "st_stair",
  "st_cutting_table",
  "st_bench",
];

/**
 * Everywhere Tab can take you, best first.
 *
 * The head of the list is wherever the next beat is waiting, named by whoever is
 * holding it — "Ines, at the rail" — because a player navigating by keyboard
 * alone should not have to guess which of eleven stations the season is at. It
 * is a route, not a hint: it says where somebody is standing, not what to say to
 * them (§11).
 */
export function guideTargets(track: Track | null, decided: readonly Decision[]): GuideTarget[] {
  const out: GuideTarget[] = [];
  const seen = new Set<string>();

  const push = (stationId: string, label: string) => {
    if (seen.has(stationId)) return;
    const station = stationById(stationId);
    if (!station) return;
    seen.add(stationId);
    out.push({ stationId, cell: station.cell, label });
  };

  const beat = track ? nextBeat(track, decided) : null;
  if (beat) {
    const where = stationById(beat.station)?.label ?? "the floor";
    push(beat.station, `${beat.host}, at ${where}`);
  }

  for (const id of NAMED) push(id, stationById(id)?.label ?? id);
  push("st_phone", "the desk phone");

  // Always last, and always there: §7 makes the shopfront door permanent.
  out.push({ stationId: null, cell: EXIT, label: "the shopfront door" });
  return out;
}

/** Step through the list, wrapping both ways. */
export function stepGuide(index: number, delta: number, length: number): number {
  if (length <= 0) return 0;
  return (((index + delta) % length) + length) % length;
}

/** Every station is on the list, or reachable from one that is (§18.2.5). */
export const GUIDE_NAMED_IDS = NAMED;
export const ALL_STATION_IDS = STATIONS.map((s) => s.id);
