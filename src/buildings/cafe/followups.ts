// The transfer beat — the third question, and the scripted bank it comes from.
//
// PRD §9.6: the beat is generated server-side from both prior choices and asked
// in the host's voice. `POST /api/v1/ai/followup` is backend work that has not
// landed, and the framework's ApiClient is maintainer-owned, so the Café plays
// the fallback bank instead. **That is the designed degraded path, not a stub**
// — §2's assumptions table says in as many words that with the generator absent
// the bank serves every beat and the player cannot tell.
//
// Two rules, and they are the same two the generated version is gated on:
//
//   * **No tiers.** Same as trees.ts. The ranking lives in the server rubric.
//   * **Never comment on the earlier decision.** "The oat milk you rushed in has
//     run out" is a verdict with a timestamp on it. "The oat's moving. The
//     station café opens at seven from Monday" is the same situation with no
//     opinion in it, and it is the one to write (PRD §9.6.5).
//
// Branch-agnostic but world-aware: each may vary its opening clause on one named
// key, which is what lets the same beat land differently in a full room and a
// thin one without knowing what you chose to get there.
import type { CastId } from "./cast";
import type { World, WorldPatch } from "./world";

export interface FollowupOption {
  id: string;
  text: string;
  consequence: string;
  world?: WorldPatch;
}

export interface FollowupBeat {
  activityId: string;
  /** Who asks. Resolved against who is actually in the room before it is used. */
  speakerId: CastId | "room";
  /** The situation, as a function of the one key this beat varies on. */
  prompt: (world: World) => string;
  options: readonly FollowupOption[];
}

export const FOLLOWUPS: Readonly<Record<string, FollowupBeat>> = {
  // Track A opens on the station café changing its hours, and varies on
  // `regulars` (PRD §9.6.4).
  "C1-HARD-01": {
    activityId: "C1-HARD-01",
    speakerId: "nadia",
    prompt: (world) => {
      const room =
        world.regulars === "thin"
          ? "The room is thinner in the mornings than it was six weeks ago."
          : "The 7:50 window is yours again.";
      return `Six weeks on. ${room} The station café has started opening at seven. Nadia, on her way out: “You going to keep doing this every time they move?”`;
    },
    options: [
      {
        id: "o_c1a",
        text: "Not every time. But I'd rather find out what seven o'clock is actually worth to people before I decide whether to match it.",
        consequence:
          "You spend a week counting who is at the door before eight. It is fourteen people, and eleven of them are the same eleven every day.",
        world: { regulars: "steady" },
      },
      {
        id: "o_c1b",
        text: "We open at seven from Monday. They've moved, so we move — you can't let the place down the road set the hours and keep the crowd.",
        consequence:
          "You open at seven from Monday. The first hour is quiet and the staff cost is not, and by Thursday Priya has stopped asking what the plan is.",
        world: { staff: "strained" },
      },
      {
        id: "o_c1c",
        text: "No. They can have seven o'clock — I'd rather be the place you come to at ten past eight and actually sit down in.",
        consequence:
          "You leave the hours where they are. Two of the early ones go down the road for good, and the four-top fills out later in the morning than it used to.",
        world: { regulars: "steady" },
      },
    ],
  },
};

export function followupFor(activityId: string): FollowupBeat | null {
  return FOLLOWUPS[activityId] ?? null;
}
