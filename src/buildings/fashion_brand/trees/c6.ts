// MAISON · C6 Power & Influence · both tracks (docs/maison.md §9.5).
// Station st_rail · host Hélène · 4 weeks out.
//
// Subtopic `persuasion_storytelling`: the advanced path is reframing the deal
// around what they actually value — you have a resale market they would like
// access to, and that is a story, not a concession. Hélène is precise, courteous
// and never raises the pressure. Élise is visible upstairs the whole time.
import type { DecisionTreeContent } from "@/lib/decisionTree";

export const c6Hard03: DecisionTreeContent = {
  kind: "decision_tree",
  station: "st_rail",
  host: "Hélène",
  countdown: "4 weeks out",

  seed: {
    stage: [
      "A known boutique wants your pieces and wants your margin halved for the exposure. Forty thousand people a week walk that floor and she says the number as though it were a favour, which in her world it is.",
      "She is standing at the rail with her hand on a sleeve. Upstairs, through the balustrade, Élise is pinning.",
    ],
    choices: [
      {
        key: "a",
        text: "Take the terms. That floor puts you in front of forty thousand people a week, and there is no marketing budget on earth that buys that.",
        consequence:
          "The pieces go in at half margin. The floor traffic is real, the sell-through is respectable, and every unit you make for them earns about what the cloth cost.",
        world: { buyer: "signed", cash: "tight", press: "one" },
      },
      {
        key: "b",
        text: "Ask what the exposure is actually worth to them, make the case for what you're worth, and hold the terms that matter while flexing the ones that don't.",
        consequence:
          "It turns out the exposure is worth a great deal to them, because your pieces are what their floor is missing. You give ground on delivery and none on price.",
        world: { buyer: "signed", cash: "season" },
      },
      {
        key: "c",
        text: "Negotiate from what you actually have — a resale market they'd like access to — show them the deal that works for both, and be genuinely willing to leave without it.",
        consequence:
          "You put the resale figures on the rail between you. She reads them properly, which she had not done before, and the conversation stops being about your margin.",
        world: { buyer: "signed", resale: "strong", cash: "season" },
      },
    ],
  },

  followUps: {
    a: {
      stage: [
        "Three months in, the floor traffic has produced good sell-through and no profit. Élise has worked out the per-piece number and left it on the desk without comment, which is how she says things.",
      ],
      choices: [
        {
          key: "a",
          text: "Go back and reprice on the sell-through you have now, because the exposure argument was about an unknown and it is not unknown any more.",
          consequence:
            "You take their own numbers back to them. The margin moves by about half of what it should, which is more than it moved when you had nothing to show.",
          world: { buyer: "signed", cash: "season" },
        },
        {
          key: "b",
          text: "Ride it out for the year. The exposure was the point, the year is nearly up, and reopening it now spends goodwill you will want at renewal.",
          consequence:
            "The year finishes as signed. At renewal they open at the same number, having learned from twelve months that you will take it.",
          world: { buyer: "signed", cash: "tight" },
        },
        {
          key: "c",
          text: "Ask Élise what the per-piece number means for the atelier, and make the next decision on her answer rather than on the traffic figures.",
          consequence:
            "She says the finishing is the first thing that goes at that price, and that she has not let it go yet. It is the most she has said about money in four years.",
          world: { atelier_mood: "trusting", cash: "tight" },
        },
      ],
    },

    b: {
      stage: [
        "You held the price and gave on delivery, and the delivery you agreed to is four weeks tighter than the atelier has ever run. It is three weeks to the show.",
      ],
      choices: [
        {
          key: "a",
          text: "Meet it. You traded delivery for price deliberately and going back on the half you conceded unpicks the half you won.",
          consequence:
            "The atelier runs to eleven for nine days and the delivery lands. The price held, the relationship held, and two people are visibly finished by the end of it.",
          world: { buyer: "signed", atelier_mood: "fractured" },
        },
        {
          key: "b",
          text: "Tell her now that the date is at risk, propose a split delivery, and let her plan around it rather than discover it.",
          consequence:
            "She takes the split without much comment, because a warned problem is a scheduling problem and a discovered one is a supplier problem. The distinction is the whole of her job.",
          world: { buyer: "signed", atelier_mood: "steady" },
        },
        {
          key: "c",
          text: "Work out with Élise what the atelier can actually promise, and negotiate the next one from a number the building has agreed to.",
          consequence:
            "The number she gives you is two weeks longer than you have been quoting. Every deadline after this one is quoted from her figure and every one of them is met.",
          world: { atelier_mood: "trusting", buyer: "signed" },
        },
      ],
    },

    c: {
      stage: [
        "The resale figures changed the room. She is now interested in something other than your margin — she wants first access to the pieces that move on the secondary market, which is a different deal entirely.",
      ],
      choices: [
        {
          key: "a",
          text: "Build that deal properly: full margin, a first-access window on the pieces that resell, and a limit on how many she can take.",
          consequence:
            "It is a better arrangement than either of you walked in with. The limit is the part she argues about, which tells you the limit was the valuable clause.",
          world: { buyer: "signed", cash: "season", resale: "strong" },
        },
        {
          key: "b",
          text: "Give her the access and keep the original margin ask, since the access costs you nothing you were selling anyway.",
          consequence:
            "You trade something free for something real. Six months on, the access has quietly become the reason those pieces resell at all, and it was never free.",
          world: { buyer: "signed", resale: "soft" },
        },
        {
          key: "c",
          text: "Use the same framing everywhere from now on — lead with what they want that you already have, rather than with what you need.",
          consequence:
            "It becomes how negotiations open here. Two of the next three go better than they would have, and the third one goes exactly as badly either way.",
          world: { resale: "strong", press: "one" },
        },
      ],
    },
  },
};

