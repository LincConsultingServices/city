// The decision content — two authored beats per mission, nine leaves each.
//
// **There are no tiers in this file, and there must never be any.** Which option
// is Developing, Strong or Advanced lives in the registry rubric on the server
// and is resolved from the submitted path; a tier on the client is a tier a
// curious player can read. What ships here is the text, the consequence, and the
// world write — the three things the room needs to play the beat.
//
// The rules the prose is held to (PRD §9.2, ADR-005 §11.4), because they are the
// difference between a decision and a quiz:
//
//   * every option is written by somebody who believes it, and carries its own
//     justification — no bare imperatives sitting next to reasoned arguments;
//   * choice length is held to parity, because it is the tier leak nobody looks
//     for. 13–33 words, and no trio spread wider than 8. Checked in trees.test.ts,
//     not by eye;
//   * no option marks itself with hedging, glibness or author's praise;
//   * no consequence tells the player whether they did well. The room reports
//     what happened and stops there.
import type { WorldPatch } from "./world";

export interface Choice {
  /** "a" | "b" | "c" — the letter that goes on the wire in the trace path. */
  id: string;
  text: string;
  /** What the room does about it. Four to six seconds of consequence, no verdict. */
  consequence: string;
  world?: WorldPatch;
}

export interface FollowBranch {
  /** Where the branch picks up, in the host's voice. */
  prompt: string;
  choices: readonly Choice[];
}

export interface Tree {
  activityId: string;
  /** The scene, before anybody says anything. */
  stage: string;
  /** The question that opens it. */
  prompt: string;
  seed: readonly Choice[];
  /** Keyed by the seed choice that led here — the follow-up is branch-specific. */
  follow: Readonly<Record<string, FollowBranch>>;
}

/**
 * The trace path for a completed decision, exactly as the backend's evalTrace
 * expects it (PRD §10.4). It walks the path backwards for the last node it knows,
 * so the leaf is what scores and the two nodes before it are context.
 */
export function tracePath(activityId: string, seed: string, follow: string): string[] {
  return [
    `${activityId}.seed`,
    `${activityId}.${seed}`,
    `${activityId}.${seed}.follow`,
    `${activityId}.${seed}.${follow}`,
  ];
}

