import { describe, it, expect } from "vitest";
import {
  ResultPayload,
  SubmitResponse,
  RegistryModules,
  BadgesResponse,
  ProfileResponse,
} from "./schemas";

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

describe("Trophy Hall schemas (live endpoints)", () => {
  it("parses GET /badges shape incl. awardedAt", () => {
    const r = BadgesResponse.parse({
      badges: [
        {
          id: "BADGE-C4-BEGINNER",
          name: "Coin Counter",
          tier: "BRONZE",
          competencyCode: "C4",
          level: "BEGINNER",
          awardedAt: "2026-07-20T10:00:00Z",
        },
      ],
    });
    expect(r.badges[0].awardedAt).toBe("2026-07-20T10:00:00Z");
  });

  it("defaults awardedAt when the server omits it", () => {
    const r = BadgesResponse.parse({ badges: [{ id: "B1", name: "Badge" }] });
    expect(r.badges[0].awardedAt).toBe("");
  });

  it("parses GET /profile, tolerating an empty category", () => {
    const r = ProfileResponse.parse({
      competencies: [
        {
          code: "C4",
          name: "Financial Discipline",
          completed: 3,
          totalSeeded: 12,
          avgProficiency: 2.3,
          category: "P2",
        },
        {
          code: "C9",
          name: "Resilience",
          completed: 0,
          totalSeeded: 12,
          avgProficiency: 0,
          category: "",
        },
      ],
    });
    expect(r.competencies).toHaveLength(2);
    expect(r.competencies[1].category).toBe("");
  });
});
