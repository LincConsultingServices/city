import { describe, it, expect } from "vitest";
import {
  applyDelta,
  describeAtelier,
  describeCash,
  describePress,
  describeRail,
  initialWorld,
  railContents,
  validateDelta,
  ATELIER_MOODS,
  CASH_STATES,
  COUNTDOWNS,
  COUNTDOWN_BY_COMPETENCY,
  INITIAL_WORLD,
  PRESS_STATES,
  RAIL_STATES,
  WORLD_DOMAIN,
  WORLD_KEYS,
  type MaisonWorld,
} from "./world";
import { maisonContent } from "./content";
import { allPaths, worldDeltaAlong, type DecisionTreeContent } from "@/lib/decisionTree";
import { BEATS } from "./season";

const trees = Object.values(maisonContent) as DecisionTreeContent[];

/** Every world delta any leaf of any authored MAISON tree can write. */
function authoredDeltas(): { where: string; delta: Record<string, string> }[] {
  const out: { where: string; delta: Record<string, string> }[] = [];
  for (const [id, tree] of Object.entries(maisonContent)) {
    const t = tree as DecisionTreeContent;
    for (const [key, node] of [["seed", t.seed] as const, ...Object.entries(t.followUps)]) {
      for (const choice of node.choices) {
        if (choice.world) out.push({ where: `${id}.${key}.${choice.key}`, delta: choice.world });
      }
    }
  }
  return out;
}

describe("MAISON world — the reducer", () => {
  it("starts eleven weeks out with a rail of eight vermilion pieces", () => {
    expect(INITIAL_WORLD.countdown).toBe("11w");
    expect(INITIAL_WORLD.rail).toBe("bold");
    expect(railContents(INITIAL_WORLD)).toHaveLength(8);
    expect(WORLD_KEYS).toHaveLength(10);
  });

  it("starts Level B in a house that was already someone else's (§14)", () => {
    expect(initialWorld("A").cash).toBe("season");
    expect(initialWorld("B").cash).toBe("tight");
    expect(initialWorld("B").rail).toBe("bold");
  });

  it("applies a legal delta and leaves every other key alone", () => {
    const next = applyDelta(INITIAL_WORLD, { rail: "mixed", cash: "tight" });
    expect(next.rail).toBe("mixed");
    expect(next.cash).toBe("tight");
    expect(next.press).toBe(INITIAL_WORLD.press);
    expect(INITIAL_WORLD.rail).toBe("bold"); // pure — no mutation
  });

  it("skips an illegal key or value rather than corrupting the house", () => {
    expect(applyDelta(INITIAL_WORLD, { rail: "plaid", vibes: "good" })).toEqual(INITIAL_WORLD);
  });

  it("reports illegal keys and values loudly", () => {
    expect(validateDelta({ rail: "mixed" })).toEqual([]);
    expect(validateDelta({ vibes: "good" })).toEqual(["unknown world key 'vibes'"]);
    expect(validateDelta({ rail: "plaid" })[0]).toContain("not a legal value for 'rail'");
  });
});

describe("MAISON world — the house in words", () => {
  it("describes every rail state without a verdict", () => {
    for (const rail of RAIL_STATES) {
      const line = describeRail({ ...INITIAL_WORLD, rail });
      expect(line.length).toBeGreaterThan(10);
      expect(line).not.toMatch(/better|worse|should|unfortunately|well done|mistake|failed/i);
    }
  });

  it("yields the §15 line for a neutral rail verbatim", () => {
    expect(describeRail({ ...INITIAL_WORLD, rail: "neutral" })).toBe(
      "the rail is now mostly neutrals; two vermilion pieces remain.",
    );
  });

  it("reads the price tags and the neck label into the announcement", () => {
    const sold: MaisonWorld = {
      ...INITIAL_WORLD,
      rail: "collab",
      price_tags: "entry",
      house_mark: "collab_logo",
    };
    expect(describeRail(sold)).toContain("the tags read entry price");
    expect(describeRail(sold)).toContain("the neck labels carry a second name");
    expect(railContents(sold).every((p) => p.neck === "MAISON + the group")).toBe(true);
  });

  it("lists a non-empty rail with a price and a neck label for every state", () => {
    for (const rail of RAIL_STATES) {
      const pieces = railContents({ ...INITIAL_WORLD, rail });
      expect(pieces.length, rail).toBeGreaterThan(0);
      for (const piece of pieces) {
        expect(piece.label).not.toBe("");
        expect(piece.price).toBeGreaterThan(0);
        expect(piece.neck).not.toBe("");
      }
    }
  });

  it("announces the atelier, the press wall and the shelf for every state", () => {
    for (const mood of ATELIER_MOODS) {
      expect(describeAtelier({ ...INITIAL_WORLD, atelier_mood: mood })).toContain("the atelier");
    }
    for (const press of PRESS_STATES) {
      expect(describePress({ ...INITIAL_WORLD, press })).toContain("the press wall");
    }
    for (const cash of CASH_STATES) {
      expect(describeCash({ ...INITIAL_WORLD, cash }).length).toBeGreaterThan(10);
    }
  });

  it("never calls a review good or bad — the wall reports coverage (§11)", () => {
    for (const press of PRESS_STATES) {
      expect(describePress({ ...INITIAL_WORLD, press })).not.toMatch(
        /good|bad|great|terrible|praise|panned/i,
      );
    }
  });

  it("maps all nine beats onto the chalked countdown", () => {
    expect(Object.keys(COUNTDOWN_BY_COMPETENCY)).toEqual(BEATS.map((b) => b.competency));
    expect(new Set(Object.values(COUNTDOWN_BY_COMPETENCY)).size).toBe(9);
    for (const value of Object.values(COUNTDOWN_BY_COMPETENCY)) {
      expect(COUNTDOWNS).toContain(value);
    }
  });
});

describe("MAISON world — the content contract", () => {
  it("every authored delta is legal against the model", () => {
    for (const { where, delta } of authoredDeltas()) {
      expect({ where, problems: validateDelta(delta) }).toEqual({ where, problems: [] });
    }
  });

  it("every leaf moves the house — §18.2.8 consequence visibility", () => {
    for (const [id, tree] of Object.entries(maisonContent)) {
      const t = tree as DecisionTreeContent;
      for (const path of allPaths(t)) {
        const delta = worldDeltaAlong(t, path);
        expect(Object.keys(delta).length, `${id}.${path.join(".")}`).toBeGreaterThan(0);
      }
    }
  });

  it("keeps every rail state reachable — none is authored out of the world", () => {
    // All seven states are now reachable across the eighteen trees: `bold` is
    // where every season starts and the other six are written by real leaves. A
    // state that falls off this list is a rail the player can never see, which
    // is a §3.3 readout the building has stopped being able to make.
    const written = new Set<string>([INITIAL_WORLD.rail]);
    for (const { delta } of authoredDeltas()) if (delta.rail) written.add(delta.rail);
    expect(RAIL_STATES.filter((r) => !written.has(r))).toEqual([]);
    expect(WORLD_DOMAIN.rail).toHaveLength(7);
  });

  it("plays a whole tree through the reducer without leaving the domain", () => {
    for (const tree of trees) {
      for (const path of allPaths(tree)) {
        const end = applyDelta(INITIAL_WORLD, worldDeltaAlong(tree, path));
        for (const key of WORLD_KEYS) {
          expect(WORLD_DOMAIN[key], `${key}=${end[key]}`).toContain(end[key]);
        }
      }
    }
  });
});
