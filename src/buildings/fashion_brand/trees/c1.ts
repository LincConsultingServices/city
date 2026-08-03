// MAISON · C1 Problem Sensing · both tracks (docs/maison.md §9.5).
// Station st_rail · host Ines · 11 weeks out.
//
// Subtopic `good_questions`: the competency is asking who is actually asking,
// how often, and what they would genuinely pay — the question IS the skill. Ines
// relays other people's opinions as facts, which is the specific unreliability
// the whole beat turns on.
//
// Seed text is the PRD's shipping text verbatim. Tier maps are SERVER-ONLY.
import type { DecisionTreeContent } from "@/lib/decisionTree";

export const c1Hard03: DecisionTreeContent = {
  kind: "decision_tree",
  station: "st_rail",
  host: "Ines",
  countdown: "11 weeks out",

  seed: {
    stage: [
      "Ines finishes a call at the rail to tell you three of her clients want a cheaper way in. She is holding the sleeve of the piece they all asked about while she says it.",
      "She is repeating rather than reporting, and she would be the first to say so if you asked. You have cash for exactly one move this season.",
    ],
    choices: [
      {
        key: "a",
        text: "Launch the entry line now. Three stylists saying the same thing in one week is as close to a market signal as this business gets.",
        consequence:
          "The entry line is on the floor in five weeks. It sells to people who have never bought from you, and two clients who have bought from you for two years ask, politely, whether you have gone mass.",
        world: { rail: "capsule", price_tags: "entry" },
      },
      {
        key: "b",
        text: "Go and ask the clients themselves. Find out whether it's the price they want or an easier first purchase — those are different problems with different answers.",
        consequence:
          "Four of the six will talk to you. None of them says the word cheap. What they describe is walking in and not knowing where to start, which is a door problem wearing a price problem's coat.",
        world: { atelier_mood: "steady" },
      },
      {
        key: "c",
        text: "Put out one short capsule at a lower price and watch who actually buys it before you commit a line to it.",
        consequence:
          "Twelve pieces, six weeks. It sells out and the margin on it is thin enough that Élise works out the number before you do and writes it on the back of the docket.",
        world: { rail: "capsule", cash: "tight" },
      },
    ],
  },

  followUps: {
    a: {
      stage: [
        "The entry line is selling and the people buying it are new. The two long-standing clients who asked whether you had gone mass have not been back, and Ines has stopped mentioning them.",
      ],
      choices: [
        {
          key: "a",
          text: "Go back to both of them and ask what changed, in person, before the next drop is priced and it is too late to change it.",
          consequence:
            "One says the entry line made her feel like she had overpaid for two years. That sentence costs you an afternoon and reprices the whole line in your head.",
          world: { price_tags: "house", resale: "strong" },
        },
        {
          key: "b",
          text: "Keep going. New buyers outnumber the two you lost, and a house that only serves the people who already buy it stops being a house that grows.",
          consequence:
            "The line grows and the top of the range goes quiet. By the show your best-selling piece is also your cheapest, which is a fact you will be explaining for a year.",
          world: { rail: "capsule", resale: "soft" },
        },
        {
          key: "c",
          text: "Split the range properly: an entry line with its own name and its own rail, and the house line untouched at the price it always was.",
          consequence:
            "Two rails, two names, one atelier. It costs more to run than one line and it means nobody has to ask what MAISON costs, because the answer depends on which rail.",
          world: { rail: "capsule", price_tags: "house" },
        },
      ],
    },

    b: {
      stage: [
        "It turns out to be access, not price. They did not want cheaper; they wanted to know where to start. Ines, who told you it was price, is entirely unbothered by having been wrong.",
      ],
      choices: [
        {
          key: "a",
          text: "Fix the door. One clear opening piece, one person on the floor who knows how to begin a conversation, and no change to the price at all.",
          consequence:
            "The opening piece does the work of a whole line. Nobody outside the building notices you did anything, and the boutique starts converting people who used to look and leave.",
          world: { atelier_mood: "trusting", resale: "strong" },
        },
        {
          key: "b",
          text: "Do the entry line anyway. Access was the honest answer, but a lower price is the version of access that scales past one boutique floor.",
          consequence:
            "The line launches on a finding it does not actually answer. It sells, the access problem stays exactly where it was, and now it is a problem in two price brackets.",
          world: { rail: "capsule", price_tags: "entry" },
        },
        {
          key: "c",
          text: "Fix the door first, then price a capsule against what you learn from it, and let the second decision be made on the first one's numbers.",
          consequence:
            "The door work runs for a season before anything is priced. It is slower than everyone in the building would like and it means the capsule, when it comes, is aimed at something.",
          world: { atelier_mood: "steady", cash: "tight" },
        },
      ],
    },

    c: {
      stage: [
        "The capsule sold out and the margin does not scale. Élise's number on the back of the docket says you would need to sell four times as many to make what the house line makes.",
      ],
      choices: [
        {
          key: "a",
          text: "Extend it. Sold out is sold out, the demand is proven, and margin is a problem you can engineer once the volume is actually there.",
          consequence:
            "The extension doubles the run and the margin does not move, because the cloth costs what the cloth costs. You are now busier at the same profit.",
          world: { rail: "capsule", cash: "tight" },
        },
        {
          key: "b",
          text: "Kill it and put the capacity back into the house line, where every piece you make is worth roughly three of these.",
          consequence:
            "The capsule does not come back. The people it brought in mostly do not either, and the atelier goes back to making eight things a week instead of forty.",
          world: { rail: "bold", atelier_mood: "steady" },
        },
        {
          key: "c",
          text: "Reprice it up until the margin works and see whether the demand survives the number, because demand at a loss is not demand.",
          consequence:
            "You raise it by a third. Roughly half the buyers stay, which is fewer pieces and more money, and it tells you what the entry line is actually worth.",
          world: { price_tags: "house", resale: "strong" },
        },
      ],
    },
  },
};

