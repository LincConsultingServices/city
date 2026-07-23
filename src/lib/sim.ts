// MINI_SIM math (PRD §8.1) — a small stand-running sim: each round the player sets
// a price and buys stock; demand falls as price rises; cash carries over. Pure and
// seedable so it's unit-tested and (later) server-replayable. The renderer drives
// rounds; these functions compute outcomes. Result kind submitted = `metrics`.

export interface SimContent {
  kind: "sim";
  intro: string;
  currency: string; // e.g. "₹"
  roundLabel: string; // e.g. "Day"
  rounds: number;
  startingCash: number;
  unitCost: number; // cost to buy one unit of stock
  price: { min: number; max: number; step: number; default: number };
  stock: { min: number; max: number; step: number; default: number };
  demand: { basePrice: number; baseDemand: number; elasticity: number };
  weather: string[]; // flavor per round (cycled)
  goal?: string;
}

export interface RoundDecision {
  price: number;
  stock: number;
}

export interface RoundOutcome {
  round: number;
  price: number;
  stock: number; // actually bought (clamped to cash)
  weatherMultiplier: number;
  demand: number;
  sales: number;
  revenue: number;
  cost: number;
  profit: number;
  cashAfter: number;
}

/** Max stock the player can afford this round (can't buy more than cash allows). */
export function affordableStock(content: SimContent, cashBefore: number): number {
  return Math.max(0, Math.floor(cashBefore / content.unitCost));
}

/** Compute one round's outcome. Pure — the weather multiplier is passed in (seeded). */
export function computeRound(
  content: SimContent,
  round: number,
  decision: RoundDecision,
  cashBefore: number,
  weatherMultiplier: number,
): RoundOutcome {
  const stock = Math.max(0, Math.min(decision.stock, affordableStock(content, cashBefore)));
  const price = Math.max(1, decision.price);
  const rawDemand =
    content.demand.baseDemand *
    Math.pow(content.demand.basePrice / price, content.demand.elasticity) *
    weatherMultiplier;
  const demand = Math.max(0, Math.round(rawDemand));
  const sales = Math.min(demand, stock);
  const revenue = sales * price;
  const cost = stock * content.unitCost;
  const profit = revenue - cost;
  return {
    round,
    price,
    stock,
    weatherMultiplier,
    demand,
    sales,
    revenue,
    cost,
    profit,
    cashAfter: cashBefore - cost + revenue,
  };
}

export interface SimSummary {
  values: {
    finalCash: number;
    profit: number;
    roundsPlayed: number;
    unitsSold: number;
    revenue: number;
    wentBankrupt: boolean;
  };
  decisionLog: Array<{
    round: number;
    price: number;
    stock: number;
    sales: number;
    cashAfter: number;
  }>;
}

/** Roll the finished rounds up into the `metrics` payload the server scores. */
export function summarize(content: SimContent, outcomes: RoundOutcome[]): SimSummary {
  const finalCash = outcomes.length ? outcomes[outcomes.length - 1].cashAfter : content.startingCash;
  const unitsSold = outcomes.reduce((s, o) => s + o.sales, 0);
  const revenue = outcomes.reduce((s, o) => s + o.revenue, 0);
  return {
    values: {
      finalCash,
      profit: finalCash - content.startingCash,
      roundsPlayed: outcomes.length,
      unitsSold,
      revenue,
      wentBankrupt: finalCash <= 0,
    },
    decisionLog: outcomes.map((o) => ({
      round: o.round,
      price: o.price,
      stock: o.stock,
      sales: o.sales,
      cashAfter: o.cashAfter,
    })),
  };
}
