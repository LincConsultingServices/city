// Pure, seedable budget-sim math (PRD §12.2 — T3 metrics tier). The client
// computes the summary metrics; the server bounds-checks and scores. Kept here so
// it is unit-tested and replayable.

export interface BudgetItem {
  key: string;
  cost: number;
}

export interface BudgetSummary {
  spent: number;
  savings: number; // clamped ≥ 0
  needsCovered: boolean;
  overBudget: boolean;
}

export function computeBudget(
  budget: number,
  needs: BudgetItem[],
  wants: BudgetItem[],
  funded: Record<string, boolean>,
): BudgetSummary {
  const all = [...needs, ...wants];
  const spent = all.filter((i) => funded[i.key]).reduce((sum, i) => sum + i.cost, 0);
  const remaining = budget - spent;
  return {
    spent,
    savings: Math.max(0, remaining),
    needsCovered: needs.every((n) => funded[n.key]),
    overBudget: remaining < 0,
  };
}
