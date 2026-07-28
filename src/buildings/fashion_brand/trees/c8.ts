// MAISON · C8 Value Creation & Credibility · both tracks (docs/maison.md §9.5).
// Station st_desk · host Rio · 1 week out.
//
// Subtopic `real_value`: manufactured scarcity against demonstrated craft. Both
// levers work. The shortcut is cheap, effective, and everyone in this industry
// has pulled it at least once — which is why the option is written as something
// a reasonable person does, not as a temptation.
import type { DecisionTreeContent } from "@/lib/decisionTree";

export const c8Hard03: DecisionTreeContent = {
  kind: "decision_tree",
  station: "st_desk",
  host: "Rio",
  countdown: "1 week out",

  seed: {
    stage: [
      "The drop is Thursday. Rio is at the desk with his phone face up, explaining that the pieces are nearly gone anyway and that posting a sold-out notice on Tuesday would finish them by Wednesday.",
      "The other week you could have is the slow one: film the cloth arriving, the cutting table, Élise's hands, and let people see what they are actually buying.",
    ],
    choices: [
      {
        key: "a",
        text: "Post that it sold out. Scarcity is the oldest lever in this industry, everyone pulls it, and the pieces genuinely are nearly gone.",
        consequence:
          "It works exactly as described. The remaining pieces go in a day and the restock notice the following week does better numbers than the drop did.",
        world: { cash: "season", resale: "soft" },
      },
      {
        key: "b",
        text: "Show the work — the cloth, the construction, Élise's hands — and take slower growth in exchange for people knowing what they're buying.",
        consequence:
          "The films take the whole week and do modest numbers. Two of the people who buy from them write to say which part of the process made them do it.",
        world: { resale: "strong", press: "one" },
      },
      {
        key: "c",
        text: "Teach rather than sell. Make this house the place people learn what good construction looks like, and let the demand arrive as a consequence.",
        consequence:
          "You publish how the shoulder is built, including the part that is expensive and the reason it is. Nothing sells that week. Two ateliers you admire share it.",
        world: { resale: "strong", press: "warm", cash: "tight" },
      },
    ],
  },

  followUps: {
    a: {
      stage: [
        "The drop cleared and the restock did better. Rio wants to run the same play monthly, and a customer has posted a side-by-side of the sold-out notice and the restock two days later.",
      ],
      choices: [
        {
          key: "a",
          text: "Run it monthly. It works, the pieces do sell out, and one customer with a screenshot is not a reason to give up your best-performing lever.",
          consequence:
            "Monthly for a season. Sell-through stays high, the notices stop being believed by about the fourth one, and the resale market prices in the restocks.",
          world: { cash: "season", resale: "soft" },
        },
        {
          key: "b",
          text: "Answer the screenshot honestly and publicly, then only post it sold out on the drops where you have no intention of restocking.",
          consequence:
            "The reply is short and gets more attention than the notice did. The rule holds for the rest of the year and the notices start being believed again.",
          world: { resale: "strong", press: "mixed" },
        },
        {
          key: "c",
          text: "Stop running it and put the week into showing the making instead, which is slower and cannot be screenshotted against you.",
          consequence:
            "Growth halves for two months and then does not. The making films get shared by people who do not buy anything, some of whom buy something in the spring.",
          world: { resale: "strong", press: "one", cash: "tight" },
        },
      ],
    },

    b: {
      stage: [
        "The films did modest numbers and unusually good letters. A magazine has asked to do a longer piece on the atelier, which would take three days of Élise's time in the fortnight before the show.",
      ],
      choices: [
        {
          key: "a",
          text: "Do it, and give them the three days, because coverage of the making is the only coverage that keeps paying after the season ends.",
          consequence:
            "Three days out of the show fortnight. The piece runs in the spring, is the best thing written about this house, and two of the show pieces are finished by someone else.",
          world: { press: "warm", atelier_mood: "strained" },
        },
        {
          key: "b",
          text: "Ask them to come back after the show, when the atelier can give them the access properly rather than in the gaps.",
          consequence:
            "They agree without much enthusiasm and come in December. The piece is smaller than it would have been and everyone in it is recognisably awake.",
          world: { press: "one", atelier_mood: "steady" },
        },
        {
          key: "c",
          text: "Ask Élise whether she wants three days of being filmed at all, and let the answer be hers rather than the schedule's.",
          consequence:
            "She says no, and then says she would do one day if it is about the cloth and not about her. That is what runs, and it is better than the original idea.",
          world: { press: "warm", atelier_mood: "trusting" },
        },
      ],
    },

    c: {
      stage: [
        "Nothing sold that week and the shoulder piece is being taught from. Two ateliers have credited you; one of them has also started making something extremely similar.",
      ],
      choices: [
        {
          key: "a",
          text: "Keep publishing. The technique was never the moat — the hands are — and a house known for teaching gets the next generation of them.",
          consequence:
            "Three more pieces published over the season. Two cutters write asking whether you are hiring, and one of them is the reason the third bench gets filled.",
          world: { press: "warm", atelier_mood: "trusting", resale: "strong" },
        },
        {
          key: "b",
          text: "Stop publishing the construction and keep the sourcing, since giving away what your competitors could not previously do is generosity with a bill attached.",
          consequence:
            "You publish the mills and not the method for the rest of the year. The sharing stops, so does the copying, and so does most of the attention.",
          world: { press: "one", resale: "strong" },
        },
        {
          key: "c",
          text: "Publish the next one with the costs attached, so what spreads is not just the technique but what it actually takes to do it properly.",
          consequence:
            "The costed version spreads further than the first. The house making the similar thing quietly stops, because the number was the part they could not match.",
          world: { press: "warm", resale: "strong", cash: "tight" },
        },
      ],
    },
  },
};

