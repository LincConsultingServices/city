// Café decision-tree quest content (PRD_Cafe_Interior.md §4, §6). DECISION_TREE →
// `trace` result: the server grades the chosen path against tier rubrics the
// client never sees or computes. Each entry here is one competency × level scene:
// a speaker delivers the seed prompt, the player picks one of 3 staged choices
// (tier is carried for the rubric only — the renderer must never display it), and
// the consequence plays before the framework's result screen takes over.
//
// Follow-up branches (the "a week later…" second beat in the source design) are
// intentionally NOT encoded yet — only their prompts were specified, not their
// choice text/consequences (PRD_Cafe_Interior.md §8). Every `next` below is
// `null`; wiring a second node in is a follow-on content change, not a code change.
import type { DecisionTreeContent } from "../content";

// Registry-id shape must match the canonical `C\d-(BEG|MED|HARD)-\d{2}` pattern
// (content.test.ts). Numbers start at 13, past every competency's reserved
// 01-12 block, because that block is live-seeded for more than just C4: the
// co-located academy-backend repo's registry packs show C4-BEG (12 activities)
// AND C9 fully seeded across BEG/MED/HARD (12 each) — colliding with any of
// those ids would silently misscore a real activity, exactly what
// content.test.ts/content.integration.test.ts exist to catch.
export const CAFE_ACTIVITY_IDS: Record<string, { A: string; B: string }> = {
  C1: { A: "C1-BEG-13", B: "C1-BEG-14" },
  C2: { A: "C2-BEG-13", B: "C2-BEG-14" },
  C3: { A: "C3-BEG-13", B: "C3-BEG-14" },
  C4: { A: "C4-MED-13", B: "C4-MED-14" },
  C5: { A: "C5-BEG-13", B: "C5-BEG-14" },
  C6: { A: "C6-BEG-13", B: "C6-BEG-14" },
  C7: { A: "C7-BEG-13", B: "C7-BEG-14" },
  C8: { A: "C8-BEG-13", B: "C8-BEG-14" },
  C9: { A: "C9-BEG-13", B: "C9-BEG-14" },
};

function scene(
  speaker: string,
  prompt: string,
  choices: {
    text: string;
    tier: "developing" | "strong" | "advanced";
    consequence: string;
  }[],
): DecisionTreeContent {
  return {
    kind: "decision_tree",
    entryNodeId: "root",
    nodes: [
      {
        id: "root",
        speaker,
        prompt,
        choices: choices.map((c, i) => ({
          id: ["a", "b", "c"][i],
          text: c.text,
          tier: c.tier,
          consequence: c.consequence,
          next: null,
        })),
      },
    ],
  };
}

