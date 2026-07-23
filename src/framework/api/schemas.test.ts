import { describe, it, expect } from "vitest";
import { ResultPayload, SubmitResponse, RegistryModules } from "./schemas";

describe("wire schemas", () => {
  it("accepts a valid objective result payload", () => {
    const r = ResultPayload.safeParse({
      objective: { answers: [{ itemId: "q1", choice: "a" }] },
    });
    expect(r.success).toBe(true);
  });

  it("accepts a valid metrics result payload", () => {
    const r = ResultPayload.safeParse({ metrics: { values: { revenue: 120 } } });
    expect(r.success).toBe(true);
  });

  it("rejects a malformed result payload", () => {
    expect(ResultPayload.safeParse({ objective: { answers: "nope" } }).success).toBe(false);
  });

  it("parses a submit response and defaults badgesAwarded", () => {
    const r = SubmitResponse.parse({
      activityId: "C4-BEG-09",
      proficiency: 2,
      bestProficiency: 2,
      passed: true,
      status: "COMPLETED",
      graded: "server",
    });
    expect(r.badgesAwarded).toEqual([]);
    expect(r.feedback).toBe("");
  });

  it("parses a minimal registry/modules response", () => {
    const r = RegistryModules.parse({
      registryVersion: "v1",
      modules: [{ code: "C4", name: "Financial Discipline", levels: {} }],
    });
    expect(r.metaBadges).toEqual([]);
    expect(r.modules[0].code).toBe("C4");
  });
});