export const c1Pro03: DecisionTreeContent = {
  kind: "decision_tree",
  station: "st_rail",
  host: "Ines",
  countdown: "11 weeks out",

  seed: {
    stage: [
      "A rival launched an entry line last month and it is everywhere. Your own pieces are reselling at nearly double retail, which is the number Ines leads with because it is the number that flatters you.",
      "You have cash for one move and no proof of how many people would actually buy at a lower price. The resale printout by the desk is a week old and already out of date.",
    ],
    choices: [
      {
        key: "a",
        text: "Match them, this season. That buyer is deciding where they start, and whoever they start with is where they stay.",
        consequence:
          "You are on the floor eight weeks after they are, at a similar price, in a category they defined. The line sells and every review of it mentions them first.",
        world: { rail: "capsule", price_tags: "entry" },
      },
      {
        key: "b",
        text: "Run one capsule for a season and track both sell-through and margin properly before you commit a whole line to it.",
        consequence:
          "One season, twelve pieces, and a spreadsheet nobody has kept before. Sell-through is strong and margin is worse than the house line by more than you assumed.",
        world: { rail: "capsule", cash: "tight" },
      },
      {
        key: "c",
        text: "Find out who is asking, how often, and what they would genuinely pay — then spend only where demand and margin both hold.",
        consequence:
          "Three weeks of asking produces a smaller number than the resale figure implied, and a much clearer one: a specific group, a specific price, and a size you can actually make.",
        world: { resale: "strong", atelier_mood: "steady" },
      },
    ],
  },

  followUps: {
    a: {
      stage: [
        "The line lands and does respectable numbers. The trade press files you in a category with the rival's name on it, and your resale on the house pieces softens for the first time in two years.",
      ],
      choices: [
        {
          key: "a",
          text: "Hold the line and push harder on volume. You are in this category now and second place in a growing category still grows.",
          consequence:
            "Volume goes up and the resale keeps drifting down. The category grows and your share of the part of it that pays well does not.",
          world: { resale: "soft", rail: "capsule" },
        },
        {
          key: "b",
          text: "Pull the entry pieces back to a separate name and spend the season making the house line the reason anyone came looking.",
          consequence:
            "The separation costs a season of momentum and stops the drift. The house pieces go back to holding their price, quietly, without anything being announced.",
          world: { rail: "mixed", resale: "strong" },
        },
        {
          key: "c",
          text: "Work out what the resale drop actually cost you against what the line earned, and let that number decide next season rather than instinct.",
          consequence:
            "The arithmetic takes a week and is not close: the line earned less than the secondary market gave up. You now have a number you can hold a meeting with.",
          world: { resale: "soft", cash: "tight" },
        },
      ],
    },

    b: {
      stage: [
        "The season's numbers are in and they disagree with each other. Sell-through says do it. Margin says it will occupy the whole atelier for a third of the money.",
      ],
      choices: [
        {
          key: "a",
          text: "Follow the sell-through. Demand this clear does not turn up twice, and margin is something you fix with scale and better sourcing.",
          consequence:
            "The line goes into full production on the strength of the demand number. The sourcing does not improve fast enough and the atelier spends the season on the cheaper half of the range.",
          world: { rail: "capsule", cash: "tight", atelier_mood: "strained" },
        },
        {
          key: "b",
          text: "Follow the margin. A house this size cannot fund a line that pays a third as well, however many people want it.",
          consequence:
            "You stop it after one season with the demand still there. Two buyers ask what happened to it and you do not have an answer that sounds like anything but arithmetic.",
          world: { rail: "bold", cash: "season" },
        },
        {
          key: "c",
          text: "Go back and find which pieces carried both — the ones that sold and paid — and build the line out of only those.",
          consequence:
            "Four of the twelve did both. A four-piece line is smaller than anyone wanted to launch and it is the only version of this that does not cost you the season.",
          world: { rail: "capsule", price_tags: "house" },
        },
      ],
    },

    c: {
      stage: [
        "You have a real number now: fewer buyers than the resale market suggested, at a higher price than the rival charges. It is a smaller opportunity and a much better described one.",
      ],
      choices: [
        {
          key: "a",
          text: "Build exactly to that number, at that price, and accept that this is a narrow line rather than the growth story everyone wanted.",
          consequence:
            "You make what you measured. It sells through almost completely, the margin holds, and it is small enough that nobody outside the building calls it a launch.",
          world: { rail: "capsule", price_tags: "house", cash: "season" },
        },
        {
          key: "b",
          text: "Use the number to argue for a bigger swing — the demand you found is the floor, not the ceiling, and a first line should reach.",
          consequence:
            "You build past the measurement and the overshoot sits on the rail into the next season. The finding was right and you spent it on optimism.",
          world: { rail: "thin", cash: "tight" },
        },
        {
          key: "c",
          text: "Keep asking on a schedule from now on — the same questions, the same people, every season — so this stops being one lucky look at the market.",
          consequence:
            "It becomes a habit rather than a project. By the show you can say what your buyers want without guessing, which is not a thing this house could do a season ago.",
          world: { resale: "strong", atelier_mood: "trusting" },
        },
      ],
    },
  },
};
