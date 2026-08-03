// MAISON · C7 People Management · both tracks (docs/maison.md §9.5).
// Station st_atelier · host Élise (Level A) / Élise + Kobby (Level B) · 2 weeks.
//
// Subtopic `motivating_team`: burnout, morale and unequal attention — the
// maintenance of willingness. Élise is the character most at risk of becoming
// the game's conscience (§11, §18.4), so she never comments on a decision as a
// decision. She states facts about cloth and hours and lets you do the rest.
import type { DecisionTreeContent } from "@/lib/decisionTree";

export const c7Hard03: DecisionTreeContent = {
  kind: "decision_tree",
  station: "st_atelier",
  host: "Élise",
  countdown: "2 weeks out",

  seed: {
    stage: [
      "The atelier lights have been on past ten every night for a week. Élise has been in since six each of those mornings and has unpicked the same seam twice, which she has never done.",
      "A large order ships Friday. Two machines are running, nobody is talking, and the third bench has been empty since Tuesday.",
    ],
    choices: [
      {
        key: "a",
        text: "Hold the date. Everyone in this building knew what the two weeks before a show look like when they took the job, and moving it costs you the slot.",
        consequence:
          "Friday is met. The order ships complete and on time, and on Monday two of the four people who made it are not in, one of them for the first time in three years.",
        world: { atelier_mood: "fractured", buyer: "signed" },
      },
      {
        key: "b",
        text: "Rebalance the workload, check whether you've been loading her because she never complains, and put something in place for the team to tell you before it gets here again.",
        consequence:
          "You look at who has been given what since spring. Élise has roughly a third more than anyone else and has never once mentioned it, which is exactly why it kept happening.",
        world: { atelier_mood: "steady" },
      },
      {
        key: "c",
        text: "Fix what's actually causing it — the sample revisions, not the hours — make it safe for her to say so, and accept the ship date moves.",
        consequence:
          "It was the revisions: eleven of them on four pieces, every one from you. Friday moves to the following Wednesday and the atelier is quiet for a different reason that night.",
        world: { atelier_mood: "trusting", buyer: "circling" },
      },
    ],
  },

  followUps: {
    a: {
      stage: [
        "The order shipped. On Wednesday Élise says, in the flat way she says everything, that she has been offered work somewhere else and has not decided yet.",
      ],
      choices: [
        {
          key: "a",
          text: "Ask her what would make her stay and be prepared to hear something you cannot do anything about for another two seasons.",
          consequence:
            "What she wants is a second cutter and no more eleven o'clocks. Neither is available this season and she stays anyway, on the strength of being asked properly.",
          world: { atelier_mood: "steady" },
        },
        {
          key: "b",
          text: "Match whatever they are offering and keep the conversation about money, because money is the part you can actually move this week.",
          consequence:
            "You match it inside a day and she takes it. The eleven o'clocks continue and so does she, and the offer comes round again in the spring.",
          world: { atelier_mood: "strained", cash: "tight" },
        },
        {
          key: "c",
          text: "Fix the thing that produced the week — the revisions, the loading, the empty third bench — and tell her that is what you are doing.",
          consequence:
            "It takes two months and she watches all of it. The third bench is filled in January and nothing more is ever said about the other offer.",
          world: { atelier_mood: "trusting", cash: "tight" },
        },
      ],
    },

    b: {
      stage: [
        "The rebalance holds and the room is calmer. What surfaces next is quieter: two of the machinists have stopped putting ideas forward at all, and neither of them has been asked why.",
      ],
      choices: [
        {
          key: "a",
          text: "Ask them directly, one at a time, away from the bench, and be ready for the answer to be about you rather than about the work.",
          consequence:
            "It is about you. You take the first suggestion offered in any room and stop listening, and both of them worked that out months before you did.",
          world: { atelier_mood: "trusting" },
        },
        {
          key: "b",
          text: "Change how ideas reach you — everything in writing before the meeting, read before anyone speaks — and let the process fix what the conversation would not.",
          consequence:
            "The written version surfaces four ideas in a fortnight, two of them from people who had said nothing since spring. Nobody has to be told they were being overlooked.",
          world: { atelier_mood: "trusting", rail: "mixed" },
        },
        {
          key: "c",
          text: "Leave it until after the show. The room is calmer than it was, the date is in ten days, and this is a conversation that needs time you do not have.",
          consequence:
            "It waits. The show goes out on a calmer atelier and the two machinists say nothing for the rest of the season, which is what leaving it looks like.",
          world: { atelier_mood: "steady" },
        },
      ],
    },

    c: {
      stage: [
        "The revisions stopped and the date moved. The buyer took the new date without much comment, and the atelier finished at seven for four nights running.",
        "Élise has said nothing about any of it, which from Élise is the loudest available response.",
      ],
      choices: [
        {
          key: "a",
          text: "Hold the new discipline through the show — decisions locked at the sample stage, revisions costed in days — even when the next idea is a good one.",
          consequence:
            "Two good ideas get held until next season. One of them would have been better this season and the collection ships on the date it said it would.",
          world: { atelier_mood: "trusting", rail: "bold" },
        },
        {
          key: "b",
          text: "Tell the buyer the real reason the date moved, so the next quote you give them is one they can trust.",
          consequence:
            "She is unsurprised and says most houses do not tell her. The next date you quote her is believed without a follow-up call, which has never happened before.",
          world: { buyer: "signed", atelier_mood: "trusting" },
        },
        {
          key: "c",
          text: "Push one more revision through. The date already moved, the cost is paid, and the piece it fixes is the one the show opens with.",
          consequence:
            "The revision goes in and the piece is better. The date moves again by two days, and the discipline you established last week is now a thing that has exceptions.",
          world: { atelier_mood: "strained", rail: "bold" },
        },
      ],
    },
  },
};

