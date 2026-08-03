// MAISON · C4 Financial Discipline · both tracks (docs/maison.md §9.5).
// Station st_desk · host Dov · 7 weeks out.
//
// Subtopic `roi`: "what does this equity actually cost over ten years" is return
// on investment. Dov genuinely likes the clothes, is in no hurry, and uses "we"
// early — patient money is the most effective form of pressure there is, and
// nothing he says is a threat.
import type { DecisionTreeContent } from "@/lib/decisionTree";

export const c4Hard03: DecisionTreeContent = {
  kind: "decision_tree",
  station: "st_desk",
  host: "Dov",
  countdown: "7 weeks out",

  seed: {
    stage: [
      "Pre-orders are strong enough that Élise has started asking about capacity. The obvious move is to double the run and hire the two people the atelier has needed since spring.",
      "Dov is sitting at the desk, uninvited and not rude about it, with the fabric invoice between you. It has gone up. Cash is tight and he is not in any hurry.",
    ],
    choices: [
      {
        key: "a",
        text: "Double the production run and hire the two people now. Momentum in this business is a window, not a trend, and windows close.",
        consequence:
          "Both hires start within a fortnight and the run doubles. Six weeks later the pre-orders convert at about seventy per cent and the payroll does not care what they converted at.",
        world: { cash: "tight", atelier_mood: "steady" },
      },
      {
        key: "b",
        text: "Produce only what has already been ordered, keep the cash where it is, and take on freelancers instead of permanent hires.",
        consequence:
          "The order ships complete and the cash stays where it is. Two freelancers come and go and neither of them learns the house's way of finishing a hem.",
        world: { cash: "season", atelier_mood: "strained" },
      },
      {
        key: "c",
        text: "Match the spend to demand you can prove, time it to when the money actually lands, and hold a reserve for the next drop.",
        consequence:
          "You build to the paid orders, hire one person on the date the first payment clears, and put the rest aside. It is the least exciting version of this and the atelier is still there in October.",
        world: { cash: "season" },
      },
    ],
  },

  followUps: {
    a: {
      stage: [
        "The unconverted third of the pre-orders is sitting in the stockroom and the second payroll run is on Friday. Dov, who has said nothing about any of it, asks how the month is going.",
      ],
      choices: [
        {
          key: "a",
          text: "Take his money. He is offering on a month that still looks good from outside, and money raised before you need it costs less than money raised after.",
          consequence:
            "The paperwork takes eleven days and the percentage is fair. He is on the desk documents from then on, and the payroll runs without anyone noticing it nearly did not.",
          world: { equity: "sold", cash: "funded" },
        },
        {
          key: "b",
          text: "Discount the unsold third into the boutique and cover Friday out of the till rather than out of the company's ownership.",
          consequence:
            "The discount clears most of it and the price tags come down to do it. Friday is covered, the equity is untouched, and the boutique has now taught its customers to wait.",
          world: { price_tags: "cut", cash: "tight" },
        },
        {
          key: "c",
          text: "Work out what a third of unsold stock actually costs per season, tell Dov that number, and ask him what he would do with it.",
          consequence:
            "The number is worse than you expected and saying it out loud to an investor is worse still. What he suggests is not money, and it works.",
          world: { cash: "tight", atelier_mood: "steady" },
        },
      ],
    },

    b: {
      stage: [
        "The order shipped and the cash held. The freelancers are gone, Élise is doing the finishing herself again, and two of the pre-order customers have asked when the next drop is.",
      ],
      choices: [
        {
          key: "a",
          text: "Hire one person properly now, on the strength of a completed order and a reorder request, and stop renting the skill you need every season.",
          consequence:
            "One permanent hire, trained by Élise over six weeks. It costs more than freelancing and it is the first time the atelier has had a third pair of hands that stay.",
          world: { atelier_mood: "trusting", cash: "tight" },
        },
        {
          key: "b",
          text: "Keep renting. Freelancers cost more per hour and nothing per quiet month, which is the shape this business actually has.",
          consequence:
            "You stay flexible. Élise does the finishing on three more drops and the quality holds, and nobody asks her whether that arrangement is working for her.",
          world: { cash: "season", atelier_mood: "strained" },
        },
        {
          key: "c",
          text: "Cost both properly over four seasons — hourly against salaried, quiet months included — and hire on whichever number is smaller.",
          consequence:
            "Salaried wins over four seasons by a margin that surprises you, mostly because of what re-teaching a freelancer costs each time. You hire on the arithmetic.",
          world: { cash: "season", atelier_mood: "trusting" },
        },
      ],
    },

    c: {
      stage: [
        "The measured version worked. Everything you made was paid for, the reserve is intact, and the one hire has learned the house's hem. It is also visibly less than the business could have grown by.",
      ],
      choices: [
        {
          key: "a",
          text: "Put the reserve into the next drop now. Discipline that never spends is just a slower way of not having a business.",
          consequence:
            "The reserve goes in and the next drop is twice the size. It sells at the same rate as the last one, which means the reserve was the right size and is now gone.",
          world: { cash: "tight", rail: "bold" },
        },
        {
          key: "b",
          text: "Hold the reserve through the show. Eleven weeks out with an unshipped collection is not the moment to spend the thing that covers surprises.",
          consequence:
            "It sits untouched until the show and then covers exactly one surprise, which was a mill invoice nobody had modelled. It was the right size.",
          world: { cash: "season" },
        },
        {
          key: "c",
          text: "Write the rule down: what the reserve is for, what triggers spending it, and who gets to decide — before there is any pressure on it.",
          consequence:
            "The rule is four lines on the desk. It gets tested in week two of the show run and it holds, largely because it was written when nobody was frightened.",
          world: { cash: "season", atelier_mood: "trusting" },
        },
      ],
    },
  },
};