export const CAFE_CONTENT: Record<string, DecisionTreeContent> = {
  // C1 — Problem Sensing: build from real customer needs, not guesses.
  "C1-BEG-13": scene(
    "A cluster of regulars",
    "Several customers this week asked about dairy-free milk. You have enough cash for one move. What's your play?",
    [
      {
        text: "Add oat milk right now — customers are telling you what they want, and moving fast wins in a small café.",
        tier: "developing",
        consequence:
          "You stock it fast. A few customers love it, but the almond cartons expire unused. You acted on what people said, not on what they'd actually pay for.",
      },
      {
        text: "Talk to the people asking. Is it just a casual request, or the real reason they'd go somewhere else? Then decide.",
        tier: "advanced",
        consequence:
          "You discover the requests come from commuters who've been slipping off to a rival — so you fix the real problem, not just the surface request.",
      },
      {
        text: 'Put a "coming soon?" card on the counter for two days, and add it only if enough people react.',
        tier: "strong",
        consequence:
          "A dozen people react to the card. You order with confidence, and it sells. A cheap test beat a guess.",
      },
    ],
  ),
  "C1-BEG-14": scene(
    "Your supplier, on the phone",
    "Dairy-free requests are up, your supplier costs are up too, a rival café just launched a full plant-based menu, and you have one week's cash. You have no solid data on how many people would actually buy it.",
    [
      {
        text: "Match the rival's plant-based range right away — hesitating gives up ground you can't win back.",
        tier: "developing",
        consequence:
          "You match the rival, but not what your own customers want. The new items don't move, and your profit thins out in an already tight month.",
      },
      {
        text: "Try oat milk on its own for a week. Watch how many people order it and how it affects your profit, then decide on the rest.",
        tier: "strong",
        consequence:
          "The one-week trial separates real demand from noise. Oat milk earns its spot, and you skip the rest. Controlled and clear.",
      },
      {
        text: "First map out who's asking, how often, and what they'd really pay. Spend only where both the demand and the profit hold up.",
        tier: "advanced",
        consequence:
          "You find the demand is mostly weekday commuters, not weekend regulars — so you aim the offer at them, protect your profit, and blunt the rival.",
      },
    ],
  ),

  // C2 — Learning Agility: change quickly when the facts prove you wrong.
  "C2-BEG-13": scene(
    "Your own gut, two weeks in",
    "The new iced drink you were sure would be a hit is barely selling, two weeks in. What do you do?",
    [
      {
        text: "Ask a few people who skipped the drink why they passed, then adjust the recipe.",
        tier: "strong",
        consequence: "Customers tell you it's too sweet. You adjust, and sales lift. You listened.",
      },
      {
        text: "Keep promoting it harder — good drinks take time to catch on.",
        tier: "developing",
        consequence:
          "You push harder for a month and it still stalls. You defended the idea instead of the café.",
      },
      {
        text: "Test one change — the price or the name — for a week, and let the numbers make the call.",
        tier: "advanced",
        consequence:
          "Renamed and repriced, it sells — you kept the good part and dropped the wrong assumptions.",
      },
    ],
  ),
  "C2-BEG-14": scene(
    "Your team, watching",
    "The drink you championed to your staff is underperforming. The team is watching to see if you'll admit it. Scrapping it means eating the ingredient cost. What do you do?",
    [
      {
        text: "Run one clean test — change a single thing, measure it, and decide in advance whether you'll keep it or cut it.",
        tier: "advanced",
        consequence:
          "The structured test saves the drink and teaches the team how to improve something — not just that you were right.",
      },
      {
        text: "Hold the line — reversing course now would signal indecision to the team.",
        tier: "developing",
        consequence:
          "You protect your pride over the business, and the team quietly notes that you won't change course.",
      },
      {
        text: "Review the numbers openly with your staff, gather their read on why it's missing, and adjust.",
        tier: "strong",
        consequence:
          "Naming the miss openly builds trust, and the fixes help. You separate ego from progress.",
      },
    ],
  ),

  // C3 — Courage to Commit: make a decision and move forward, even when unsure.
  "C3-BEG-13": scene(
    "A food truck owner",
    "A food truck wants to park outside on weekends. It could bring in traffic, or it could steal your lunch sales. They need an answer tomorrow, and you don't have full information. What do you do?",
    [
      {
        text: "Say yes, but structure it — you sell drinks, they sell food, and you split a combo deal.",
        tier: "advanced",
        consequence:
          "You turn a possible threat into a partner — their crowd becomes your customers.",
      },
      {
        text: "Decline — it's too risky to commit without knowing the impact.",
        tier: "developing",
        consequence:
          "You dodge the risk, but also the upside. The truck parks by a rival instead and pulls the crowd there.",
      },
      {
        text: "Say yes to a one-month trial with a set check-in date, so you can exit if it's not working.",
        tier: "strong",
        consequence: "The trial gives you real data with a safe way out. A low-risk way to move.",
      },
    ],
  ),
  "C3-BEG-14": scene(
    "Your supplier",
    "A supplier offers 30% off if you place a large bulk order today. The savings are big, but it would use most of your spare cash, and next quarter's demand is uncertain. What do you do?",
    [
      {
        text: "Pass — tying up that much cash on a guess is too dangerous.",
        tier: "developing",
        consequence:
          "You stay safe, but keep paying full price while a rival takes the discount and undercuts you.",
      },
      {
        text: "Stress-test your worst-case cash position. If you'd survive it, take the full deal and lock in the savings.",
        tier: "advanced",
        consequence:
          "You commit knowing you'd survive the worst case — the calculated bet pays off.",
      },
      {
        text: "Negotiate a smaller order now with the option to buy more later — capture part of the discount at lower risk.",
        tier: "strong",
        consequence: "You get real savings without betting the whole business. Balanced.",
      },
    ],
  ),

  // C4 — Financial Discipline: spend money wisely and protect your cash.
  "C4-MED-13": scene(
    "Your cash box, after a great month",
    "You just had a great sales month and have extra cash. You're tempted to reinvest it. What do you do?",
    [
      {
        text: "Buy the upgraded espresso machine — you earned it, and it'll impress people.",
        tier: "developing",
        consequence:
          "The machine is nice, but the money's gone and it barely changes sales. You spent on a want, not a need.",
      },
      {
        text: "Put most of it aside as a cushion, and spend a little on what customers actually asked for.",
        tier: "strong",
        consequence: "You stay safe and still improve one thing customers care about. Disciplined.",
      },
      {
        text: "Back the single spend that brings the most repeat customers back.",
        tier: "advanced",
        consequence:
          "You put the cash where it drives loyalty, and the repeat business pays you back.",
      },
    ],
  ),
  "C4-MED-14": scene(
    "Your books, after a strong quarter",
    "You had a strong month, but it looks seasonal, and a slower stretch is coming. You have surplus cash and several ways to use it. What do you do?",
    [
      {
        text: "Reinvest the surplus into expansion now, while momentum is high.",
        tier: "developing",
        consequence:
          "You mistake a seasonal high for permanent growth. The slow months arrive and you're overextended.",
      },
      {
        text: "Set aside enough to cover the projected slow season, then put the rest into the highest-return option.",
        tier: "strong",
        consequence: "You cover the downside first, then invest what's left wisely. Disciplined.",
      },
      {
        text: "Treat the spike as seasonal. Protect your cash first, and invest only money that could survive a slow off-season.",
        tier: "advanced",
        consequence:
          "You treat numbers as information — you protect the business and invest only what you can afford to lose.",
      },
    ],
  ),

  // C5 — Strategic Thinking: make choices with the long-term in mind.
  "C5-BEG-13": scene(
    "A delivery app rep",
    "A delivery app offers to list your café. It means more orders, but they take a big cut of each one. What do you do?",
    [
      {
        text: "Do the math on their cut first, then raise your delivery prices slightly to protect your profit.",
        tier: "strong",
        consequence: "You keep your profit intact while gaining reach. Thoughtful.",
      },
      {
        text: "Sign up — more orders is more orders.",
        tier: "developing",
        consequence: "Orders rise, but the fees eat the profit — you're busier and poorer.",
      },
      {
        text: "Use the app to get discovered, then invite those customers to order directly from you next time.",
        tier: "advanced",
        consequence:
          "The app becomes a way to find new customers that you then convert to direct orders. The longer game.",
      },
    ],
  ),
  "C5-BEG-14": scene(
    "The delivery app, mid-renewal",
    "The delivery app that now drives 40% of your orders just raised its commission. Dropping it loses that volume overnight, but staying shrinks your profit. Today's call shapes the next two years. What do you do?",
    [
      {
        text: "Absorb the higher fee — you can't afford to lose 40% of your orders.",
        tier: "developing",
        consequence:
          "You stay dependent, and next year they raise the fee again — and you have no leverage.",
      },
      {
        text: "Renegotiate or raise your app-only prices, while nudging repeat customers toward ordering directly.",
        tier: "strong",
        consequence:
          "Your profit is protected now, and your reliance on them starts to drop. Solid.",
      },
      {
        text: "Build your own direct-order channel and loyalty base, so no single platform controls your revenue.",
        tier: "advanced",
        consequence:
          "You fix the root risk — depending on one platform — and build lasting independence.",
      },
    ],
  ),

  // C6 — Power & Influence: protect your value and negotiate with confidence.
  "C6-BEG-13": scene(
    "A local office manager",
    "A local office wants weekly coffee for their meetings, but asks for 40% off your bulk price. What do you do?",
    [
      {
        text: "Ask what they actually need first, then design a package that serves them at a price that still protects you.",
        tier: "advanced",
        consequence:
          "You learn they need reliability, not the lowest price — so you charge fairly and become their go-to.",
      },
      {
        text: "Give the discount — a steady bulk order is worth it.",
        tier: "developing",
        consequence:
          'You win the order but barely break even — the "big order" makes very little money.',
      },
      {
        text: "Offer a smaller discount tied to a minimum order and an upfront commitment.",
        tier: "strong",
        consequence: "Your profit is protected and the client is landed. A fair trade.",
      },
    ],
  ),
  "C6-BEG-14": scene(
    "Your corporate client",
    "A corporate client with steady revenue is pushing for terms that leave you barely breaking even, and hints they'll walk to a rival. Losing them would hurt, but a low-profit contract would tie you up for a year. What do you do?",
    [
      {
        text: "Meet their terms — steady revenue is worth the thin profit.",
        tier: "developing",
        consequence:
          "You take the deal out of fear, and a year of near-zero-profit work ties up your capacity.",
      },
      {
        text: "Hold your core price, but flex on non-price terms like delivery or packaging, and let them choose.",
        tier: "strong",
        consequence:
          "Your price is protected, and you give on things that cost you little. They stay, profitably.",
      },
      {
        text: "Find out what they actually value, reframe the deal around it, and be genuinely ready to walk away.",
        tier: "advanced",
        consequence:
          "You learn reliability matters more to them than price — you close a fair deal, and your readiness to walk earns their respect.",
      },
    ],
  ),

  // C7 — People Management: build trust and take care of your team.
  "C7-BEG-13": scene(
    "Your best barista",
    "Your best barista is showing up late and seems down, and it's starting to affect the team. What do you do?",
    [
      {
        text: "Talk privately first to understand what's going on, then agree on a fix together.",
        tier: "strong",
        consequence:
          "You learn it's a family issue, and a small schedule tweak brings them back to full strength.",
      },
      {
        text: "Give a clear warning — lateness can't slide, or others will copy it.",
        tier: "developing",
        consequence:
          "They comply but pull away, and soon your best barista is quietly job-hunting.",
      },
      {
        text: "Check in with care, address both the behavior and its cause, and adjust support without dropping the standard.",
        tier: "advanced",
        consequence:
          "You keep both the standard and the person — they stay loyal, and the team sees how you lead under stress.",
      },
    ],
  ),
  "C7-BEG-14": scene(
    "Your team, frustrated",
    "A high-performing but difficult staff member is causing tension. The team is frustrated, but this person drives real sales. Cracking down risks losing them; ignoring it risks losing everyone else. What do you do?",
    [
      {
        text: "Prioritize the top performer — results matter most, and the team will adjust.",
        tier: "developing",
        consequence:
          "Sales hold briefly, then two good staff quit and the culture erodes. A short-term win, a long-term loss.",
      },
      {
        text: "Address the behavior directly with them, while protecting morale through open conversation.",
        tier: "strong",
        consequence:
          "The direct conversation resets the behavior, and the team sees that you'll act. Balanced.",
      },
      {
        text: "Set clear standards that apply to everyone, coach the performer, and protect the team's trust even at the risk of losing them.",
        tier: "advanced",
        consequence:
          "You build a fair system that outlasts any one person — the performer adapts or leaves, and the team trusts you.",
      },
    ],
  ),

  // C8 — Value Creation & Credibility: build lasting value over quick wins.
  "C8-BEG-13": scene(
    "Your bean supplier",
    "A supplier offers cheaper beans that aren't as good. Probably no one notices at first, and your profit jumps. What do you do?",
    [
      {
        text: "Keep your quality and tell customers why you source good beans — make that standard part of your brand.",
        tier: "advanced",
        consequence:
          "Your quality story becomes a reason people choose you — credibility turns into free marketing.",
      },
      {
        text: "Switch to the cheaper beans — more profit, and customers probably won't notice.",
        tier: "developing",
        consequence:
          "Profit rises for a month, then regulars notice the drop and drift away. You traded trust for pennies.",
      },
      {
        text: "Stick with the quality your customers trust, even at a lower margin.",
        tier: "strong",
        consequence: "You hold the line, and your reputation stays intact. Reliable.",
      },
    ],
  ),
  "C8-BEG-14": scene(
    "This quarter's numbers",
    "You could make a quiet quality cut that would help this quarter's numbers, and likely no one would notice right away. What do you do?",
    [
      {
        text: "Make the quiet cut — the numbers need it, and no one will notice right now.",
        tier: "developing",
        consequence:
          "The quarter looks better, but a year later the eroded quality shows up as customers leaving for reasons you can't explain. A short-term gain, a long-term cost.",
      },
      {
        text: "Protect quality and find the savings elsewhere, even if it's harder.",
        tier: "strong",
        consequence: "You hold your standard and find the savings the hard way. Credible.",
      },
      {
        text: "Refuse the compromise, and turn your standards into visible value — build a reputation that outlasts any single quarter.",
        tier: "advanced",
        consequence:
          "You make your integrity a competitive asset — customers and staff trust you, and that reputation grows while rivals chase quarterly numbers.",
      },
    ],
  ),

  // C9 — Perseverance & Adaptability: stay committed through setbacks while adapting smartly.
  "C9-BEG-13": scene(
    "The café across the street",
    "A new café opened right across the street, and some of your regulars are trying it out. Your sales dipped this week. What do you do?",
    [
      {
        text: "Quickly drop your prices to win the regulars back fast.",
        tier: "developing",
        consequence: "A price war starts. You both lose money, and you look desperate.",
      },
      {
        text: "Stay calm, ask your regulars what they love about you, and lean harder into that.",
        tier: "strong",
        consequence:
          "You double down on your community feel, and the regulars come back for what the new place can't copy.",
      },
      {
        text: "Treat it as a signal — study what the new café does well, sharpen what makes you different, and win on your strengths.",
        tier: "advanced",
        consequence:
          "You learn from the competitor and sharpen your own edge — you come out stronger than before they arrived.",
      },
    ],
  ),
  "C9-BEG-14": scene(
    "Three hard weeks running",
    "A well-funded competitor opened nearby, and your revenue has dropped for three straight weeks. Staff are nervous, cash is tightening, and you feel pressure to make a drastic move. This is your third hard stretch this year. What do you do?",
    [
      {
        text: "Make a bold, fast pivot to counter them before you lose more.",
        tier: "developing",
        consequence:
          "The rushed pivot confuses customers and rattles the staff even more. Reacting from fear made it worse.",
      },
      {
        text: "Steady the team, figure out what's actually driving the drop, and adjust tactics without abandoning your direction.",
        tier: "strong",
        consequence: "You stabilize, find the real cause, and adjust with a clear head. Resilient.",
      },
      {
        text: "Absorb the shock calmly, separate what to hold onto from what to change, and use the pressure to strengthen both your model and your leadership.",
        tier: "advanced",
        consequence:
          "You hold the vision, adjust the tactics, and protect team morale through the storm — you come out stronger for the pressure.",
      },
    ],
  ),
};
