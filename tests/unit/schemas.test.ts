import { describe, it, expect } from 'vitest';
import { ResultSchema, SubmitResponseSchema } from '@/framework/api/schemas';

describe('ResultSchema (exactly-one-kind discriminated union)', () => {
  it('accepts exactly one valid kind', () => {
    expect(
      ResultSchema.safeParse({ objective: { answers: [{ itemId: 'a', choice: 'b' }] } }).success,
    ).toBe(true);
    expect(ResultSchema.safeParse({ order: { sequence: ['a', 'b'] } }).success).toBe(true);
    expect(ResultSchema.safeParse({ metrics: { values: { score: 10 } } }).success).toBe(true);
    expect(
      ResultSchema.safeParse({ transcript: { turns: [{ role: 'ai', text: 'hi' }] } }).success,
    ).toBe(true);
  });

  it('rejects zero kinds', () => {
    expect(ResultSchema.safeParse({}).success).toBe(false);
  });

  it('rejects multiple kinds', () => {
    expect(
      ResultSchema.safeParse({ text: { content: 'x' }, order: { sequence: [] } }).success,
    ).toBe(false);
  });

  it('rejects a malformed kind payload', () => {
    expect(ResultSchema.safeParse({ objective: { answers: [{ itemId: 1 }] } }).success).toBe(false);
    expect(
      ResultSchema.safeParse({ transcript: { turns: [{ role: 'system', text: 'x' }] } }).success,
    ).toBe(false);
  });
});

describe('SubmitResponseSchema', () => {
  it("parses today's response with NO coin fields", () => {
    const r = SubmitResponseSchema.parse({
      activityId: 'C4-BEG-01',
      proficiency: 2,
      bestProficiency: 2,
      passed: true,
      status: 'COMPLETED',
      feedback: 'nice',
      graded: 'server',
      badgesAwarded: [],
    });
    expect(r.coinBalance).toBeUndefined();
    expect(r.proficiency).toBe(2);
  });

  it('accepts coin fields when the backend eventually adds them (BE-1)', () => {
    const r = SubmitResponseSchema.parse({
      activityId: 'C4-BEG-01',
      proficiency: 3,
      bestProficiency: 3,
      passed: true,
      status: 'COMPLETED',
      feedback: 'great',
      graded: 'server',
      badgesAwarded: [],
      coinsEarned: 20,
      coinBalance: 120,
    });
    expect(r.coinsEarned).toBe(20);
    expect(r.coinBalance).toBe(120);
  });
});