export const TREES: Readonly<Record<string, Tree>> = {
  // Fully worked in PRD §9.3. The seed and follow-up text below is the shipping
  // text from that section verbatim; the leaf consequences are authored to it.
  "C1-HARD-01": {
    activityId: "C1-HARD-01",
    stage:
      "8:05. The bell goes. Nadia's already reaching for her card before she's at the counter, the way she is every morning. She orders, then stops halfway through putting her phone away. It's the third time this week someone's asked. Behind you, Priya doesn't say anything, which is Priya's way of saying something. There's enough in the till for one move this month.",
    prompt: "You still don't do oat, do you?",
    seed: [
      {
        id: "a",
        text: "Chalk a card and prop it by the till — Oat milk? Should we? — and see how many people actually react over two days.",
        consequence:
          "You prop the card by the till. Over two days eleven people tap it and three write their names underneath in Priya's chalk. You order one crate of oat with a number in your head instead of a hope.",
        world: { chalkboard: "oat_asked" },
      },
      {
        id: "b",
        text: "Order oat and almond this week. People are telling you what they want, and in a shop this size the one who moves first wins.",
        consequence:
          "Two crates arrive Thursday. The oat moves. Three weeks later you find the almond behind the fridge, unopened, four days past date. You bought what people said, not what they'd pay for.",
        world: { chalkboard: "oat_plus", till: "tight" },
      },
      {
        id: "c",
        text: "Ask Nadia — and the others who've asked — what they'd actually do if you had it. Find out whether it's a nice-to-have or the reason they'd stop coming.",
        consequence:
          "Nadia tells you she gets her second coffee at the place by the station three mornings a week, because they do oat and you don't. Two others say the same thing without being asked. It was never really about milk.",
        world: { regulars: "thin" },
      },
    ],
    follow: {
      a: {
        prompt:
          "The crate arrives. Oat sells — nine cups, then eleven, then seven. Not the flood the card suggested. Priya, wiping down: “So is that good or not?”",
        choices: [
          {
            id: "a",
            text: "Eleven people said yes to a card and nine actually bought. Use the gap between those two numbers to calibrate the next test, not the next order.",
            consequence:
              "Priya writes both numbers on the corner of the board and leaves them there. The next thing you ask the room about, you ask it the same way, and you already know roughly what a yes on a card is worth.",
            world: { chalkboard: "oat" },
          },
          {
            id: "b",
            text: "Nine cups a day is nine cups a day. Bring the almond in too and give the whole range a fair run before judging any of it.",
            consequence:
              "The almond goes on beside the oat. Between them they do about eleven cups, which is two more than the oat was doing alone, off two cartons instead of one.",
            world: { chalkboard: "oat_plus" },
          },
          {
            id: "c",
            text: "Hold at one crate a week, leave the card up another fortnight, and let the reorder rate make the call instead of you.",
            consequence:
              "The card stays up. The reorder settles at one crate, steady, week after week. It is not a decision so much as a number you now have and did not have before.",
            world: { chalkboard: "oat" },
          },
        ],
      },
      b: {
        prompt:
          "The almond's a write-off and the till is thinner than it should be in a good month. Priya, not looking up: “We keeping the almond?”",
        choices: [
          {
            id: "a",
            text: "Keep both on. Pulling something a fortnight after adding it makes the place look like it doesn't know what it is.",
            consequence:
              "Both stay up. The almond goes on sitting there, and every few weeks a carton goes past date and gets poured away at close, quietly, by whoever is on.",
            world: { chalkboard: "oat_plus" },
          },
          {
            id: "b",
            text: "Cut the almond, and spend the afternoon finding out what the oat buyers actually came in for. The crate's already lost — it should at least buy the answer.",
            consequence:
              "You spend the afternoon asking. Most of them are the 7:50 crowd and most of them are going somewhere after. Priya writes the window on the corner of the board and it stays there for the rest of the season.",
            world: { chalkboard: "oat" },
          },
          {
            id: "c",
            text: "Drop the almond, keep the oat, and from now on reorder against what sold last week rather than what you hoped would sell.",
            consequence:
              "The almond comes off. You start writing last week's numbers on the back of the order sheet before you place it, which takes four minutes and has not cost you a carton since.",
            world: { chalkboard: "oat" },
          },
        ],
      },
      c: {
        prompt:
          "You know now: it's the commuters, and it's the station café. Priya's already worked out what you're going to say. “So do we chase them, or do we not?”",
        choices: [
          {
            id: "a",
            text: "Bring oat in and aim the whole morning at commuters — faster service, a takeaway price, out of the door in ninety seconds.",
            consequence:
              "The mornings get quicker and louder. Some of the regulars stop sitting down, and the four-top has a gap in it on Tuesdays that did not use to be there.",
            world: { chalkboard: "oat", regulars: "steady" },
          },
          {
            id: "b",
            text: "Oat, yes. But the thing you're actually fixing is the 7:50-to-8:20 window. Time the queue for a week, then design that half hour properly.",
            consequence:
              "Priya writes 7:50 – 8:20 on the corner of the chalkboard and leaves it there. You will still be looking at those numbers in week ten, and they will still be the right ones.",
            world: { chalkboard: "oat", regulars: "steady" },
          },
          {
            id: "c",
            text: "Match the station café properly — oat, soy, all of it — so there's nothing left worth walking down the road for.",
            consequence:
              "The whole range goes up on the board. It takes three cartons and a shelf you did not have, and the fridge is fuller every morning than the sales are by close.",
            world: { chalkboard: "plant_full", till: "tight" },
          },
        ],
      },
    },
  },
};

export function treeFor(activityId: string): Tree | null {
  return TREES[activityId] ?? null;
}
