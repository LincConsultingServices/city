// MAISON · C2 Learning Agility · Level A — "Three Times Faster"
// (docs/maison.md §9.3, fully worked there). Station st_bench · host Élise · 9
// weeks out. Nine leaves.
//
// The tier map for this tree is SERVER-ONLY (§10.2, §0.5). Nothing here says
// which choice is better, and nothing here may. Note the shape §10.2 calls the
// most important cell in the building: holding the colour for three weeks and
// THEN naming your own defensiveness out loud is a strong outcome from a weak
// start — the game must reward changing your mind late over never changing it.
import type { DecisionTreeContent } from "@/lib/decisionTree";

export const c2Hard03: DecisionTreeContent = {
  kind: "decision_tree",
  station: "st_bench",
  host: "Élise",
  countdown: "9 weeks out",

  seed: {
    stage: [
      "The atelier, mid-morning, north light. Élise has printed the pre-season sell-through and put it on your side of her bench rather than handing it to you, which is how she says things she does not want to say out loud.",
      "The neutrals are moving three times faster than the vermilion. The vermilion is the house. It is on the rail downstairs, it is in every photograph anyone has ever taken of this label, and it is the word the one review you have ever had used about you.",
      "Élise sets her glasses down.",
    ],
    choices: [
      {
        key: "a",
        mentor: true,
        text: "Get Véra on the phone before you touch the order. Ask what a three-to-one on a pre-season drop actually means, and move on what she says.",
        consequence:
          "Véra asks you three questions in a row and you can only answer two of them. Three times faster than what — the bold, or last season's bold? Faster in units or in value? By the end of the call the number means something different than it did at the start, and it still says neutrals.",
        world: { atelier_mood: "steady" },
      },
      {
        key: "b",
        text: "Shift the next drop toward what's selling, but keep one vermilion piece in it. Follow the money without giving up the thing people know you for.",
        consequence:
          "You reweight the order: six neutral, two vermilion. Élise puts the sheet away without comment, which from Élise is agreement. The rail goes mixed by Friday and looks, honestly, better than it did.",
        world: { rail: "mixed" },
      },
      {
        key: "c",
        text: "Hold the colour. Six weeks of sell-through in a pre-season drop is not a season, and a house that chases its own early numbers stops having a point of view.",
        consequence:
          "You hold. Élise says “right” and goes back to the seam. Over the next three weeks the neutrals in the boutique sell out and the vermilion does not, and the rail starts to look less like a statement and more like a surplus.",
        world: { rail: "bold_thin", cash: "tight" },
      },
    ],
  },

  followUps: {
    // ── you called Véra ──────────────────────────────────────────────────────
    a: {
      stage: [
        "The reweighted order is in and it is selling. Véra rings back a week later, unprompted: “I've been thinking about your three-to-one. Do you know yet whether they're buying neutrals, or buying an easier first purchase?”",
      ],
      choices: [
        {
          key: "a",
          text: "Split the next drop deliberately — neutral at entry price, vermilion at full — and find out which variable is actually doing the work.",
          consequence:
            "You run both at once. The neutrals at entry price outsell everything; the neutrals at full price do not. It was the price. You would have spent the season believing it was the colour.",
          world: { rail: "mixed", price_tags: "entry" },
        },
        {
          key: "b",
          mentor: true,
          text: "Ring her back every time a number surprises you from now on. She sees the thing behind the number faster than you do, and that gap is the whole point.",
          consequence:
            "You call her four more times before the show. Twice she tells you the number means nothing. Once she asks a question that changes the collection. Élise notices that you have started saying “I don't know yet” out loud.",
          world: { atelier_mood: "trusting" },
        },
        {
          key: "c",
          text: "It's selling. Take the win, run the neutral weighting through the season, and revisit the question when there's a season's worth of data to revisit it with.",
          consequence:
            "It keeps selling. The rail goes neutral by the end of the month and stays there, and nobody in the building can tell you whether that was a discovery or a drift.",
          world: { rail: "neutral" },
        },
      ],
    },

    // ── you reweighted and kept one ──────────────────────────────────────────
    b: {
      stage: [
        "The mixed rail sells through better than either version would have alone. Ines mentions, delightedly, that two of her clients described you as “less shouty this season”. She means it as praise. Élise, upstairs, heard it.",
      ],
      choices: [
        {
          key: "a",
          mentor: true,
          text: "Get Véra in. “Less shouty” is either the best or the worst thing anyone has said about this house, and you can't tell which from inside it.",
          consequence:
            "She sits at the desk for an hour and asks what you want the house to be called in three years. You do not have an answer, which is itself the answer, and you both know it before you say so.",
          world: { atelier_mood: "steady" },
        },
        {
          key: "b",
          text: "Lean in. Reweight further toward neutral for the main collection, and let the vermilion become the accent it is clearly already becoming.",
          consequence:
            "The collection goes quiet and sells. Two vermilion pieces survive as accents. The press stops using the word they used to use about you, and does not replace it with another one.",
          world: { rail: "neutral" },
        },
        {
          key: "c",
          text: "Hold the split exactly where it is for the rest of the season, and decide what the house is after the show rather than during it.",
          consequence:
            "The split holds. The rail reads as a house with two ideas rather than one, which some people call range and some people call indecision, and you get both reviews.",
          world: { rail: "mixed", press: "mixed" },
        },
      ],
    },

    // ── you held the colour ──────────────────────────────────────────────────
    c: {
      stage: [
        "Three weeks. The neutrals in the boutique are gone and the vermilion is not. Élise has started folding the unsold pieces rather than rehanging them, which she has never done. She has not said anything.",
      ],
      choices: [
        {
          key: "a",
          text: "Hold. You are eight weeks from a show built entirely around this colour, and changing the collection now would be reacting to a boutique, not to a market.",
          consequence:
            "You hold to the show. The vermilion goes down the runway exactly as planned, and the pieces that sell afterward are the two neutrals someone put in at the last minute.",
          world: { rail: "bold_thin", atelier_mood: "strained" },
        },
        {
          key: "b",
          text: "Cut the vermilion order, take the loss on what has already been made, and reweight the show while there is still time to reweight it.",
          consequence:
            "The loss is real and it is on this season's books. The show is smaller than the one you planned. Four pieces come off the rail and do not come back, and the ones that stay sell.",
          world: { rail: "thin", cash: "tight" },
        },
        {
          key: "c",
          mentor: true,
          text: "Call Véra, say out loud that you have been defending the colour rather than reading the numbers, and let her work out which you are still doing.",
          consequence:
            "You say it out loud and it is worse out loud. She does not disagree with you. By the end of the call you have a reweighted order and a sentence you will be repeating to yourself for a year.",
          world: { rail: "mixed", atelier_mood: "steady" },
        },
      ],
    },
  },
};
