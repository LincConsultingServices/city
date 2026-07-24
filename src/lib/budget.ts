// Budget-allocation math (PRD §8.1, §12.2) — pure and testable. Backs the two C4
// budget activities, whose rubrics check DIFFERENT metric names for the same idea:
//   C4-BEG-07 "The Pocket-Money Month" → needsCovered + savings (>= 50 for 3/3)
//   C4-BEG-08 "Build the Party Budget" → essentialsCovered + totalCost (<= 500)
// Emitting the superset lets one renderer satisfy both.

export interface BudgetItemLike {
  key: string;
  cost: number;
  /** Must be chosen for needs/essentials to count as covered. */
  essential?: boolean;
}

export interface BudgetSummary {
  values: {
    totalCost: number;
    /** Money left over. Clamped at 0 — you can't save a negative amount, and the
     *  C4-BEG-07 rubric bounds savings at min 0. */
    savings: number;
    needsCovered: boolean;
    /** Same condition as needsCovered; C4-BEG-08's rubric uses this name. */
    essentialsCovered: boolean;
    overBudget: boolean;
    itemsChosen: number;
  };
  decisionLog: Array<{ key: string; cost: number; essential: boolean }>;
}

/** Roll a selection up into the `metrics` payload the server scores. */
export function summarizeBudget(
  budget: number,
  items: BudgetItemLike[],
  selected: string[],
): BudgetSummary {
  const picked = new Set(selected);
  const chosen = items.filter((i) => picked.has(i.key));
  const totalCost = chosen.reduce((s, i) => s + i.cost, 0);
  const covered = items.every((i) => !i.essential || picked.has(i.key));
  return {
    values: {
      totalCost,
      savings: Math.max(0, budget - totalCost),
      needsCovered: covered,
      essentialsCovered: covered,
      overBudget: totalCost > budget,
      itemsChosen: chosen.length,
    },
    decisionLog: chosen.map((i) => ({
      key: i.key,
      cost: i.cost,
      essential: Boolean(i.essential),
    })),
  };
}
