// The eighteen level lists MAISON needs, fetched once and shared by the room and
// the overlay panel (docs/maison.md §0.4, §0.6).
//
// A scenario venue spans nine competencies × two tracks, which the framework's
// ActivityListPanel cannot express — it fetches exactly one (comp, level). One
// missing row must not blank the season either, so failures are dropped rather
// than thrown: an unseeded beat is simply not open yet.
import { api } from "@/framework/api";
import type { LevelActivity } from "@/framework/api/schemas";
import { devWorldBypass } from "@/framework/config/appConfig";
import { MAISON_LEVELS } from "./season";

export const SEASON_QUERY_KEY = ["maison-season"] as const;

export async function fetchSeasonActivities(): Promise<Map<string, LevelActivity>> {
  const byId = new Map<string, LevelActivity>();

  // Dev-world only: seed the beats the live registry does not have yet, FIRST,
  // so any real row overwrites the placeholder rather than the reverse.
  // Dynamically imported so a production build never pulls the chunk in.
  if (devWorldBypass) {
    const { MAISON_DEV_ACTIVITIES } = await import("./devFixture");
    for (const a of MAISON_DEV_ACTIVITIES) byId.set(a.id, a);
  }

  const settled = await Promise.allSettled(
    MAISON_LEVELS.map((l) => api.getLevel(l.competency, l.level)),
  );
  for (const outcome of settled) {
    if (outcome.status !== "fulfilled") continue;
    for (const a of outcome.value.activities) byId.set(a.id, a);
  }
  return byId;
}
