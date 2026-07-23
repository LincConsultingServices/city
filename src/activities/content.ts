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

export type ActivityContent = SimContent | McqContent;

export const ACTIVITY_CONTENT: Record<string, ActivityContent> = {
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
