import { describe, it, expect } from 'vitest';
import { computeBudget } from '@/lib/budgetSim';

const needs = [
  { key: 'a', cost: 30 },
  { key: 'b', cost: 25 },
  { key: 'c', cost: 15 },
]; // 70 total
const wants = [
  { key: 'g', cost: 40 },
  { key: 't', cost: 20 },
];

describe('computeBudget', () => {
  it('nothing funded → needs not covered, savings = full budget', () => {
    const r = computeBudget(150, needs, wants, {});
    expect(r.spent).toBe(0);
    expect(r.savings).toBe(150);
    expect(r.needsCovered).toBe(false);
    expect(r.overBudget).toBe(false);
  });

  it('all needs funded → needsCovered, savings = budget − 70', () => {
    const r = computeBudget(150, needs, wants, { a: true, b: true, c: true });
    expect(r.needsCovered).toBe(true);
    expect(r.spent).toBe(70);
    expect(r.savings).toBe(80);
  });

  it('funding a want reduces savings', () => {
    const r = computeBudget(150, needs, wants, { a: true, b: true, c: true, g: true });
    expect(r.spent).toBe(110);
    expect(r.savings).toBe(40);
    expect(r.needsCovered).toBe(true);
  });

  it('overspending clamps savings to 0 and flags overBudget', () => {
    const r = computeBudget(60, needs, wants, { a: true, b: true, c: true }); // 70 > 60
    expect(r.overBudget).toBe(true);
    expect(r.savings).toBe(0);
  });
});
