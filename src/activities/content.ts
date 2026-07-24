// Client-side rich content, keyed by registry activity id (PRD §8.2): the backend
// serves scoring metadata only — question text and sim tuning live here.
//
// CRITICAL: item keys, option values and zone ids below must match the server's
// hidden answer/order keys (read from the backend registry pack). A mismatch
// silently scores 1/3 no matter how well the player does. content.test.ts guards
// the structure; src/lib/budget.test.ts checks the budget activities are winnable.
import type { SimContent } from "@/lib/sim";

// MCQ_FEEDBACK → objective. The real C4 activities carry eight questions each.
// `id` is the server itemId (q1..q8) and `value` the server choice ("a".."d") —
// both must match the rubric's hidden answer key for scoring to work.
export interface McqContent {
  kind: "mcq";
  prompt?: string;
  questions: {
    id: string;
    text: string;
    options: { value: string; label: string }[];
  }[];
}

// DRAG_MATCH → objective. Items are tapped into zones; item `key` and zone `id`
// must match the server's hidden answer keys so submissions score correctly.
export interface DragMatchContent {
  kind: "drag_match";
  prompt: string;
  zones: { id: string; label: string }[];
  items: { key: string; label: string; emoji?: string }[];
}

// SORT_ORDER → order. The user arranges items; `key` matches the server order-key.
export interface SortOrderContent {
  kind: "sort_order";
  prompt: string;
  items: { key: string; label: string; emoji?: string }[];
}

// Budget allocation → metrics. `essential` drives needsCovered/essentialsCovered
// and is never surfaced in the UI — spotting the essentials is the exercise.
export interface BudgetContent {
  kind: "budget";
  intro: string;
  currency: string;
  budget: number;
  goalHint?: string;
  items: { key: string; label: string; cost: number; essential?: boolean; emoji?: string }[];
}

export type ActivityContent =
  SimContent | McqContent | DragMatchContent | SortOrderContent | BudgetContent;

