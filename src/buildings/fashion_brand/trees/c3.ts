// MAISON · C3 Courage to Commit · both tracks (docs/maison.md §9.5).
// Station st_rail · host Hélène (+ Rio on Level B) · 8 weeks out.
//
// Subtopic `saying_no_opportunity_cost`: two offers, one production slot,
// Friday. Choosing is declining. Hélène never raises the pressure — the pressure
// is structural, and she would extend the deadline if her own calendar were
// hers, which it is not.
import type { DecisionTreeContent } from "@/lib/decisionTree";

export const c3Hard03: DecisionTreeContent = {
  kind: "decision_tree",
  station: "st_rail",
  host: "Hélène",
  countdown: "8 weeks out",

  seed: {
    stage: [
      "A department store wants to stock you. The terms are decent, the floor is good, and the volume would be the largest single order this house has taken.",
      "Hélène is at the rail with her hand on a sleeve. You have forty-eight hours, you do not have all the facts, and she checks her watch once without meaning anything by it.",
    ],
    choices: [
      {
        key: "a",
        text: "Ask for two weeks. Neither of these deals is reversible, and the cost of choosing the wrong one is a year, not a season.",
        consequence:
          "She says she will ask and comes back with four days, which is what her own calendar allows. It is not two weeks and it is more than you had.",
        world: { buyer: "circling" },
      },
      {
        key: "b",
        text: "Weigh what you actually know against what you don't, decide inside the forty-eight hours, and own whichever way it goes.",
        consequence:
          "You list what you know on one side of a docket and what you are guessing on the other. The guessing side is longer, and you sign anyway, on time.",
        world: { buyer: "signed", cash: "season" },
      },
      {
        key: "c",
        text: "Commit to the one that fits what this house is meant to be in three years, and accept that you are buying it partly blind.",
        consequence:
          "You pick on the three-year shape rather than the numbers. Élise asks what the margin is and you tell her honestly that you did not lead with it.",
        world: { buyer: "signed", resale: "strong" },
      },
    ],
  },

  followUps: {
    a: {
      stage: [
        "Four days. In three of them you learn one thing that matters: their returns policy puts unsold stock back on you at your cost, which was in the terms and which nobody had read closely.",
      ],
      choices: [
        {
          key: "a",
          text: "Take it back to her with that clause circled and make the deal conditional on it, even though you are asking on the last afternoon.",
          consequence:
            "She takes the clause out without much argument, which tells you it was negotiable all along and that four days was worth more than the two weeks you asked for.",
          world: { buyer: "signed", cash: "season" },
        },
        {
          key: "b",
          text: "Sign it as written. You found the clause, you understand what it costs, and a first department-store order is worth carrying that risk once.",
          consequence:
            "You sign knowing exactly which part could hurt. Two months later some of it does come back, at your cost, and none of it is a surprise.",
          world: { buyer: "signed", cash: "tight" },
        },
        {
          key: "c",
          text: "Walk. The clause is the whole deal in miniature, and a house with one boutique cannot carry a partner's unsold stock.",
          consequence:
            "You decline on the last afternoon. She is unbothered and says to call her in a year, and the production slot goes to the pop-up instead.",
          world: { buyer: "walked", rail: "bold" },
        },
      ],
    },

    b: {
      stage: [
        "You decided on time and you were right about roughly half of what you were guessing. The order is in production, the slot is used, and the half you got wrong is a delivery date you cannot now move.",
      ],
      choices: [
        {
          key: "a",
          text: "Tell them now, before it slips, and offer them the shortfall in the pieces you can actually finish by the date.",
          consequence:
            "Telling them early costs you the look of competence and buys you the date. They take the shorter delivery and the relationship survives with a note on it.",
          world: { buyer: "signed", atelier_mood: "strained" },
        },
        {
          key: "b",
          text: "Push the atelier and make the date. It is two weeks of hard work and a missed first delivery is a first impression you never get back.",
          consequence:
            "The date is made. Élise is in at six for nine days running and the last forty pieces are finished by people who are past being careful.",
          world: { buyer: "signed", atelier_mood: "fractured" },
        },
        {
          key: "c",
          text: "Write down which of your guesses were wrong before you fix anything, so the next forty-eight-hour decision is made with a shorter guessing column.",
          consequence:
            "The list takes an hour and is uncomfortable reading. It also turns out to be the single most useful document in the building by the time C6 comes around.",
          world: { buyer: "signed", atelier_mood: "steady" },
        },
      ],
    },

    c: {
      stage: [
        "The deal fits the house and the margin is thinner than it should be. Élise's question is still on the bench, unanswered, and the first invoice makes it a lot more specific.",
      ],
      choices: [
        {
          key: "a",
          text: "Renegotiate the margin now that they have the pieces on the floor and can see for themselves what the sell-through looks like.",
          consequence:
            "You go back with their own numbers. They move a little, less than you wanted, and it is the first negotiation you have ever opened rather than answered.",
          world: { buyer: "signed", cash: "season" },
        },
        {
          key: "b",
          text: "Leave it. You chose this on the three-year shape and reopening the money nine weeks in tells them the shape was never the reason.",
          consequence:
            "It stands as signed. The three-year shape does hold and the margin stays thin for all of it, which is a price you agreed to before you knew the number.",
          world: { buyer: "signed", cash: "tight" },
        },
        {
          key: "c",
          text: "Answer Élise properly — say what the margin is, say why you took it, and let her decide whether that is a house she wants to cut for.",
          consequence:
            "You give her the real number. She looks at it for a while and says the shape is worth it, which is the closest thing to enthusiasm she has.",
          world: { atelier_mood: "trusting", cash: "tight" },
        },
      ],
    },
  },
};