export const c7Pro03: DecisionTreeContent = {
  kind: "decision_tree",
  station: "st_atelier",
  host: "Élise + Kobby",
  countdown: "2 weeks out",

  seed: {
    stage: [
      "A cutting error from the new hire has cost four metres of the show cloth, which cannot be reordered inside two weeks. Morale was already flat.",
      "And you have noticed, this week, that you have taken Kobby's suggestion nine times running and nobody else in the atelier has offered one in a month. He is downstairs at the rail looking at his own piece.",
    ],
    choices: [
      {
        key: "a",
        text: "Deal with the error, keep the pace, and address the rest after the show. There is a version of this conversation that can wait and this is it.",
        consequence:
          "The error is handled in ten minutes and the pace holds. The month without suggestions becomes two months, and Kobby keeps being the only voice in the room.",
        world: { atelier_mood: "strained", rail: "bold" },
      },
      {
        key: "b",
        text: "Handle the mistake respectfully, name the favouritism out loud before someone else does, and protect the team's trust while the pressure is on.",
        consequence:
          "You say it in front of everyone, including Kobby, who goes the colour of the cloth. Two people look up from their machines, which is two more than have looked up all week.",
        world: { atelier_mood: "steady" },
      },
      {
        key: "c",
        text: "Put people first where it actually costs you — fix the process that let the error through, change how ideas reach you, and carry the schedule hit yourself.",
        consequence:
          "A checking step goes in, ideas start coming in writing, and you take the two lost days out of your own part of the schedule. The show is now tighter for you and nobody else.",
        world: { atelier_mood: "trusting", cash: "tight" },
      },
    ],
  },

  followUps: {
    a: {
      stage: [
        "The show shipped. In the week after it, the new hire resigns and Kobby asks for a title, and both of those conversations arrive on the same afternoon.",
      ],
      choices: [
        {
          key: "a",
          text: "Ask the new hire to stay long enough to tell you what the first month was actually like, and act on whatever she says.",
          consequence:
            "She stays for the conversation and not for the job. What she describes is a room where one person's ideas are already the answer before anyone else speaks.",
          world: { atelier_mood: "steady" },
        },
        {
          key: "b",
          text: "Give Kobby the title. He earned it on output, the atelier needs a second decision-maker, and rewarding the person who delivers is not favouritism.",
          consequence:
            "He takes it and is good at it. The three people who had stopped offering ideas now report to the reason they stopped, and none of them mentions that.",
          world: { atelier_mood: "strained" },
        },
        {
          key: "c",
          text: "Hold both conversations open for a week and go and ask the rest of the atelier what they think should happen before you decide either.",
          consequence:
            "Four people are asked and three of them answer honestly. The title goes to Kobby with a scope they helped write, and the new hire's exit note goes on the wall.",
          world: { atelier_mood: "trusting" },
        },
      ],
    },

    b: {
      stage: [
        "Naming it changed the room and cost Kobby something. He is polite, working, and has not offered an idea in nine days — and the collection was partly running on his ideas.",
      ],
      choices: [
        {
          key: "a",
          text: "Talk to him properly: he was not the problem, the pattern was yours, and a house that punishes its most generous person has fixed nothing.",
          consequence:
            "It takes twenty minutes at the cutting table. He is back the following day and the difference is that now he asks who else has thought about it first.",
          world: { atelier_mood: "trusting", rail: "mixed" },
        },
        {
          key: "b",
          text: "Leave him to it and spend the nine days drawing the quieter three out, since that was the whole point of saying it.",
          consequence:
            "Two of the three start contributing and Kobby stays quiet through the show. You have traded your most prolific designer for a wider room and you do not know yet what that costs.",
          world: { atelier_mood: "steady", rail: "mixed" },
        },
        {
          key: "c",
          text: "Put a structure round it — everyone's idea in writing, read blind, chosen on the work — so it stops depending on how anyone feels this week.",
          consequence:
            "The blind read is uncomfortable for a fortnight and then normal. Kobby's hit rate is still the highest and it is now a fact rather than a habit.",
          world: { atelier_mood: "trusting" },
        },
      ],
    },

    c: {
      stage: [
        "The checking step catches two more errors before the show. You are two days behind on your own work and the collection is not, which nobody has remarked on and everybody has noticed.",
      ],
      choices: [
        {
          key: "a",
          text: "Keep carrying it through the show and let the team run at the pace the new process allows rather than the one the date wants.",
          consequence:
            "You finish your part at two in the morning twice. The collection ships whole, and the atelier's version of this fortnight is a good one.",
          world: { atelier_mood: "trusting", rail: "bold" },
        },
        {
          key: "b",
          text: "Hand two of your pieces to Kobby and Élise and tell them why, rather than quietly working later and calling it leadership.",
          consequence:
            "They take one each and both are finished better than you would have finished them. Asking cost you something and it was not the thing you expected.",
          world: { atelier_mood: "trusting", rail: "mixed" },
        },
        {
          key: "c",
          text: "Drop your two pieces from the collection entirely. The show does not need them and the fortnight does not need a hero.",
          consequence:
            "The collection is two pieces shorter and finishes on schedule. Nobody outside the building counts, and everybody inside it knows which two are missing.",
          world: { rail: "thin", atelier_mood: "steady" },
        },
      ],
    },
  },
};