export const c8Pro03: DecisionTreeContent = {
  kind: "decision_tree",
  station: "st_desk",
  host: "Rio",
  countdown: "1 week out",

  seed: {
    stage: [
      "Rio has a placement: three publications, undisclosed, priced per piece and cheaper than you would guess. It reads as editorial and it is not, and the writers taking it are people you have read for years.",
      "The slow version is on the desk beside it — publishing the patterns, the mills, the costs. Cash is tight and the show is Thursday.",
    ],
    choices: [
      {
        key: "a",
        text: "Take the placement. Every house you admire has bought coverage at some point, and being written about is how a small label stops being small.",
        consequence:
          "Three pieces run inside a fortnight and they read exactly like the ones that were not paid for. The traffic is real and so is the invoice.",
        world: { press: "warm", cash: "tight" },
      },
      {
        key: "b",
        text: "Build the reputation the slow way, publish nothing you can't stand behind, and protect the one asset a house this size actually has.",
        consequence:
          "Nothing runs. The show goes out with no coverage arranged and gets two clippings, both of which somebody chose to write.",
        world: { press: "one", resale: "strong" },
      },
      {
        key: "c",
        text: "Invest in the industry around you — publish the sourcing, credit the mill, teach the technique — and let the reputation outlast any single season's coverage.",
        consequence:
          "The mill gets named in every piece of the season's material. They send you cloth they have not offered anyone else, which is not what you did it for and is what it produced.",
        world: { press: "warm", resale: "strong", cash: "tight" },
      },
    ],
  },

  followUps: {
    a: {
      stage: [
        "The placements ran and worked. A writer you have read for years asks, in a friendly way and off the record, whether the piece in the second publication was paid for.",
      ],
      choices: [
        {
          key: "a",
          text: "Tell her the truth, and tell her which one, because a friendly off-the-record question is the cheapest version of this conversation you will ever get.",
          consequence:
            "She thanks you and does not write about it. She also stops asking you for comment, and it takes you eight months to notice that she has.",
          world: { press: "mixed", resale: "strong" },
        },
        {
          key: "b",
          text: "Say nothing specific and let it pass. It was legal, everyone does it, and confirming which piece was paid for damages the publication as much as you.",
          consequence:
            "It passes. The question comes back a year later from someone less friendly, and by then there are four placements rather than one to be asked about.",
          world: { press: "cold" },
        },
        {
          key: "c",
          text: "Start disclosing them from now on — properly, on the material, where anyone can see it — and take whatever that does to the placement rate.",
          consequence:
            "Two of the three publications will not run a disclosed placement. The third will, at a lower price, and it is the one anybody actually reads.",
          world: { press: "mixed", resale: "strong" },
        },
      ],
    },

    b: {
      stage: [
        "Two clippings, unpaid, both chosen. One is polite and one is genuinely admiring about a detail nobody was supposed to notice. Cash is still tight and the show has happened.",
      ],
      choices: [
        {
          key: "a",
          text: "Go and find the person who wrote the second one, and give them the access that produced the detail they noticed.",
          consequence:
            "She comes for a day and writes something twice as long in the spring. The access cost a day and produced the only coverage that mentions the atelier by name.",
          world: { press: "warm", atelier_mood: "trusting" },
        },
        {
          key: "b",
          text: "Take a small placement now to put a floor under the coverage, having proved you can also earn it without one.",
          consequence:
            "One placement, one publication. It performs about as well as the unpaid piece and costs the difference, which is the number you were missing.",
          world: { press: "warm", cash: "tight" },
        },
        {
          key: "c",
          text: "Publish the season's costs and sourcing yourself and stop waiting to be written about at all.",
          consequence:
            "It is read by fewer people than a placement and by exactly the ones who buy. Two mills and one buyer get in touch off the back of it.",
          world: { press: "mixed", resale: "strong" },
        },
      ],
    },

    c: {
      stage: [
        "The mill has become a partner rather than a supplier and the material is credited everywhere. A fast-fashion group has now copied the sourcing note verbatim into their own marketing.",
      ],
      choices: [
        {
          key: "a",
          text: "Let it go. They copied the words and not the mill, and a house that spends its season defending a paragraph has stopped making clothes.",
          consequence:
            "You say nothing. The mill notices on its own and calls them, which goes considerably worse for them than anything you would have done.",
          world: { press: "warm", resale: "strong" },
        },
        {
          key: "b",
          text: "Publish the difference: same words, different cloth, and the invoice that shows what the real version costs per metre.",
          consequence:
            "The comparison travels further than either party wanted. It is the most-read thing the house publishes all year and it is about somebody else.",
          world: { press: "mixed", resale: "strong" },
        },
        {
          key: "c",
          text: "Go further into it — publish the whole chain every season, with names and prices, until copying the note means nothing at all.",
          consequence:
            "Full sourcing, every season, permanently. It becomes the thing the house is known for after the clothes, and two competitors start doing it too.",
          world: { press: "warm", resale: "strong", atelier_mood: "trusting" },
        },
      ],
    },
  },
};
