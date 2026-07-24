import { describe, it, expect } from "vitest";
import { blockPerimeter, npcRoutes } from "./routes";
import { BLOCKS, isRoad } from "./cityMap";

describe("blockPerimeter", () => {
  it("returns 4 distinct crossroad corners around the block", () => {
    for (let br = 0; br < BLOCKS; br++) {
      for (let bc = 0; bc < BLOCKS; bc++) {
        const loop = blockPerimeter(bc, br);
        expect(loop).toHaveLength(4);
        const unique = new Set(loop.map((c) => `${c.x},${c.y}`));
        expect(unique.size).toBe(4);
        for (const c of loop) expect(isRoad(c.x, c.y)).toBe(true);
      }
    }
  });
});

describe("npcRoutes", () => {
  it("produces the requested count with sane paces", () => {
    const routes = npcRoutes(14, 42);
    expect(routes).toHaveLength(14);
    for (const r of routes) {
      expect(r.speed).toBeGreaterThanOrEqual(0.5);
      expect(r.speed).toBeLessThanOrEqual(0.8);
      expect(r.startLeg).toBeGreaterThanOrEqual(0);
      expect(r.startLeg).toBeLessThan(4);
      expect(r.startT).toBeGreaterThanOrEqual(0);
      expect(r.startT).toBeLessThan(1);
    }
  });

  it("spreads pedestrians across distinct blocks while blocks remain", () => {
    const routes = npcRoutes(14, 42);
    const blocks = new Set(routes.map((r) => r.loop.map((c) => `${c.x},${c.y}`).join("|")));
    expect(blocks.size).toBe(14); // 14 ≤ 16 blocks — no block reused yet
  });

  it("is deterministic per seed and varies across seeds", () => {
    expect(JSON.stringify(npcRoutes(10, 7))).toBe(JSON.stringify(npcRoutes(10, 7)));
    expect(JSON.stringify(npcRoutes(10, 7))).not.toBe(JSON.stringify(npcRoutes(10, 8)));
  });
});
