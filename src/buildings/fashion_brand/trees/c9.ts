// MAISON · C9 Perseverance & Adaptability · both tracks (docs/maison.md §9.5).
// Station st_press_wall · host: the wall · after the show.
//
// Subtopic `resilience`: compound setbacks, and the competency is absorbing them
// without deforming. The ninth beat has no NPC bringing it — the room brings it.
// Élise is upstairs and has not said anything about either clipping, which is
// the point: the wall reports coverage, never quality (§11).
import type { DecisionTreeContent } from "@/lib/decisionTree";

export const c9Hard03: DecisionTreeContent = {
  kind: "decision_tree",
  station: "st_press_wall",
  host: "the wall",
  countdown: "after the show",

  seed: {
    stage: [
      "The show happened. Sales were weak. Two frames on the stair are filled where you had hung eight, and you walk past both of them six times a day.",
      "One review is polite. One is not, and the sentence in it that lands is about the collection having nothing to say. Élise is upstairs and has not mentioned either of them.",
    ],
    choices: [
      {
        key: "a",
        text: "Change direction. The collection was the statement and it did not land — go back to the table and come back next season as something else.",
        consequence:
          "You start again from nothing in January. The next collection is unrecognisable, sells about the same, and the review of it says the house is hard to place.",
        world: { rail: "mixed", press: "cold" },
      },
      {
        key: "b",
        text: "Take the hit, work out specifically what missed, adjust the next collection, and keep the house pointed exactly where it was pointed.",
        consequence:
          "Four pieces missed and five did not. The next collection keeps the five, replaces the four, and is the same house with a better half of a season in it.",
        world: { rail: "bold", press: "one" },
      },
      {
        key: "c",
        text: "Treat the resistance as part of the job: take what's true from the bad review, protect the atelier's morale, and come back sharper.",
        consequence:
          "You read it twice, pull out the one line that is accurate, and tell the atelier what you are keeping and why before anyone has to ask.",
        world: { atelier_mood: "trusting", press: "mixed" },
      },
    ],
  },

  followUps: {
    a: {
      stage: [
        "The new direction is in production and it is not the house Élise has cut for. She has not objected. Two of the pieces are being made by someone who has never made anything like them.",
      ],
      choices: [
        {
          key: "a",
          text: "Commit fully. A change of direction executed halfway is the worst of both, and the only version of this that works is the one you finish.",
          consequence:
            "You finish it. The collection is coherent, entirely new, and the two people who could make the old one well are now the two learning slowest.",
          world: { rail: "mixed", atelier_mood: "strained" },
        },
        {
          key: "b",
          text: "Keep the direction and the hands: rebuild it around what this atelier is actually good at, rather than around what the review said.",
          consequence:
            "The direction survives the edit and the making gets easier. It is less of a break than you announced and better than the version you announced it as.",
          world: { rail: "mixed", atelier_mood: "steady" },
        },
        {
          key: "c",
          text: "Ask Élise what she thinks you are making now, and be willing to hear that you changed everything on the strength of one sentence.",
          consequence:
            "She says she does not know, which she has never said about anything. It takes a fortnight to work out an answer and the answer keeps half the change.",
          world: { rail: "mixed", atelier_mood: "trusting" },
        },
      ],
    },

    b: {
      stage: [
        "The adjusted collection is in the boutique and doing better. The frames on the stair are still two, and the writer of the polite review has not been back.",
      ],
      choices: [
        {
          key: "a",
          text: "Invite her in to see what changed, with the four replaced pieces on the rail and the reasoning written out beside them.",
          consequence:
            "She comes, spends an hour, and writes something in March that is neither polite nor unkind. It is the first piece about this house that engages with the work.",
          world: { press: "warm", resale: "strong" },
        },
        {
          key: "b",
          text: "Say nothing and let the next collection be the argument, because a house that explains itself to critics is a house being marked.",
          consequence:
            "The next collection does the arguing. It takes two more seasons for anyone to write about it, and when they do the piece is better for having been earned.",
          world: { press: "one", rail: "bold" },
        },
        {
          key: "c",
          text: "Put the reasoning in the show notes instead — for buyers, for the atelier, for anyone in the room — rather than aiming it at one writer.",
          consequence:
            "The notes get read by the buyers and quoted by one of them back at you. The writer reads them too, eventually, and mentions them in passing.",
          world: { press: "mixed", resale: "strong" },
        },
      ],
    },

    c: {
      stage: [
        "You kept the true line and told the atelier what you were keeping. Two weeks later the second setback arrives: the returns from the show are running at nearly a fifth.",
      ],
      choices: [
        {
          key: "a",
          text: "Handle it the same way — find the true thing in the returns data, tell the room, and keep the collection pointed where it is pointed.",
          consequence:
            "The returns are almost all one fit on one piece. The room hears it the same week and the fix is a pattern change rather than a crisis.",
          world: { atelier_mood: "trusting", rail: "bold" },
        },
        {
          key: "b",
          text: "Absorb this one quietly. The atelier has had one honest conversation about bad news and two in a fortnight is not resilience, it is a mood.",
          consequence:
            "You carry it alone for three weeks. The pattern gets fixed later than it needed to be and nobody in the building knows there was anything to fix.",
          world: { atelier_mood: "steady", cash: "tight" },
        },
        {
          key: "c",
          text: "Put a standing habit round it: bad numbers get read out on the same day of the week, every week, good ones included.",
          consequence:
            "It is awkward for a month and then it is just Tuesday. By spring the atelier hears about problems before you have decided what to do about them.",
          world: { atelier_mood: "trusting", press: "mixed" },
        },
      ],
    },
  },
};

