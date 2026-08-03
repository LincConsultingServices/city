// Which beat the season is on, and where in the room it happens (§8).
//
// Pure, so "does the season actually advance?" is a test rather than a
// playthrough. The room reads this to decide which station is live; the DOM
// reads it for the countdown. Nothing here scores anything.
//
// §8's pacing rule: "the player is free to move; the next beat triggers on
// approach, never on a timer." So a beat is not something that happens TO you —
// it is somewhere you can go, and the room is happy to let you not go there.
import { BEATS, TRACK_LEVEL, type Beat, type Track } from "./season";
import type { Decision } from "./maisonStore";
import { COUNTDOWN_BY_COMPETENCY, type Countdown } from "./world";

/** The activity id this track uses for a beat. */
export const beatActivityId = (beat: Beat, track: Track): string => beat[track].id;

/** The first beat of the season that has not been decided, or null when done. */
export function nextBeat(track: Track, decided: readonly Decision[]): Beat | null {
  const done = new Set(decided.map((d) => d.id));
  return BEATS.find((b) => !done.has(beatActivityId(b, track))) ?? null;
}

/** How far through the season you are — nine of nine is a finished collection. */
export function beatsDecided(track: Track, decided: readonly Decision[]): number {
  const done = new Set(decided.map((d) => d.id));
  return BEATS.filter((b) => done.has(beatActivityId(b, track))).length;
}

export const seasonComplete = (track: Track, decided: readonly Decision[]): boolean =>
  beatsDecided(track, decided) === BEATS.length;

/**
 * The number chalked on the column (§3.5). It is the beat you are ON, not the
 * beat you finished — the countdown does the pressure work, so it should read
 * as time you still have rather than time you spent.
 */
export function countdownFor(track: Track, decided: readonly Decision[]): Countdown {
  const beat = nextBeat(track, decided);
  return beat ? COUNTDOWN_BY_COMPETENCY[beat.competency] : "after";
}

/**
 * The beat waiting at this station, if the season is on it. Only ever ONE beat
 * is live: MAISON is one collection in order, not a menu of nine.
 */
export function liveBeatAt(
  track: Track,
  decided: readonly Decision[],
  stationId: string | null,
): Beat | null {
  if (!stationId) return null;
  const beat = nextBeat(track, decided);
  return beat && beat.station === stationId ? beat : null;
}

/** The prompt the room offers at a live station — who is there, in the fiction. */
export function beatPrompt(beat: Beat): string {
  return beat.host === "the wall" ? "read the reviews" : `talk to ${beat.host}`;
}

/** The registry level a beat runs at on this track. */
export const beatLevel = (track: Track): string => TRACK_LEVEL[track];
