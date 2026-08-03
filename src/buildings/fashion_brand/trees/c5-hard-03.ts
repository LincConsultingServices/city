// MAISON · C5 Strategic Thinking · Level A — "Your Name On It" (docs/maison.md
// §9.5). Station st_boutique_floor · host Rio · 5 weeks out.
//
// The Level A version of the collaboration: smaller money, shorter horizon, one
// pressure at a time. Rio is completely honest about being transactional, which
// makes him harder to dismiss than a villain would be.
import type { DecisionTreeContent } from "@/lib/decisionTree";

export const c5Hard03: DecisionTreeContent = {
  kind: "decision_tree",
  station: "st_boutique_floor",
  host: "Rio",
  countdown: "5 weeks out",

  seed: {
    stage: [
      "A fast-fashion brand will pay well for your name on a cheap collaboration. Six pieces, their factories, one season, and a cheque that covers the whole of the show.",
      "Rio walks the floor while he explains it, which means the rail is behind him the entire time. He is not hiding that either.",
    ],
    choices: [
      {
        key: "a",
        text: "Sign it. The cheque solves this season, and brand is something you can rebuild once you're solvent enough to have one.",
        consequence:
          "The money lands and the show is funded. Four months later the six pieces are in a chain you have never set foot in, with your name on the neck of every one.",
        world: { cash: "funded", house_mark: "collab_logo", rail: "collab" },
      },
      {
        key: "b",
        text: "Work out what it does to you over one to three years, put that against the money, and pick accordingly.",
        consequence:
          "Three years out, the picture is a house that is better known and worth less per piece. You sit with both columns for a day and the money does not win.",
        world: { resale: "strong", cash: "tight" },
      },
      {
        key: "c",
        text: "Trace where it lands — resale, the buyers, who takes your call next year — and design the deal around what you won't give up.",
        consequence:
          "You come back with a version that keeps your name off the garment. Rio says it is worth less to them, which is true, and takes it to ask anyway.",
        world: { house_mark: "clean", cash: "season" },
      },
    ],
  },

  followUps: {
    a: {
      stage: [
        "The cheque cleared and the show happened on it. Rio is back with a second season of the same thing, and the boutique has started getting people in asking for the cheap pieces.",
      ],
      choices: [
        {
          key: "a",
          text: "Do the second season. The money is the same, the damage is already done, and one collaboration looks like an accident where two looks like a strategy.",
          consequence:
            "The second season doubles the exposure and halves the distance between the two names. The boutique's own pieces stop being the thing people come in asking about.",
          world: { house_mark: "collab_logo", resale: "soft", rail: "collab" },
        },
        {
          key: "b",
          text: "Stop at one and spend the funded season making the boutique the reason anyone knows the name in the first place.",
          consequence:
            "One collaboration, then nothing. The funded season buys real work and the people who came for the cheap pieces mostly do not come back for the others.",
          world: { cash: "funded", rail: "mixed" },
        },
        {
          key: "c",
          text: "Look at who is actually walking in now and decide whether that is the customer this house was built for, before you sign anything else.",
          consequence:
            "You spend a fortnight on the boutique floor. The new customer is real, buys once, and does not come back, and that is the number the second cheque was worth.",
          world: { resale: "soft", cash: "funded" },
        },
      ],
    },

    b: {
      stage: [
        "You turned it down on the three-year picture and the show is short by the amount of the cheque. Rio, who was not offended, mentions that a house your size took it last month.",
      ],
      choices: [
        {
          key: "a",
          text: "Fund the show smaller. Fewer pieces, the same standard, and a collection that is entirely yours to point at afterwards.",
          consequence:
            "The show is two thirds the size and finished to the same standard. Nobody writes about how small it was, and one person writes about the finishing.",
          world: { rail: "thin", press: "one" },
        },
        {
          key: "b",
          text: "Go back to Rio now with the version you could sign, before the category fills up with houses that said yes faster than you did.",
          consequence:
            "He is still interested and the terms have moved slightly against you, because the house that signed last month set the price. It is a deal you can live with.",
          world: { cash: "season", house_mark: "clean" },
        },
        {
          key: "c",
          text: "Watch what happens to the house that took it, write down what you see, and let that be the evidence for the next offer rather than a hunch.",
          consequence:
            "Eighteen months of notes on somebody else's mistake. It costs you this season's cheque and it is the reason the C8 decision takes an afternoon instead of a fortnight.",
          world: { resale: "strong", cash: "tight" },
        },
      ],
    },

    c: {
      stage: [
        "They came back on the redesigned version: your name off the garment, on the campaign, six pieces, one season. It is most of the money and none of the neck label.",
      ],
      choices: [
        {
          key: "a",
          text: "Take it as offered. You designed the deal you could survive and refusing the version you asked for teaches Rio not to bring you the next one.",
          consequence:
            "It runs one season and ends on the date it said it would. Rio brings you two more offers that year, both shaped like this one rather than like the first.",
          world: { cash: "funded", house_mark: "clean" },
        },
        {
          key: "b",
          text: "Push once more for a separate name on the campaign too, and be genuinely willing to lose the deal over the last ten per cent.",
          consequence:
            "You push and they hold, and then they move on a different clause instead. You get less than you asked for and more than the original offer had in it.",
          world: { house_mark: "clean", resale: "strong" },
        },
        {
          key: "c",
          text: "Write down what you would not give up before the next offer arrives, so the line is decided somewhere other than across a table from Rio.",
          consequence:
            "Four things on a card in the desk drawer. Two of them turn out to be negotiable when tested and the other two never come up for discussion again.",
          world: { house_mark: "clean", cash: "season" },
        },
      ],
    },
  },
};
