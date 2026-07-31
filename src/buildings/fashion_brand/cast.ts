// Who is in the building, and where they stand (§5).
//
// Pure, so the two rules that actually matter are tests rather than a
// walkthrough: never more than five on screen, and the atelier's ambient workers
// are the swing capacity — they thin out when a named character comes downstairs.
//
// Presence follows the fiction rather than a schedule. Élise is always here; she
// works here. Ines is in and out constantly and turns up when she has something
// to relay. Véra is NOT in the building by default — she appears at C2, and the
// rest of the time she is a phone call (§9.6). Dov, having bought a percentage,
// simply keeps being around afterwards, which is §12's `equity` made visible.
import type { Cell } from "@/lib/pathfinding";
import { makeRoomGrid, stationById } from "./room";
import type { PersonPalette } from "@/world/characterArt";
import { BEATS, type Track } from "./season";
import { nextBeat } from "./beats";
import type { Decision } from "./maisonStore";
import type { MaisonWorld } from "./world";

export type CastId = "elise" | "kobby" | "vera" | "ines" | "helene" | "dov" | "rio";

/** §5's cap. The room is big; the point is that it is never crowded. */
export const MAX_ON_SCREEN = 5;

export interface CastMember {
  id: CastId;
  name: string;
  /** Where they are, doing what they do (§5 "Anchor"). */
  anchor: Cell;
  palette: PersonPalette;
  /**
   * Élise is the only person in the building who stands still, which is why she
   * reads instantly from the boutique floor. Everyone else drifts.
   */
  standsStill: boolean;
}

// §4 spends the one saturated colour on the rail, so nobody wears vermilion —
// Kobby is the most colourful person in the room without taking the house's hue.
const CAST: Record<CastId, CastMember> = {
  elise: {
    id: "elise",
    name: "Élise",
    anchor: { x: 7, y: 2 }, // her bench
    palette: { shirt: 0x8e9199, legs: 0x3f4149, skin: 0xe8cfb2, hair: 0xc9c6bf },
    standsStill: true,
  },
  kobby: {
    id: "kobby",
    name: "Kobby",
    anchor: { x: 1, y: 2 }, // the cutting table
    palette: { shirt: 0x2f8f86, legs: 0x2b2f3a, skin: 0x8a5a3c, hair: 0x241a14 },
    standsStill: false,
  },
  vera: {
    id: "vera",
    name: "Véra",
    anchor: { x: 2, y: 10 }, // the desk. She sits when everyone else stands.
    palette: { shirt: 0x22242a, legs: 0x1b1d22, skin: 0xecd6bc, hair: 0xd8d5cf },
    standsStill: true,
  },
  ines: {
    id: "ines",
    name: "Ines",
    anchor: { x: 5, y: 12 }, // the floor near the door. Never goes upstairs.
    palette: { shirt: 0xbb9b6a, legs: 0x35323a, skin: 0xdfba95, hair: 0x2b2119 },
    standsStill: false,
  },
  helene: {
    id: "helene",
    name: "Hélène",
    anchor: { x: 5, y: 9 }, // the rail, touching the garments
    palette: { shirt: 0x5a6a80, legs: 0x2c333f, skin: 0xefd9bd, hair: 0x453a30 },
    standsStill: true,
  },
  dov: {
    id: "dov",
    name: "Dov",
    anchor: { x: 3, y: 10 }, // the desk. Sits, uninvited, and it is not rude.
    palette: { shirt: 0x7c7466, legs: 0x3a352f, skin: 0xe6c9a6, hair: 0x5b5148 },
    standsStill: true,
  },
  rio: {
    id: "rio",
    name: "Rio",
    anchor: { x: 6, y: 11 }, // roams the floor. Never sits.
    palette: { shirt: 0xd9d3c6, legs: 0x24262b, skin: 0xc79a72, hair: 0x1d1712 },
    standsStill: false,
  },
};

export interface RoomCast {
  named: CastMember[];
  /** Atelier workers on the shared loop — the swing capacity (§5.8). */
  workers: number;
  /** One boutique client, who mostly buys nothing, which is accurate (§5.8). */
  client: boolean;
}

const GRID = makeRoomGrid();
const key = (c: Cell) => `${c.x},${c.y}`;

/**
 * Where the host of the live beat actually stands: beside the station §8 stages
 * the beat at, rather than at their idle §5 anchor.
 *
 * The room already claimed this was happening — the HUD reads "Ines is at the
 * rail", guided navigation walks you there, and the comment below said hosts
 * stand at the station — while Ines herself stayed by the door for the whole
 * beat. You were sent across the room to meet somebody who was not there.
 *
 * Beside, not on: the station cell is where the PLAYER stands.
 */
function besideStation(stationId: string, taken: ReadonlySet<string>): Cell | null {
  const station = stationById(stationId);
  if (!station) return null;
  const { x, y } = station.cell;
  const around = [
    { x, y: y - 1 },
    { x: x + 1, y },
    { x, y: y + 1 },
    { x: x - 1, y },
  ];
  return around.find((c) => GRID.isWalkable(c.x, c.y) && !taken.has(key(c))) ?? null;
}

/**
 * Who is in the building right now, already capped. Named characters are never
 * cut — a beat with nobody to bring it is not a beat — so the ambient loop is
 * what gives way, exactly as §5 says it should.
 */
export function castAt(
  track: Track,
  decided: readonly Decision[],
  world: MaisonWorld,
  mood = world.atelier_mood,
): RoomCast {
  const here = new Set<CastId>(["elise"]); // she works here; she is always here

  // Whoever brings this week's problem is standing at its station.
  const beat = nextBeat(track, decided);
  for (const id of beat?.hosts ?? []) here.add(id as CastId);

  // Level B has the favouritism problem in the room from beat one (§14); on
  // Level A Kobby arrives with the beat that is about him.
  if (track === "B") here.add("kobby");

  // Having bought a percentage, Dov keeps being around (§12 `equity`).
  if (world.equity === "sold") here.add("dov");

  // The hosts of the live beat move to it; everyone else keeps their §5 anchor.
  // Idle anchors are reserved first so a host can never be placed on top of one.
  const ids = [...here] as CastId[];
  const hosts = new Set<string>(beat?.hosts ?? []);
  const taken = new Set<string>(
    ids.filter((id) => !hosts.has(id)).map((id) => key(CAST[id].anchor)),
  );
  const named = ids.map((id) => {
    if (!hosts.has(id) || !beat) return CAST[id];
    const anchor = besideStation(beat.station, taken);
    if (!anchor) return CAST[id];
    taken.add(key(anchor));
    return { ...CAST[id], anchor };
  });

  // §6: the mood is carried by how much noise the work makes. A fractured
  // atelier has two benches empty, and that has to be true of the people too,
  // not just the machines.
  const wanted = mood === "fractured" ? 1 : mood === "strained" ? 2 : 3;
  const workers = Math.max(0, Math.min(wanted, MAX_ON_SCREEN - named.length));
  const client = named.length + workers < MAX_ON_SCREEN && mood !== "fractured";

  return { named, workers, client };
}

/** Everyone the building can ever hold, for tests and for the art checklist. */
export const ALL_CAST: CastMember[] = Object.values(CAST);

export const castById = (id: CastId): CastMember => CAST[id];

/** Every cast id the season spine actually stages, so nobody is authored unused. */
export const STAGED_CAST: string[] = [...new Set(BEATS.flatMap((b) => b.hosts))];