export const ACTIVITY_CONTENT: Record<string, ActivityContent> = {
  // C4-BEG-01 — "Needs vs Wants" (DRAG_MATCH → objective).
  "C4-BEG-01": {
    kind: "drag_match",
    prompt: "Sort each thing into Needs (you must have it) or Wants (nice to have).",
    zones: [
      { id: "needs", label: "Need" },
      { id: "wants", label: "Want" },
    ],
    items: [
      { key: "lunch", label: "Lunch at school", emoji: "🍱" },
      { key: "notebook", label: "A notebook for class", emoji: "📓" },
      { key: "busfare", label: "Bus fare to get home", emoji: "🚌" },
      { key: "repair", label: "Fixing your broken shoe", emoji: "🥾" },
      { key: "water", label: "Drinking water", emoji: "💧" },
      { key: "game", label: "The new video game", emoji: "🎮" },
      { key: "stickers", label: "A pack of stickers", emoji: "✨" },
      { key: "candy", label: "Candy at the counter", emoji: "🍬" },
      { key: "cap", label: "A branded cap", emoji: "🧢" },
      { key: "movie", label: "A movie ticket", emoji: "🎟️" },
    ],
  },
  // C4-BEG-04 — "Price Tag Match" (DRAG_MATCH → objective). Match each item to its
  // fair price. Many zones → the renderer switches to a select.
  "C4-BEG-04": {
    kind: "drag_match",
    prompt: "What's a fair price for each item? Match it to the right price tag.",
    zones: [
      { id: "p10", label: "₹10" },
      { id: "p15", label: "₹15" },
      { id: "p20", label: "₹20" },
      { id: "p25", label: "₹25" },
      { id: "p40", label: "₹40" },
      { id: "p60", label: "₹60" },
      { id: "p80", label: "₹80" },
      { id: "p120", label: "₹120" },
    ],
    items: [
      { key: "lemonade", label: "A cup of lemonade", emoji: "🥤" },
      { key: "cookie", label: "A home-baked cookie", emoji: "🍪" },
      { key: "bookmark", label: "A hand-made bookmark", emoji: "🔖" },
      { key: "card", label: "A greeting card", emoji: "💌" },
      { key: "keychain", label: "A beaded keychain", emoji: "🔑" },
      { key: "frame", label: "A decorated photo frame", emoji: "🖼️" },
      { key: "plant", label: "A potted plant", emoji: "🪴" },
      { key: "tote", label: "A painted tote bag", emoji: "👜" },
    ],
  },
  // C4-BEG-05 — "Money In, Money Out" (SORT_ORDER → order). Presented scrambled;
  // the server holds the correct sequence.
  "C4-BEG-05": {
    kind: "sort_order",
    prompt: "Put a stand-owner's money day in order, from first to last.",
    items: [
      { key: "fair_sales", label: "Sell to customers all afternoon", emoji: "🧺" },
      { key: "pocket_money", label: "Start with your pocket money", emoji: "👛" },
      { key: "count_profit", label: "Count what's left as profit", emoji: "✅" },
      { key: "buy_stock", label: "Buy the stock for the day", emoji: "🛒" },
      { key: "pay_helper", label: "Pay your helper", emoji: "🤝" },
      { key: "till_low", label: "Notice the till running low", emoji: "📉" },
    ],
  },
  // C4-BEG-12 — "Payback Race" (SORT_ORDER → order). Which purchase pays itself
  // back fastest? Presented scrambled.
  "C4-BEG-12": {
    kind: "sort_order",
    prompt: "Order these buys from the one that pays itself back fastest to the slowest.",
    items: [
      { key: "speaker", label: "A bluetooth speaker for the stall", emoji: "🔊" },
      { key: "lemon_squeezer", label: "A lemon squeezer", emoji: "🍋" },
      { key: "fancy_apron", label: "A fancy embroidered apron", emoji: "🎽" },
      { key: "cookie_cutter", label: "A cookie cutter set", emoji: "🍪" },
      { key: "fairy_lights", label: "Fairy lights for the stall", emoji: "💡" },
      { key: "poster_paint", label: "Paint for a bigger sign", emoji: "🎨" },
    ],
  },
  // C4-BEG-02 — "Can Sam Afford This?" (MCQ_FEEDBACK → objective, budgeting).
  "C4-BEG-02": {
    kind: "mcq",
    prompt: "Sam is learning to plan his money. Help him decide.",
    questions: [
      {
        id: "q1",
        text: "Sam gets ₹200 pocket money. The game he wants costs ₹250. What's the smart move?",
        options: [
          { value: "a", label: "Buy it now and owe the shop ₹50" },
          { value: "b", label: "Wait and save until he has ₹250" },
          { value: "c", label: "Borrow ₹50 and forget about paying it back" },
          { value: "d", label: "Give up on the game forever" },
        ],
      },
      {
        id: "q2",
        text: "Sam has ₹200. Bus fare for the week is ₹60. How much is left for everything else?",
        options: [
          { value: "a", label: "₹140" },
          { value: "b", label: "₹260" },
          { value: "c", label: "₹60" },
          { value: "d", label: "₹200" },
        ],
      },
      {
        id: "q3",
        text: "Sam planned ₹100 food, ₹60 bus, ₹40 fun. Food actually cost ₹120. What must he do?",
        options: [
          { value: "a", label: "Nothing — a budget fixes itself" },
          { value: "b", label: "Spend even more on fun to feel better" },
          { value: "c", label: "Take the extra ₹20 out of fun or bus" },
          { value: "d", label: "Ignore the budget from now on" },
        ],
      },
      {
        id: "q4",
        text: "What goes into a budget FIRST?",
        options: [
          { value: "a", label: "Treats and snacks" },
          { value: "b", label: "The things you must pay for" },
          { value: "c", label: "Saving up for a phone" },
          { value: "d", label: "Games" },
        ],
      },
      {
        id: "q5",
        text: "Sam gets ₹300 a month and spends exactly ₹300. How much does he save?",
        options: [
          { value: "a", label: "₹300" },
          { value: "b", label: "₹150" },
          { value: "c", label: "₹30" },
          { value: "d", label: "Nothing" },
        ],
      },
      {
        id: "q6",
        text: "A budget is best described as…",
        options: [
          { value: "a", label: "A plan for money coming in and going out" },
          { value: "b", label: "A list of things you want" },
          { value: "c", label: "A kind of bank account" },
          { value: "d", label: "A way to borrow money" },
        ],
      },
      {
        id: "q7",
        text: "Sam wants a ₹600 cycle and can save ₹50 a week. How many weeks?",
        options: [
          { value: "a", label: "6 weeks" },
          { value: "b", label: "10 weeks" },
          { value: "c", label: "12 weeks" },
          { value: "d", label: "30 weeks" },
        ],
      },
      {
        id: "q8",
        text: "A friend wants Sam to spend his bus money on snacks. The disciplined choice is…",
        options: [
          { value: "a", label: "Spend it — he can walk home" },
          { value: "b", label: "Keep it; that money is already promised to the bus" },
          { value: "c", label: "Borrow from someone else for snacks" },
          { value: "d", label: "Spend half of it" },
        ],
      },
    ],
  },
  // C4-BEG-03 — "Did the Stand Make Money?" (MCQ_FEEDBACK → objective, profit_loss).
  "C4-BEG-03": {
    kind: "mcq",
    prompt: "Work out whether the stand actually made money.",
    questions: [
      {
        id: "q1",
        text: "The stand took ₹500 in sales and spent ₹300 on supplies. What's the profit?",
        options: [
          { value: "a", label: "₹200" },
          { value: "b", label: "₹800" },
          { value: "c", label: "₹500" },
          { value: "d", label: "₹300" },
        ],
      },
      {
        id: "q2",
        text: "Profit means…",
        options: [
          { value: "a", label: "All the money customers handed over" },
          { value: "b", label: "The money spent on supplies" },
          { value: "c", label: "What's left after the costs are paid" },
          { value: "d", label: "The cash in the till at the start" },
        ],
      },
      {
        id: "q3",
        text: "Sales were ₹400 and costs were ₹450. What happened?",
        options: [
          { value: "a", label: "A ₹50 profit" },
          { value: "b", label: "A ₹50 loss" },
          { value: "c", label: "Broke even" },
          { value: "d", label: "An ₹850 profit" },
        ],
      },
      {
        id: "q4",
        text: "“Revenue” is…",
        options: [
          { value: "a", label: "What's left after costs" },
          { value: "b", label: "All the money taken from sales" },
          { value: "c", label: "The cost of the supplies" },
          { value: "d", label: "Money you borrowed" },
        ],
      },
      {
        id: "q5",
        text: "You sold 20 cups at ₹25 each. The cups and lemons cost ₹200 in total. Profit?",
        options: [
          { value: "a", label: "₹300" },
          { value: "b", label: "₹500" },
          { value: "c", label: "₹200" },
          { value: "d", label: "₹700" },
        ],
      },
      {
        id: "q6",
        text: "Stock you bought but didn't sell today is…",
        options: [
          { value: "a", label: "Free money" },
          { value: "b", label: "Profit" },
          { value: "c", label: "Revenue" },
          { value: "d", label: "Money already spent that hasn't come back" },
        ],
      },
      {
        id: "q7",
        text: "“Breaking even” means…",
        options: [
          { value: "a", label: "You made a big profit" },
          { value: "b", label: "Money in equals money out" },
          { value: "c", label: "You lost everything" },
          { value: "d", label: "You sold out" },
        ],
      },
      {
        id: "q8",
        text: "Your stand made a loss. Which move could turn it around?",
        options: [
          { value: "a", label: "Buy even more stock you can't sell" },
          { value: "b", label: "Drop the price below what it costs you" },
          { value: "c", label: "Cut your costs or sell more cups" },
          { value: "d", label: "Stop counting the money" },
        ],
      },
    ],
  },
  // C4-BEG-06 — "The Better Buy" (MCQ_FEEDBACK → objective, roi).
  "C4-BEG-06": {
    kind: "mcq",
    prompt: "Which spend gives you more back? That's return on investment.",
    questions: [
      {
        id: "q1",
        text: "₹100 on a squeezer that earns ₹40 extra a week, or ₹100 on a poster that earns ₹5 a week?",
        options: [
          { value: "a", label: "The poster" },
          { value: "b", label: "The squeezer" },
          { value: "c", label: "Neither is worth it" },
          { value: "d", label: "They're exactly the same" },
        ],
      },
      {
        id: "q2",
        text: "“Return on investment” means…",
        options: [
          { value: "a", label: "The money you spend" },
          { value: "b", label: "What you get back compared with what you put in" },
          { value: "c", label: "The price on the tag" },
          { value: "d", label: "Money you borrowed" },
        ],
      },
      {
        id: "q3",
        text: "A ₹200 tool earns you ₹50 extra a week. How long until it pays for itself?",
        options: [
          { value: "a", label: "4 weeks" },
          { value: "b", label: "2 weeks" },
          { value: "c", label: "10 weeks" },
          { value: "d", label: "200 weeks" },
        ],
      },
      {
        id: "q4",
        text: "“The cheaper thing is always the better buy.”",
        options: [
          { value: "a", label: "True, always" },
          { value: "b", label: "True if you like it more" },
          { value: "c", label: "False — what matters is what it gives back" },
          { value: "d", label: "True if a friend has one" },
        ],
      },
      {
        id: "q5",
        text: "₹500 on an oven earning ₹100 a week, or ₹500 on a sign earning ₹20 a week?",
        options: [
          { value: "a", label: "The oven" },
          { value: "b", label: "The sign" },
          { value: "c", label: "Neither" },
          { value: "d", label: "Toss a coin" },
        ],
      },
      {
        id: "q6",
        text: "Something you buy that never earns anything back is…",
        options: [
          { value: "a", label: "An investment" },
          { value: "b", label: "A great return" },
          { value: "c", label: "Free" },
          { value: "d", label: "A cost, not an investment" },
        ],
      },
      {
        id: "q7",
        text: "Two tools cost the same. One lasts two years, one lasts two months. Better buy?",
        options: [
          { value: "a", label: "The one that lasts two years" },
          { value: "b", label: "The one that lasts two months" },
          { value: "c", label: "Exactly the same" },
          { value: "d", label: "Whichever looks nicer" },
        ],
      },
      {
        id: "q8",
        text: "Before a big buy for your stand, the best question is…",
        options: [
          { value: "a", label: "Is it the prettiest one?" },
          { value: "b", label: "Do my friends have one?" },
          { value: "c", label: "How much extra will this earn me?" },
          { value: "d", label: "Is it the most expensive?" },
        ],
      },
    ],
  },
  // C4-BEG-10 — "Too High, Too Low, Just Right" (MCQ_FEEDBACK → objective, pricing).
  "C4-BEG-10": {
    kind: "mcq",
    prompt: "Find the price that covers your costs and still gets people buying.",
    questions: [
      {
        id: "q1",
        text: "A cup costs you ₹10 to make and you sell it for ₹8. What happens?",
        options: [
          { value: "a", label: "A small profit" },
          { value: "b", label: "You break even" },
          { value: "c", label: "You lose ₹2 on every cup" },
          { value: "d", label: "A big profit" },
        ],
      },
      {
        id: "q2",
        text: "Pricing far above everyone else usually means…",
        options: [
          { value: "a", label: "Fewer people buy" },
          { value: "b", label: "More people buy" },
          { value: "c", label: "Nothing changes" },
          { value: "d", label: "Your costs go down" },
        ],
      },
      {
        id: "q3",
        text: "A cup costs ₹10 to make. Which price makes a fair profit?",
        options: [
          { value: "a", label: "₹8" },
          { value: "b", label: "₹15" },
          { value: "c", label: "₹10" },
          { value: "d", label: "₹5" },
        ],
      },
      {
        id: "q4",
        text: "You sell out in ten minutes every single day. That's a sign you could…",
        options: [
          { value: "a", label: "Lower the price" },
          { value: "b", label: "Raise the price a little" },
          { value: "c", label: "Close the stand" },
          { value: "d", label: "Give them away free" },
        ],
      },
      {
        id: "q5",
        text: "Nobody has bought all day. What's the first thing to check?",
        options: [
          { value: "a", label: "Buy a lot more stock" },
          { value: "b", label: "Raise the price" },
          { value: "c", label: "Whether the price is too high" },
          { value: "d", label: "Close down for good" },
        ],
      },
      {
        id: "q6",
        text: "Your price should always be…",
        options: [
          { value: "a", label: "Above what it costs you to make" },
          { value: "b", label: "Below cost, to pull people in" },
          { value: "c", label: "Exactly what it costs you" },
          { value: "d", label: "A different number every day" },
        ],
      },
      {
        id: "q7",
        text: "A “just right” price is one that…",
        options: [
          { value: "a", label: "Is the cheapest possible" },
          { value: "b", label: "Is the most expensive possible" },
          { value: "c", label: "Is the same as last year" },
          { value: "d", label: "Covers your costs and people still buy" },
        ],
      },
      {
        id: "q8",
        text: "The stall next door sells at ₹20. Yours costs ₹12 to make. A sensible price is…",
        options: [
          { value: "a", label: "₹10" },
          { value: "b", label: "Around ₹18–22" },
          { value: "c", label: "₹50" },
          { value: "d", label: "₹12" },
        ],
      },
    ],
  },
  // C4-BEG-07 — "The Pocket-Money Month" (metrics: needsCovered + savings ≥ 50).
  // Needs total ₹170 of ₹300, so covering them leaves ₹130 — enough to save ₹50
  // AND add a want or two, but not the ₹120 game plus everything else.
  "C4-BEG-07": {
    kind: "budget",
    intro:
      "Here's your pocket money for the whole month. Cover what you actually need first, then decide what's worth it — and try to still have something left over at the end.",
    currency: "₹",
    budget: 300,
    goalHint: "Cover your needs and try to keep at least ₹50 saved.",
    items: [
      {
        key: "lunch",
        label: "School lunches for the month",
        cost: 80,
        essential: true,
        emoji: "🍱",
      },
      {
        key: "buspass",
        label: "Bus pass to get to school",
        cost: 60,
        essential: true,
        emoji: "🚌",
      },
      { key: "notebook", label: "A notebook for class", cost: 30, essential: true, emoji: "📓" },
      { key: "movie", label: "A movie with friends", cost: 60, emoji: "🎟️" },
      { key: "game", label: "The new video game", cost: 120, emoji: "🎮" },
      { key: "snacks", label: "Snacks after school", cost: 40, emoji: "🍪" },
      { key: "stickers", label: "A pack of stickers", cost: 20, emoji: "✨" },
      { key: "cap", label: "A branded cap", cost: 70, emoji: "🧢" },
    ],
  },
  // C4-BEG-08 — "Build the Party Budget" (metrics: essentialsCovered + totalCost
  // ≤ 500). Essentials are ₹340, leaving ₹160 of headroom — the ₹400 magician
  // busts it, which is the point.
  "C4-BEG-08": {
    kind: "budget",
    intro:
      "You're throwing the party. Some things you simply can't skip; the rest is nice-to-have. Build a party that works and keep the total in check.",
    currency: "₹",
    budget: 500,
    goalHint: "Get the essentials in and keep the total at or under ₹500.",
    items: [
      { key: "cake", label: "The birthday cake", cost: 150, essential: true, emoji: "🎂" },
      { key: "cups", label: "Cups and plates", cost: 60, essential: true, emoji: "🥤" },
      { key: "juice", label: "Juice for everyone", cost: 90, essential: true, emoji: "🧃" },
      { key: "invites", label: "Invitations", cost: 40, essential: true, emoji: "💌" },
      { key: "balloons", label: "Balloons", cost: 50, emoji: "🎈" },
      { key: "streamers", label: "Streamers and banners", cost: 40, emoji: "🎊" },
      { key: "partybags", label: "Party bags for guests", cost: 120, emoji: "🎁" },
      { key: "speaker", label: "Speaker hire for music", cost: 150, emoji: "🔊" },
      { key: "backdrop", label: "A fancy photo backdrop", cost: 200, emoji: "🖼️" },
      { key: "magician", label: "A magician for an hour", cost: 400, emoji: "🎩" },
    ],
  },
  // C4-BEG-09 — "Three Days at the Lemonade Stand": learn profit = revenue − costs.
  "C4-BEG-09": {
    kind: "sim",
    intro:
      "Run your stand for three days. Each morning, set a price and buy stock — you can't sell what you didn't buy, and stock costs money whether it sells or not. Keep the cash growing.",
    currency: "₹",
    roundLabel: "Day",
    rounds: 3,
    startingCash: 200,
    unitCost: 10,
    price: { min: 10, max: 50, step: 5, default: 25 },
    stock: { min: 0, max: 30, step: 1, default: 10 },
    demand: { basePrice: 25, baseDemand: 16, elasticity: 1.2 },
    weather: ["Warm and sunny", "Scorching hot — big crowds", "Cloudy, fewer people out"],
    goal: "Finish with more cash than you started (₹200).",
  },
  // C4-BEG-11 — "The Empty Till": discipline on a tight budget; don't go bust.
  "C4-BEG-11": {
    kind: "sim",
    intro:
      "The till is nearly empty — just ₹80. Stock is pricier today. Buy only what you can realistically sell, keep a buffer, and rebuild the till over three days without going broke.",
    currency: "₹",
    roundLabel: "Day",
    rounds: 3,
    startingCash: 80,
    unitCost: 12,
    price: { min: 15, max: 60, step: 5, default: 30 },
    stock: { min: 0, max: 20, step: 1, default: 5 },
    demand: { basePrice: 30, baseDemand: 12, elasticity: 1.1 },
    weather: ["Slow morning", "A steady trickle", "Busy afternoon rush"],
    goal: "Stay solvent all three days and grow the till.",
  },
};
