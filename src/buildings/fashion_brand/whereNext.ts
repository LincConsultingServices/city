// §13.7 — "two or three city buildings that press hardest on your lowest
// competencies." The last spread of the lookbook.
//
// Pure, and deliberately incapable of inventing anything. The proficiencies come
// from the server via the registry rows; if the backend has said nothing about a
// beat, this recommends nothing on the strength of it. A lookbook that guesses
// at your weakest competency is worse than one that admits it does not know.
import type { LevelActivity } from "@/framework/api/schemas";
import { VENUES } from "@/world/cityMap";
import { BEATS, type Track } from "./season";
import { beatActivityId } from "./beats";

export interface Suggestion {
  /** The competency this venue presses on. */
  competency: string;
  competencyName: string;
  venueName: string;
  district: string;
  /** What the server actually recorded, so the reason is never a guess. */
  proficiency: number;
}

/** How many the spread carries. §13.7 says two or three. */
const MAX_SUGGESTIONS = 3;

/**
 * The venues elsewhere in the city that teach a competency — MAISON excluded,
 * because "go back to MAISON" is not a suggestion.
 */
function venuesFor(competency: string): { name: string; district: string }[] {
  return VENUES.filter(
    (v) => v.id !== "fashion_brand" && v.kind === "competency" && v.competency === competency,
  ).map((v) => ({ name: v.displayName, district: v.district }));
}

/**
 * Where the season says you should go next: the beats the server scored lowest,
 * matched to somewhere in the city that presses on the same thing.
 */
export function whereNext(
  track: Track,
  activities: Map<string, LevelActivity> | undefined,
): Suggestion[] {
  if (!activities) return [];

  const scored: Suggestion[] = [];
  for (const beat of BEATS) {
    const row = activities.get(beatActivityId(beat, track));
    const p = row?.bestProficiency;
    // Only what the server actually said. No row, no score, no suggestion.
    if (typeof p !== "number") continue;
    for (const venue of venuesFor(beat.competency)) {
      scored.push({
        competency: beat.competency,
        competencyName: beat.competencyName,
        venueName: venue.name,
        district: venue.district,
        proficiency: p,
      });
    }
  }

  // Lowest first; one venue per competency, so three suggestions are three
  // different things to work on rather than one thing three times.
  const seen = new Set<string>();
  return scored
    .sort((a, b) => a.proficiency - b.proficiency || a.competency.localeCompare(b.competency))
    .filter((s) => (seen.has(s.competency) ? false : (seen.add(s.competency), true)))
    .slice(0, MAX_SUGGESTIONS);
}
