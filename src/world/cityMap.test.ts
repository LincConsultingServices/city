// Map invariants — the regression net for city densification. Any filler/prop
// added to cityMap.ts must keep every venue reachable and never overlap.
import { describe, it, expect } from "vitest";
import { findPath } from "@/lib/pathfinding";
import {
  BLOCK,
  GRID_W,
  GRID_H,
  SPAWN,
  VENUES,
  FILLERS,
  PROPS,
  CROSSWALKS,
  cityGrid,
  isRoad,
} from "./cityMap";

const key = (x: number, y: number) => `${x},${y}`;

describe("city map invariants", () => {
  it("spawn is walkable", () => {
    expect(cityGrid.isWalkable(SPAWN.x, SPAWN.y)).toBe(true);
  });

  it("every venue entrance is walkable and reachable from spawn", () => {
    for (const v of VENUES) {
      const e = v.entranceTile;
      expect(cityGrid.isWalkable(e.x, e.y), `${v.id} entrance blocked`).toBe(true);
      const path = findPath(cityGrid, SPAWN, e);
      expect(path.length, `${v.id} entrance unreachable from spawn`).toBeGreaterThan(0);
    }
  });

  it("keeps the walkway from each entrance to its crosswalk clear", () => {
    for (const v of VENUES) {
      const e = v.entranceTile;
      const roadY = Math.ceil(e.y / BLOCK) * BLOCK;
      for (let y = e.y; y <= roadY; y++) {
        expect(cityGrid.isWalkable(e.x, y), `${v.id} walkway blocked at ${e.x},${y}`).toBe(true);
      }
    }
  });

  it("no two building footprints overlap", () => {
    const seen = new Map<string, string>();
    for (const v of VENUES) {
      for (const t of v.footprintTiles) {
        const k = key(t.x, t.y);
        expect(seen.has(k), `${v.id} overlaps ${seen.get(k)} at ${k}`).toBe(false);
        seen.set(k, v.id);
      }
    }
    FILLERS.forEach((f, i) => {
      for (const t of f.footprintTiles) {
        const k = key(t.x, t.y);
        expect(seen.has(k), `filler#${i} overlaps ${seen.get(k)} at ${k}`).toBe(false);
        seen.set(k, `filler#${i}`);
      }
    });
  });

  it("footprints stay inside block interiors (never on roads, never out of bounds)", () => {
    const all = [
      ...VENUES.flatMap((v) => v.footprintTiles),
      ...FILLERS.flatMap((f) => f.footprintTiles),
    ];
    for (const t of all) {
      expect(t.x).toBeGreaterThan(0);
      expect(t.y).toBeGreaterThan(0);
      expect(t.x).toBeLessThan(GRID_W - 1);
      expect(t.y).toBeLessThan(GRID_H - 1);
      expect(isRoad(t.x, t.y), `footprint on road at ${t.x},${t.y}`).toBe(false);
    }
  });

  it("props never sit on a building footprint, a road, or a venue entrance", () => {
    const footprints = new Set([
      ...VENUES.flatMap((v) => v.footprintTiles.map((t) => key(t.x, t.y))),
      ...FILLERS.flatMap((f) => f.footprintTiles.map((t) => key(t.x, t.y))),
    ]);
    const entrances = new Set(VENUES.map((v) => key(v.entranceTile.x, v.entranceTile.y)));
    for (const p of PROPS) {
      const k = key(p.cell.x, p.cell.y);
      expect(footprints.has(k), `${p.kind} on a footprint at ${k}`).toBe(false);
      expect(isRoad(p.cell.x, p.cell.y), `${p.kind} on a road at ${k}`).toBe(false);
      expect(entrances.has(k), `${p.kind} on an entrance at ${k}`).toBe(false);
    }
  });

  it("no two props share a cell", () => {
    const seen = new Set<string>();
    for (const p of PROPS) {
      const k = key(p.cell.x, p.cell.y);
      expect(seen.has(k), `duplicate prop cell ${k}`).toBe(false);
      seen.add(k);
    }
  });

  it("crosswalk cells are road cells", () => {
    for (const c of CROSSWALKS) {
      const [x, y] = c.split(",").map(Number);
      expect(isRoad(x, y), `crosswalk off-road at ${c}`).toBe(true);
    }
  });

  it("filler visual indices are sane", () => {
    for (const f of FILLERS) {
      expect(Number.isInteger(f.visualIndex)).toBe(true);
      expect(f.visualIndex).toBeGreaterThanOrEqual(0);
    }
  });
});
