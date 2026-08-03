import { describe, it, expect } from "vitest";
import { whereNext } from "./whereNext";
import { BEATS } from "./season";
import { beatActivityId } from "./beats";
import type { LevelActivity } from "@/framework/api/schemas";

const rows = (scores: Record<string, number | null>): Map<string, LevelActivity> => {
  const m = new Map<string, LevelActivity>();
  for (const beat of BEATS) {
    const p = scores[beat.competency];
    if (p === undefined) continue;
    const id = beatActivityId(beat, "A");
    m.set(id, { id, bestProficiency: p } as LevelActivity);
  }
  return m;
};

describe("MAISON — where next (§13.7)", () => {
  it("suggests nothing at all when the server has said nothing", () => {
    // A lookbook that guesses at your weakest competency is worse than one that
    // admits it does not know. No rows, no scores, no suggestions.
    expect(whereNext("A", undefined)).toEqual([]);
    expect(whereNext("A", rows({}))).toEqual([]);
    expect(whereNext("A", rows({ C2: null, C4: null }))).toEqual([]);
  });

  it("leads with the competency the server scored lowest", () => {
    // C4 is Money Smarts — the Bank presses on it.
    const out = whereNext("A", rows({ C2: 3, C4: 1, C9: 2 }));
    expect(out[0].competency).toBe("C4");
    expect(out[0].proficiency).toBe(1);
    expect(out.map((s) => s.competency)).toEqual(["C4", "C9", "C2"]);
  });

  it("carries two or three, never a wall of them", () => {
    const out = whereNext("A", rows({ C1: 1, C2: 1, C3: 1, C4: 1, C5: 1, C9: 1 }));
    expect(out.length).toBeLessThanOrEqual(3);
    expect(out.length).toBeGreaterThan(0);
  });

  it("names three different things to work on, not one thing three times", () => {
    const out = whereNext("A", rows({ C2: 1, C4: 1, C9: 1 }));
    expect(new Set(out.map((s) => s.competency)).size).toBe(out.length);
  });

  it("never sends you back to MAISON — that is not a suggestion", () => {
    const out = whereNext("A", rows({ C1: 1, C2: 1, C4: 1, C5: 1, C8: 1, C9: 1 }));
    expect(out.map((s) => s.venueName)).not.toContain("MAISON");
  });

  it("only ever names a venue the city actually has", () => {
    const out = whereNext("A", rows({ C2: 1, C4: 2, C9: 3 }));
    for (const s of out) {
      expect(s.venueName.length).toBeGreaterThan(0);
      expect(s.district.length).toBeGreaterThan(0);
    }
  });
});