export const c6Pro03: DecisionTreeContent = {
  kind: "decision_tree",
  station: "st_rail",
  host: "Hélène",
  countdown: "4 weeks out",

  seed: {
    stage: [
      "Tight deadline, names on her list you would like on yours, and an opening offer well under your floor. She mentions, pleasantly and only once, that she has other people she can call.",
      "Your position is stable but not strong: four weeks to a show, an atelier at capacity, and a rail that resells for more than you charge for it.",
    ],
    choices: [
      {
        key: "a",
        text: "Concede the terms. Losing this account with four weeks to a show is not a position you can afford to be principled from.",
        consequence:
          "You take her opening number. It ships, it is under your floor, and she opens at the same place next season because there is no reason for her not to.",
        world: { buyer: "signed", cash: "tight" },
      },
      {
        key: "b",
        text: "Protect the margin and the terms that matter, turn each objection into the reason the work costs what it costs, and push for a decision date.",
        consequence:
          "Each objection gets an answer about cloth or hours rather than about price. She lands above your floor and asks for a decision date of her own, which is new.",
        world: { buyer: "signed", cash: "season" },
      },
      {
        key: "c",
        text: "Control the pace of the conversation rather than answering it, aim for the version that works for both of you, and be able to leave without damage if it doesn't hold.",
        consequence:
          "You slow it down, ask more than you answer, and put a shape on the table she had not considered. Neither of you signs that afternoon and neither of you is worse off.",
        world: { buyer: "circling", resale: "strong" },
      },
    ],
  },

  followUps: {
    a: {
      stage: [
        "The account is yours at her number. It is a name you wanted and it is under your floor, and the atelier is now making pieces that pay less than the boutique's.",
      ],
      choices: [
        {
          key: "a",
          text: "Take the name for a year, use it to open three doors that would not have opened, and reprice at renewal from a stronger list.",
          consequence:
            "The name does open doors — two of the three. At renewal you have a better list and she has twelve months of evidence that you will ship at her number.",
          world: { buyer: "signed", press: "warm", cash: "tight" },
        },
        {
          key: "b",
          text: "Reprice now with an honest explanation of the floor, and accept that you may lose the account you just spent four weeks winning.",
          consequence:
            "She listens, does not move, and keeps the order at the old number for the season. You have said the floor out loud, which changes the next conversation and not this one.",
          world: { buyer: "signed", cash: "tight" },
        },
        {
          key: "c",
          text: "Work out what your floor actually is — cloth, hours, the finishing Élise will not give up — and write it where the next negotiation can see it.",
          consequence:
            "The real floor is higher than the one you had been defending, mostly because nobody had costed the finishing properly. It goes on the desk in front of the phone.",
          world: { cash: "tight", atelier_mood: "steady" },
        },
      ],
    },

    b: {
      stage: [
        "You landed above the floor and she asked for a decision date. She now wants an exclusivity clause thrown in for free, framed as the natural consequence of the price you won.",
      ],
      choices: [
        {
          key: "a",
          text: "Refuse it and say why: exclusivity is a product with a price, and giving it away undoes the argument you just spent an afternoon making.",
          consequence:
            "She takes the refusal without any change of temperature and signs anyway. Exclusivity comes up again in the spring, priced, and you sell it to her.",
          world: { buyer: "signed", cash: "season", resale: "strong" },
        },
        {
          key: "b",
          text: "Trade it for something you want — a longer term, earlier payment, or the window of the season you actually need.",
          consequence:
            "You swap exclusivity for payment on delivery. Cash arrives thirty days earlier all year, which turns out to matter more than the clause ever did.",
          world: { buyer: "signed", cash: "season" },
        },
        {
          key: "c",
          text: "Give it for this season only, with a hard end date, and let the clause expire rather than becoming what she expects.",
          consequence:
            "It runs one season and ends. She asks to extend it in month five and the answer is a conversation rather than an assumption, which is what the end date bought.",
          world: { buyer: "signed", press: "one" },
        },
      ],
    },

    c: {
      stage: [
        "Nobody signed and nobody left. A week later she comes back with a shape closer to yours than to hers, and a note that she has stopped talking to the other people she mentioned.",
      ],
      choices: [
        {
          key: "a",
          text: "Close it now on those terms, quickly and warmly, because the version on the table is the one you designed and holding out for more is greed rather than strategy.",
          consequence:
            "Signed in two days. She remembers that you did not squeeze the last ten per cent, and the next negotiation opens somewhere considerably more comfortable.",
          world: { buyer: "signed", cash: "season", resale: "strong" },
        },
        {
          key: "b",
          text: "Push for the last ten per cent while she is clearly committed, because the moment she came back is the moment your position was strongest.",
          consequence:
            "You get most of it. The deal is better on paper and the temperature of every conversation after it is a degree cooler than it was.",
          world: { buyer: "signed", cash: "season", press: "cold" },
        },
        {
          key: "c",
          text: "Write down what actually moved her — the pace, the shape, the willingness to leave — before you forget which of them did the work.",
          consequence:
            "The note is three lines and one of them is wrong, which you find out in the spring. The other two are the reason the spring conversation takes an hour.",
          world: { buyer: "signed", resale: "strong" },
        },
      ],
    },
  },
};
