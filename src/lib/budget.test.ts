import { describe, it, expect } from "vitest";
import { summarizeBudget } from "./budget";
import { ACTIVITY_CONTENT } from "@/activities/content";
import type { BudgetContent } from "@/activities/content";

const items = [
  { key: "need1", cost: 80, essential: true },
  { key: "need2", cost: 60, essential: true },
  { key: "want1", cost: 100 },
];

describe("budget math", () => {
  it("sums cost and leftover savings", () => {
    const s = summarizeBudget(300, items, ["need1", "need2"]);
    expect(s.values.totalCost).toBe(140);
    expect(s.values.savings).toBe(160);
    expect(s.values.itemsChosen).toBe(2);
  });

  it("covers needs only when every essential is chosen", () => {
    expect(summarizeBudget(300, items, ["need1"]).values.needsCovered).toBe(false);
    const both = summarizeBudget(300, items, ["need1", "need2"]).values;
    expect(both.needsCovered).toBe(true);
    // C4-BEG-08's rubric checks the same idea under a different name.
    expect(both.essentialsCovered).toBe(true);
  });

  it("clamps savings at 0 and flags overspending (rubric bounds savings >= 0)", () => {
    const s = summarizeBudget(100, items, ["need1", "need2", "want1"]);
    expect(s.values.totalCost).toBe(240);
    expect(s.values.savings).toBe(0);
    expect(s.values.overBudget).toBe(true);
  });
});

describe("authored budget activities are winnable", () => {
  const cases: Array<[string, { savingsAtLeast?: number; totalAtMost?: number }]> = [
    ["C4-BEG-07", { savingsAtLeast: 50 }], // rubric: needsCovered + savings >= 50
    ["C4-BEG-08", { totalAtMost: 500 }], // rubric: essentialsCovered + totalCost <= 500
  ];

  for (const [id, want] of cases) {
    it(`${id}: covering the essentials alone hits 3/3 thresholds`, () => {
      const c = ACTIVITY_CONTENT[id] as BudgetContent;
      expect(c.kind).toBe("budget");
      const essentials = c.items.filter((i) => i.essential).map((i) => i.key);
      expect(essentials.length, `${id} needs essentials`).toBeGreaterThan(0);
      const s = summarizeBudget(c.budget, c.items, essentials);
      expect(s.values.needsCovered).toBe(true);
      if (want.savingsAtLeast !== undefined) {
        expect(s.values.savings).toBeGreaterThanOrEqual(want.savingsAtLeast);
      }
      if (want.totalAtMost !== undefined) {
        expect(s.values.totalCost).toBeLessThanOrEqual(want.totalAtMost);
      }
      expect(s.values.overBudget).toBe(false);
    });
  }
});