export const c4Pro03: DecisionTreeContent = {
  kind: "decision_tree",
  station: "st_desk",
  host: "Dov",
  countdown: "7 weeks out",

  seed: {
    stage: [
      "Pre-orders are strong and unpaid — the orders exist, the money is thirty to sixty days behind them. Fabric costs have jumped again and the mill wants half up front this time.",
      "Dov will fund you for a percentage. He likes the clothes, he has been patient for six weeks, and he is about to be patient for six more. You have about one season of cash.",
    ],
    choices: [
      {
        key: "a",
        text: "Take Dov's money. He's offering on a good month at a fair number, and money raised from strength is the cheapest money you will ever get.",
        consequence:
          "It clears in eleven days at a number you would not be embarrassed to repeat. A second name goes on the desk paperwork and the mill gets its half up front.",
        world: { equity: "sold", cash: "funded" },
      },
      {
        key: "b",
        text: "Produce only paid orders, put what's left behind the highest-return piece, and price what the equity would actually cost you over ten years.",
        consequence:
          "The ten-year number is the one that stops you: at this growth rate the percentage he is asking for is worth several times what he is putting in. You keep it and you make less this year.",
        world: { cash: "tight", equity: "whole" },
      },
      {
        key: "c",
        text: "Build the money out of the business first — pre-paid orders, a fabric partner, terms from the mill — and go to Dov only for what's left.",
        consequence:
          "Three conversations produce two thirds of what you needed and none of it costs ownership. The remaining third is small enough that Dov's percentage is small too.",
        world: { cash: "season", equity: "whole" },
      },
    ],
  },

  followUps: {
    a: {
      stage: [
        "The money is in and it has changed the room. The mill is happy, the collection is fully funded, and Dov now attends things. He is pleasant about it and he is entitled to be there.",
      ],
      choices: [
        {
          key: "a",
          text: "Use it the way you said you would, report to him monthly without being asked, and treat the percentage as a relationship rather than a transaction.",
          consequence:
            "The monthly note takes an hour and buys you a year of not being asked. He introduces you to a mill on better terms in month four, unprompted.",
          world: { equity: "sold", cash: "funded" },
        },
        {
          key: "b",
          text: "Spend it fast on the collection while the season is live, and have the conversation about what he expects once the show has happened.",
          consequence:
            "The collection is the best-funded thing this house has made. The conversation happens in November and starts with a question about the burn rate you did not have an answer for.",
          world: { cash: "funded", atelier_mood: "strained" },
        },
        {
          key: "c",
          text: "Model what he owns at three different growth rates, so you know today what this costs you at the good outcome and not just the bad one.",
          consequence:
            "At the outcome you are actually working toward, the percentage costs more than the whole of this season's revenue. You keep the model and you do not enjoy it.",
          world: { equity: "sold", resale: "strong" },
        },
      ],
    },

    b: {
      stage: [
        "You kept the equity and the season is thin. The highest-return piece is carrying the whole collection, everything else was cut back, and the mill is being paid in instalments it did not really agree to.",
      ],
      choices: [
        {
          key: "a",
          text: "Hold the line to the show. You priced the equity honestly and a thin season is what the honest price of keeping it looks like.",
          consequence:
            "The show goes out narrow and wholly owned. Two of the pieces you cut were the ones the buyers ask about, and you own all of the answer.",
          world: { rail: "thin", equity: "whole" },
        },
        {
          key: "b",
          text: "Go back to Dov for a smaller amount at a smaller percentage, now that you know precisely what you need and what it is worth.",
          consequence:
            "A third of the original ask, at a proportionate slice. He signs the same week and mentions, without any edge on it, that the number would have been identical in September.",
          world: { equity: "sold", cash: "season" },
        },
        {
          key: "c",
          text: "Take the mill situation to them straight, agree a schedule you can actually meet, and stop paying in instalments nobody signed off.",
          consequence:
            "They are unsurprised and reasonable, which is worse than being angry. The agreed schedule is tighter than what you had been doing and you meet all of it.",
          world: { cash: "tight", resale: "strong" },
        },
      ],
    },

    c: {
      stage: [
        "Two thirds came out of the business: a fabric partner taking a share of the drop, three clients pre-paying, and thirty days from the mill. Dov's slice is small and he seems entirely pleased about it.",
      ],
      choices: [
        {
          key: "a",
          text: "Make this the standing method — build it out of the business first, every season, and treat outside money as the last third rather than the first call.",
          consequence:
            "It becomes how funding works here. By the show three of the four sources are repeatable, and the one that is not was the pre-paying clients.",
          world: { cash: "season", equity: "whole" },
        },
        {
          key: "b",
          text: "Take more from Dov while the terms are this good, since a small percentage now is cheaper than a larger one in a bad month.",
          consequence:
            "You take three times what you needed at the same rate. The money sits mostly unused until the show, having cost a piece of the company to sit there.",
          world: { equity: "sold", cash: "funded" },
        },
        {
          key: "c",
          text: "Check what the fabric partner's share actually costs across the drop, because a share of revenue is not obviously cheaper than a share of the company.",
          consequence:
            "On this drop the partner costs more than Dov's slice would have. It is the right structure and the wrong price, and now you know which of those you were solving.",
          world: { cash: "tight", equity: "whole" },
        },
      ],
    },
  },
};
