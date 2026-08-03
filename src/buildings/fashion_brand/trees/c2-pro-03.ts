// MAISON · C2 Learning Agility · Level B — "The Colour House" (docs/maison.md
// §9.5). Station st_bench · host Élise + Véra · 9 weeks out.
//
// Level B inherited the reputation, so the signal that contradicts it is
// contradicting something the player did not build and cannot easily disown.
// Every node carries a consultation option (§9.6) — the mentor path has to be
// available at both beats or the competency stops being about asking.
import type { DecisionTreeContent } from "@/lib/decisionTree";

export const c2Pro03: DecisionTreeContent = {
  kind: "decision_tree",
  station: "st_bench",
  host: "Élise + Véra",
  countdown: "9 weeks out",

  seed: {
    stage: [
      "The bold pieces are slow. A buyer you trust — not a stylist relaying a rumour, a buyer with an order book — says her customer wants neutrals and has wanted them for a year.",
      "The press has spent two years calling this house the colour house. You did not earn that phrase and it is still most of your recognition. Élise, who did earn it, is at the next bench and can hear all of this.",
    ],
    choices: [
      {
        key: "a",
        text: "Defend the colour publicly. Your entire recognition is one word, and changing it mid-season tells the press you don't know what you are.",
        consequence:
          "You say it in an interview and it reads well. The quote gets picked up twice. The neutrals keep selling and the sentence stays on the internet exactly as you said it.",
        world: { rail: "bold", press: "one" },
      },
      {
        key: "b",
        text: "Move the plan on what the data says — shift quietly toward neutrals and keep vermilion as a controlled signature rather than the whole statement.",
        consequence:
          "Nobody outside the building notices it happening, which was the point. Inside the building Élise notices in about a week and does not say anything for another two.",
        world: { rail: "mixed" },
      },
      {
        key: "c",
        mentor: true,
        text: "Treat the miss as the most useful information you've had all year. Get Véra to stress-test it, then reposition ahead of the market rather than behind it.",
        consequence:
          "Véra takes the claim apart in an hour: one buyer, one region, one season. What survives is smaller and real — the customer wants a way in, and neutral is what a way in looks like this year.",
        world: { atelier_mood: "steady", resale: "strong" },
      },
    ],
  },

  followUps: {
    a: {
      stage: [
        "Two months on, the neutrals are still what sells and the quote is still what comes up first when anyone searches the house. Élise has stopped mentioning the sell-through sheet, which is not the same as agreeing with you.",
      ],
      choices: [
        {
          key: "a",
          mentor: true,
          text: "Get Véra in and read her the quote out loud, because you cannot tell from in here whether you defended a position or a habit.",
          consequence:
            "She asks who taught you the sentence. You say the press did, and hear it. The collection changes that month and the interview stays exactly where it is.",
          world: { rail: "mixed", atelier_mood: "steady" },
        },
        {
          key: "b",
          text: "Hold it. A house that recants in public within a season teaches the press that your positions are weather rather than a point of view.",
          consequence:
            "You hold the line through the show. The reviews use the word you wanted and the order book uses the other one, and both of those are now on record.",
          world: { rail: "bold_thin", press: "mixed" },
        },
        {
          key: "c",
          text: "Change the collection without changing the sentence — let the clothes move toward neutral and let the quote age into something people quote back at you.",
          consequence:
            "The collection moves and the sentence does not. For one season both are true at once, and then only one of them is, and nobody makes you say which.",
          world: { rail: "mixed", press: "one" },
        },
      ],
    },

    b: {
      stage: [
        "The shift works. Sell-through is up, nothing was announced, and the house looks from outside exactly as it did in spring.",
        "Then Élise asks — the first time in four years she has asked you anything about strategy — what the house is now.",
      ],
      choices: [
        {
          key: "a",
          text: "Tell her you do not know yet, and put the question up in the atelier where everyone can see it until the show answers it.",
          consequence:
            "It stays on the wall for eleven weeks. Two of the machinists write answers underneath it, and one of those answers ends up in the show notes.",
          world: { atelier_mood: "trusting" },
        },
        {
          key: "b",
          mentor: true,
          text: "Bring Véra in to work it through with both of you, because Élise has asked the question you have been avoiding and she deserves a real answer.",
          consequence:
            "The three of you are at the bench for two hours. Élise says more in that room than she has all year, and most of it is about cloth and all of it is about the house.",
          world: { atelier_mood: "trusting", resale: "strong" },
        },
        {
          key: "c",
          text: "Give her the honest short version: the house follows what sells now, and the colour was a position you can no longer fund.",
          consequence:
            "She says right and goes back to the seam. It is an accurate answer and it is the last time she asks you a question like that.",
          world: { rail: "neutral", atelier_mood: "strained" },
        },
      ],
    },

    c: {
      stage: [
        "The stress-test leaves you with something narrower and load-bearing: the colour was never the problem, the entry point was, and neutral is simply what an entry point looks like this year.",
      ],
      choices: [
        {
          key: "a",
          text: "Reposition on that and get ahead of it: neutral as the way in, the colour as what you graduate into, and say so first.",
          consequence:
            "You publish the shape before the market describes it for you. Two writers use your framing, which means the next house to do this is following you.",
          world: { rail: "mixed", press: "warm", resale: "strong" },
        },
        {
          key: "b",
          text: "Take the finding and do nothing public with it. Move the collection, keep the story, and let next season's numbers make the argument.",
          consequence:
            "The collection moves and the story holds. The numbers do make the argument, a season later, to a room that has already stopped asking.",
          world: { rail: "mixed" },
        },
        {
          key: "c",
          mentor: true,
          text: "Ask Véra to do this to every buyer claim you get from now on, and build the habit of taking a finding apart before you spend on it.",
          consequence:
            "It becomes the way decisions get made here. Three claims get taken apart before the show and two of them do not survive it, which saves a season's worth of cloth.",
          world: { atelier_mood: "trusting", cash: "season" },
        },
      ],
    },
  },
};