export const c3Pro03: DecisionTreeContent = {
  kind: "decision_tree",
  station: "st_rail",
  host: "Hélène + Rio",
  countdown: "8 weeks out",

  seed: {
    stage: [
      "An exclusive with a high-end store on one side, a pop-up offer Rio brought in on the other, and a production slot that closes Friday for both of them.",
      "Neither deal is safe. The exclusive locks your distribution for a year; the pop-up is louder, shorter, and leaves you where you started. Hélène is at the rail and Rio is on the floor, and they can both hear each other.",
    ],
    choices: [
      {
        key: "a",
        text: "Hold both and keep gathering until one of them stops being a guess, even if that means losing the production slot.",
        consequence:
          "Friday passes with both deals live and no slot. The mill can take you again in six weeks, which puts the pieces in stores after the season they were designed for.",
        world: { buyer: "circling", cash: "tight" },
      },
      {
        key: "b",
        text: "Pick the one that fits the house, act before the slot closes, and accept that you are choosing on incomplete information.",
        consequence:
          "You take the exclusive on Thursday night with two of your questions still open. The slot holds, the pieces ship on time, and the open questions stay open.",
        world: { buyer: "signed", rail: "bold" },
      },
      {
        key: "c",
        text: "Decide cleanly under the pressure, accept that your name is on it either way, and turn the decision into momentum that afternoon.",
        consequence:
          "You decide before lunch and spend the afternoon telling everyone what happens next. The atelier has the schedule by four, which is faster than any decision has moved here.",
        world: { buyer: "signed", atelier_mood: "steady" },
      },
    ],
  },

  followUps: {
    a: {
      stage: [
        "Six weeks later you know a great deal more and have a great deal less. The exclusive is still available on worse terms; the pop-up has gone to someone else and did well for them.",
      ],
      choices: [
        {
          key: "a",
          text: "Take the exclusive on the worse terms. You bought six weeks of information with that slot, and refusing to use what it told you wastes both.",
          consequence:
            "The terms are meaningfully worse and you go in with your eyes open. The information you bought does hold, and it cost roughly a season to acquire.",
          world: { buyer: "signed", cash: "tight" },
        },
        {
          key: "b",
          text: "Walk away from both and put the season into the boutique, where the decision is entirely yours and nothing closes on a Friday.",
          consequence:
            "One season, one floor, no partners. The boutique numbers are the best they have been and the house is exactly as small as it was in spring.",
          world: { buyer: "walked", rail: "bold" },
        },
        {
          key: "c",
          text: "Set a rule for next time: the date you will decide by, written down before the offers arrive, and held in front of the team.",
          consequence:
            "The rule goes up next to the countdown. It is tested twice before the show and held once, which is one more time than it would have been.",
          world: { atelier_mood: "steady", buyer: "circling" },
        },
      ],
    },

    b: {
      stage: [
        "The exclusive is signed and shipping. One of your open questions answers itself badly: their in-store team cannot sell the top of the range, and it is the top of the range that pays for the atelier.",
      ],
      choices: [
        {
          key: "a",
          text: "Go and train their floor staff yourself, on your own time, because the deal only works if somebody in that building can explain the cloth.",
          consequence:
            "Two days on their shop floor. The top of the range starts moving about a month later, and you learn more about your own customer than a year of sell-through sheets taught you.",
          world: { buyer: "signed", resale: "strong" },
        },
        {
          key: "b",
          text: "Reweight what you send them toward the middle of the range and keep the top of it exclusive to the boutique.",
          consequence:
            "The split works commercially and quietly changes what the store thinks you are. They stop asking about the expensive pieces, and eventually so does everyone else.",
          world: { rail: "mixed", resale: "soft" },
        },
        {
          key: "c",
          text: "Raise it with Hélène as a shared problem and ask what she has seen work, rather than presenting her with a complaint.",
          consequence:
            "She has seen it before and says so. What she suggests is smaller than training their staff and it works about half as well, immediately.",
          world: { buyer: "signed", press: "one" },
        },
      ],
    },

    c: {
      stage: [
        "The decision moved the building. It also went out before anyone checked whether the mill could hold the date, and on Monday the mill says it cannot.",
      ],
      choices: [
        {
          key: "a",
          text: "Own it in front of the team the same way you announced it, then find a second mill before the end of the week.",
          consequence:
            "You say it standing where you stood on Friday. The second mill is more expensive and available, and nobody in the atelier mentions the announcement again.",
          world: { atelier_mood: "trusting", cash: "tight" },
        },
        {
          key: "b",
          text: "Keep it quiet while you fix it. The team just got their first clear schedule in a year and unravelling it publicly costs more than the delay does.",
          consequence:
            "You fix it in nine days without saying anything. Two people work out what happened anyway, and the schedule on the wall is trusted a little less after that.",
          world: { atelier_mood: "strained", cash: "tight" },
        },
        {
          key: "c",
          text: "Cut the order to what the mill can actually do by the date and ship a smaller collection exactly when you said you would.",
          consequence:
            "The collection is four pieces shorter and arrives on the day promised. The store notices the size and does not notice the date, which is the trade you made.",
          world: { rail: "thin", buyer: "signed" },
        },
      ],
    },
  },
};
