// MAISON · C5 Strategic Thinking · Level B — "Two Seasons"
// (docs/maison.md §9.4, fully worked there). Station st_boutique_floor · host
// Rio · 5 weeks out. Nine leaves.
//
// The tier map for this tree is SERVER-ONLY (§10.2, §0.5).
import type { DecisionTreeContent } from "@/lib/decisionTree";

export const c5Pro03: DecisionTreeContent = {
  kind: "decision_tree",
  station: "st_boutique_floor",
  host: "Rio",
  countdown: "5 weeks out",

  seed: {
    stage: [
      "Rio walks while he talks, which means you turn to follow him, which means the rail is behind him the entire conversation. He is not hiding it. He knows exactly where he is standing.",
      "A fast-fashion group wants your name on a capsule. Twelve pieces, their factories, their price points, your label on the neck alongside theirs. The money funds two seasons outright.",
      "You have four weeks of cash. The pieces on your rail resell for more than you charge for them, which is the only reason Hélène is interested and the only reason Rio is here.",
      "Rio: “Two seasons of runway. That's what this is. I'm not going to pretend it's anything else.”",
    ],
    choices: [
      {
        key: "a",
        text: "Work the numbers on what it does to you — resale, the buyers, what Hélène says when she sees it — then decide with the cost in front of you.",
        consequence:
          "You spend two days on it and the number that stops you is not the fee, it's the resale — a comparable house did this eighteen months ago and their secondary market has never recovered. You knew the deal was a trade. Now you know what you were trading.",
        world: { resale: "strong" },
      },
      {
        key: "b",
        text: "Map the chain before you answer: cash this year, resale next year, who takes your call the year after. Then design the deal around what you won't give up, or refuse it.",
        consequence:
          "You come back to Rio with a shape rather than an answer: no label on the neck, a separate name, twelve pieces, one season, and a hard end date. He says he'll ask. It's smaller money. It is also a deal you could survive being public.",
        world: { cash: "funded", house_mark: "clean" },
      },
      {
        key: "c",
        text: "Sign it. Two seasons of funded runway buys you the freedom to be uncompromising later, and nobody remembers who paid for the year you survived.",
        consequence:
          "The money clears in eleven days and it is more money than this company has ever had at once. Three months later the capsule is in every branch of a chain with 600 stores, your resale prices have halved, and Hélène's calls have got noticeably shorter.",
        world: { cash: "funded", house_mark: "collab_logo", resale: "soft", rail: "collab" },
      },
    ],
  },

  followUps: {
    // ── you costed it properly and declined ──────────────────────────────────
    a: {
      stage: [
        "You turned it down on the resale number. Six weeks later a house one tier above you takes almost the same deal and gets a visible sales bump and a lot of coverage. Ines asks, not unkindly, whether you were being principled or slow.",
      ],
      choices: [
        {
          key: "a",
          text: "Say the quiet part: you weren't being principled, you were being solvent, and you'd take a version of that deal tomorrow if it didn't touch the neck label.",
          consequence:
            "Saying it out loud costs you nothing with Ines and something with yourself. Two people who work for you hear it. The next offer that comes in, you read the neck-label clause first.",
          world: { resale: "strong", cash: "tight" },
        },
        {
          key: "b",
          text: "Hold the position and say nothing. The bump is three months old; the resale damage takes eighteen. You'll be right eventually and being right early looks like being wrong.",
          consequence:
            "You say nothing for a year. The other house's resale halves on schedule and nobody connects it to the capsule, so the vindication arrives privately and pays for nothing.",
          world: { resale: "strong", press: "cold" },
        },
        {
          key: "c",
          text: "Go back to Rio with the version you'd actually sign — different name, hard end date, no label — and use the fact that a bigger house just validated the category.",
          consequence:
            "He takes it back to them and they move further than they did the first time, because now there is a comparable. The money is smaller than the original offer and it arrives without a clause you would have to explain.",
          world: { cash: "funded", house_mark: "clean" },
        },
      ],
    },

    // ── you designed a deal you could survive ────────────────────────────────
    b: {
      stage: [
        "They agree to most of it and push back on one thing: they want the MAISON name in the marketing even if it's off the neck. It is a smaller concession than the one you refused and it is the same concession.",
      ],
      choices: [
        {
          key: "a",
          text: "Refuse it, in writing and specifically — the neck label was never the point, the association was, and conceding it in marketing concedes it everywhere.",
          consequence:
            "They come back inside a week having dropped it, because the deal was already built and the name was the cheapest thing in it for them to give up. You learn what your refusals are worth.",
          world: { house_mark: "clean", resale: "strong" },
        },
        {
          key: "b",
          text: "Take it. You held the line where it actually mattered, the marketing is transient, and the garment is the thing that lasts.",
          consequence:
            "The campaign runs your name across six markets for one season. The garments carry someone else's label and the advertising carries yours, which turns out to be the half that people remember.",
          world: { house_mark: "clean", resale: "soft" },
        },
        {
          key: "c",
          text: "Trade it: they can use the name for one campaign window, and in exchange the whole thing ends on a fixed date with no renewal option.",
          consequence:
            "Both sides sign something narrower than they wanted. The window closes on the date it said it would, and when they ask about a second season there is nothing to renew.",
          world: { cash: "funded", resale: "strong" },
        },
      ],
    },

    // ── you signed ───────────────────────────────────────────────────────────
    c: {
      stage: [
        "The capsule is everywhere. Your resale has halved, Hélène's calls have got shorter, and Rio has come back with a second, larger version of the same offer. The money is real, the runway is real, and the thing you were funding it to protect is visibly worse than it was.",
      ],
      choices: [
        {
          key: "a",
          text: "Take the second one too. You are in this now; the damage is done and the only bad version of this is doing it once and getting none of the upside.",
          consequence:
            "The second cheque is larger than the first. The resale does not recover, Hélène stops calling, and MAISON becomes a name that appears on other people's clothes more often than on its own.",
          world: { cash: "funded", resale: "soft", rail: "collab" },
        },
        {
          key: "b",
          text: "Stop at one. Take the money you have, spend the two seasons rebuilding the thing you spent, and treat the capsule as a bridge rather than a business.",
          consequence:
            "Two funded seasons with nothing to sign. The resale comes back about halfway by the second one, and the buyers who went quiet mostly stay quiet.",
          world: { cash: "funded", rail: "mixed" },
        },
        {
          key: "c",
          text: "Stop, and be public about stopping — put the reason in the next collection's notes, let the market see a house that priced its own mistake, and start earning the resale back.",
          consequence:
            "The notes get quoted more than the collection does. Some of it reads as honesty and some of it reads as damage control, and both readings appear on the press wall.",
          world: { house_mark: "clean", press: "mixed", rail: "mixed" },
        },
      ],
    },
  },
};
