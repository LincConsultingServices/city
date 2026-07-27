// PRD §6.4 hard budgets: ≤20 pedestrian NPCs, ≤6 vehicles, ≤15 animated props.
import { describe, it, expect } from "vitest";
import {
  NPC_COUNT,
  NPC_COUNT_REDUCED,
  CAR_COUNT,
  CAR_COUNT_REDUCED,
  MAX_PARTICLES,
  MAX_EMITTERS,
} from "./budgets";

describe("ambient budgets stay within PRD §6.4", () => {
  it("caps pedestrians at 20 and halves them under reduced motion", () => {
    expect(NPC_COUNT).toBeLessThanOrEqual(20);
    expect(NPC_COUNT_REDUCED).toBeLessThanOrEqual(Math.ceil(NPC_COUNT / 2));
  });

  it("caps vehicles at 6 and halves them under reduced motion", () => {
    expect(CAR_COUNT).toBeLessThanOrEqual(6);
    expect(CAR_COUNT_REDUCED).toBeLessThanOrEqual(Math.ceil(CAR_COUNT / 2));
  });

  it("caps animated emitters at 15 and bounds the particle pool", () => {
    expect(MAX_EMITTERS).toBeLessThanOrEqual(15);
    expect(MAX_PARTICLES).toBeLessThanOrEqual(128);
  });
});
