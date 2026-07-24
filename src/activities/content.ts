// Client-side rich content, keyed by registry activity id (PRD §8.2): the backend
// serves scoring metadata only — sim tuning / question text lives here. The two
// Ice Cream Cart activities are MINI_SIM (result kind `metrics`); the MCQ type is
// retained for future objective activities.
import type { SimContent } from "@/lib/sim";

export interface McqContent {
  kind: "mcq";
  itemId: string;
  question: string;
  options: { id: string; label: string }[];
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

export type ActivityContent = SimContent | McqContent | DragMatchContent | SortOrderContent;

export const ACTIVITY_CONTENT: Record<string, ActivityContent> = {
  // C4-BEG-01 — "Needs vs Wants" (DRAG_MATCH → objective). Placeholder keys.
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
