import { describe, it, expect } from "vitest";
import { computeRound, summarize, affordableStock, type SimContent } from "./sim";
import { mulberry32, seedFromString } from "./rng";

const content: SimContent = {
  kind: "sim",
  intro: "",
  currency: "₹",
  roundLabel: "Day",
  rounds: 3,
  startingCash: 200,
  unitCost: 10,
  price: { min: 10, max: 50, step: 5, default: 25 },
  stock: { min: 0, max: 30, step: 1, default: 10 },
  demand: { basePrice: 25, baseDemand: 15, elasticity: 1.2 },
  weather: ["Sunny"],
};

describe("sim math", () => {
  it("caps stock to what cash can buy", () => {
    expect(affordableStock(content, 95)).toBe(9); // 95 / 10
    const o = computeRound(content, 1, { price: 25, stock: 30 }, 95, 1);
    expect(o.stock).toBe(9);
    expect(o.cost).toBe(90);
  });

  it("sells min(demand, stock) and carries cash over", () => {
    const o = computeRound(content, 1, { price: 25, stock: 10 }, 200, 1);
    expect(o.demand).toBe(15); // basePrice==price → baseDemand * 1 * 1
    expect(o.sales).toBe(10); // capped by stock
    expect(o.revenue).toBe(250);
    expect(o.cost).toBe(100);
    expect(o.cashAfter).toBe(350); // 200 - 100 + 250
  });

  it("higher price lowers demand (elasticity)", () => {
    const cheap = computeRound(content, 1, { price: 15, stock: 40 }, 1000, 1).demand;
    const dear = computeRound(content, 1, { price: 40, stock: 40 }, 1000, 1).demand;
    expect(cheap).toBeGreaterThan(dear);
  });

  it("summarize produces a metrics payload with profit + decisionLog", () => {
    const o1 = computeRound(content, 1, { price: 25, stock: 10 }, 200, 1);
    const o2 = computeRound(content, 2, { price: 25, stock: 10 }, o1.cashAfter, 1);
    const s = summarize(content, [o1, o2]);
    expect(s.values.roundsPlayed).toBe(2);
    expect(s.values.profit).toBe(o2.cashAfter - content.startingCash);
    expect(s.decisionLog).toHaveLength(2);
  });

  it("seeded RNG is deterministic for the same activity id", () => {
    const a = mulberry32(seedFromString("C4-BEG-09"));
    const b = mulberry32(seedFromString("C4-BEG-09"));
    expect(a()).toBe(b());
    expect(a()).toBe(b());
  });
});
