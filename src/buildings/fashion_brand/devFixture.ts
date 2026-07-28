// DEV ONLY — the registry rows MAISON needs, which the live backend does not
// have yet (docs/maison.md §0.4).
//
// Loaded behind `devWorldBypass` (VITE_DEV_WORLD=1), which is
// `import.meta.env.DEV && …` and therefore statically false in a production
// build. MaisonPanel imports it dynamically so it is a separate chunk that a
// real build never pulls in.
//
// It holds NOTHING that could score anything: no answer key, no rubric, no tier
// map, no proficiency. It is the metadata the season board needs to know a beat
// exists — id, type, title, level — so the venue is walkable, testable and
// reviewable without a backend. A submit still goes to the server and still
// fails without one, and the season board says so.
import type { LevelActivity } from "@/framework/api/schemas";
import { BEATS, TRACK_LEVEL } from "./season";

export const MAISON_DEV_ACTIVITIES: LevelActivity[] = BEATS.flatMap((beat) =>
  (["A", "B"] as const).map((track) => ({
    id: beat[track].id,
    competencyCode: beat.competency,
    level: TRACK_LEVEL[track],
    subtopic: undefined,
    orderIndex: 3,
    activityType: "DECISION_TREE",
    title: beat[track].title,
    estMinutes: track === "A" ? 6 : 7,
    passCriteria: undefined,
    status: "NOT_STARTED",
    bestProficiency: null,
  })),
);