export const c9Pro03: DecisionTreeContent = {
  kind: "decision_tree",
  station: "st_press_wall",
  host: "the wall",
  countdown: "after the show",

  seed: {
    stage: [
      "Three things in one week. The show underperformed, the returns are spiking, and the wholesale order you had built the spring cash flow around has been cancelled by email.",
      "Two frames on the stair. Élise is upstairs. The countdown chalked on the column has not been changed since the show and nobody has wanted to be the one to rub it out.",
    ],
    choices: [
      {
        key: "a",
        text: "Cut the line. Three problems in one season is not a rough patch, it is an answer, and the discipline is knowing when to stop paying for one.",
        consequence:
          "You close it in February. Two people are let go, the remaining cash is real, and the thing you built for four years stops existing on a Tuesday afternoon.",
        world: { rail: "thin", cash: "tight", atelier_mood: "fractured" },
      },
      {
        key: "b",
        text: "Take the feedback into the next set of decisions and keep a clear head while the numbers are bad and everyone is watching.",
        consequence:
          "You work through all three without raising your voice or your pace. It takes eleven weeks, and at the end of it the house is smaller and still here.",
        world: { cash: "tight", atelier_mood: "steady" },
      },
      {
        key: "c",
        text: "Judge each of the three separately — what to continue, what to change, what to stop — and let the stretch make you harder to move.",
        consequence:
          "Split apart, they are three different problems: one is a fit, one is a buyer, and one is a season. Only the buyer is actually about the house.",
        world: { cash: "tight", resale: "strong", press: "mixed" },
      },
    ],
  },

  followUps: {
    a: {
      stage: [
        "The line is closed. The boutique is still open, the cash is stable, and a buyer who was not the one who cancelled calls in March asking when the next collection is.",
      ],
      choices: [
        {
          key: "a",
          text: "Tell her there isn't one, and mean it. You closed it on the arithmetic and reopening on one phone call is how houses close twice.",
          consequence:
            "She takes it well. The boutique carries on selling the remaining stock at full price and the house becomes one shop with a very good rail.",
          world: { rail: "thin", cash: "season" },
        },
        {
          key: "b",
          text: "Start again small — six pieces, paid for up front, no wholesale — and find out whether the line or the structure was what failed.",
          consequence:
            "Six pieces, entirely pre-paid. They sell out, which does not prove the line worked, and does prove that the structure was carrying most of the risk.",
          world: { rail: "capsule", cash: "season" },
        },
        {
          key: "c",
          text: "Go back through the closure with the numbers in front of you and work out which of the three actually forced it.",
          consequence:
            "It was the cancelled order and only the cancelled order. That is a concentration problem rather than a collection problem, and you closed a collection.",
          world: { cash: "season", resale: "strong" },
        },
      ],
    },

    b: {
      stage: [
        "Eleven weeks of steady work. The returns are handled, the collection is trimmed, and the cancelled order has been half replaced. Nobody in the building has seen you rattled and two of them have asked whether you are all right.",
      ],
      choices: [
        {
          key: "a",
          text: "Say the honest thing when they ask, because a room that never sees the cost learns that difficulty is something you hide rather than survive.",
          consequence:
            "You tell Élise the truth on a Thursday. She says three sentences about a house she worked at in 2009 and it is the most useful conversation of the season.",
          world: { atelier_mood: "trusting" },
        },
        {
          key: "b",
          text: "Keep it steady. The team needs the person carrying this to look like they are carrying it, and the season is not over yet.",
          consequence:
            "You hold it to the spring and then for another season after that. The room stays calm, and the two who asked stop asking.",
          world: { atelier_mood: "steady", cash: "season" },
        },
        {
          key: "c",
          text: "Fix the thing all three had in common — one buyer, one fit, one season with no reserve — before the next set of bad numbers arrives.",
          consequence:
            "Three structural changes over the spring, none of them visible from outside. The next bad week is a bad week rather than three problems in a row.",
          world: { cash: "season", resale: "strong" },
        },
      ],
    },

    c: {
      stage: [
        "Separated, they resolve differently: the fit is a pattern fix, the season was a season, and the buyer was forty per cent of your wholesale and is not coming back.",
      ],
      choices: [
        {
          key: "a",
          text: "Fix the concentration first. One buyer at forty per cent is the actual problem and it was the problem before any of this happened.",
          consequence:
            "It takes two seasons to get that number under twenty. Nothing about it is interesting and it is the reason the following year is uneventful.",
          world: { buyer: "circling", cash: "season", resale: "strong" },
        },
        {
          key: "b",
          text: "Go and win that buyer back, since they left over one collection and the collection has already been fixed.",
          consequence:
            "Four months of calls get you a smaller order from them and no diversification at all. The concentration is now thirty-five per cent of a smaller number.",
          world: { buyer: "signed", cash: "tight" },
        },
        {
          key: "c",
          text: "Do all three separately, on their own timelines, and stop treating a bad week as one thing that happened to you.",
          consequence:
            "Three workstreams, three owners, three dates. It is the most organised this house has been and it is the first season nobody describes as a crisis.",
          world: { cash: "season", atelier_mood: "trusting", press: "warm" },
        },
      ],
    },
  },
};
