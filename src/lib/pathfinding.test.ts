import { describe, it, expect } from "vitest";
import { findPath, type Grid } from "./pathfinding";

function openGrid(width: number, height: number, walls: Array<[number, number]> = []): Grid {
  const blocked = new Set(walls.map(([x, y]) => `${x},${y}`));
  return {
    width,
    height,
    isWalkable: (x, y) => !blocked.has(`${x},${y}`),
  };
}

describe("pathfinding (A*)", () => {
  it("finds a straight path on an open grid", () => {
    const path = findPath(openGrid(5, 1), { x: 0, y: 0 }, { x: 4, y: 0 });
    expect(path).toHaveLength(5);
    expect(path[0]).toEqual({ x: 0, y: 0 });
    expect(path[path.length - 1]).toEqual({ x: 4, y: 0 });
  });

  it("routes around a wall", () => {
    // Column x=1 blocked for rows 0..1, forcing a detour down through row 2.
    const grid = openGrid(3, 3, [
      [1, 0],
      [1, 1],
    ]);
    const path = findPath(grid, { x: 0, y: 0 }, { x: 2, y: 0 });
    expect(path.length).toBeGreaterThan(0);
    expect(path.some((c) => c.x === 1 && c.y === 2)).toBe(true); // went around the bottom
  });

  it("returns [] when the goal is unreachable", () => {
    // Wall the goal cell in completely.
    const grid = openGrid(3, 3, [
      [1, 2],
      [2, 1],
    ]);
    expect(findPath(grid, { x: 0, y: 0 }, { x: 2, y: 2 })).toEqual([]);
  });

  it("returns [] when the goal itself is blocked", () => {
    expect(findPath(openGrid(3, 3, [[2, 2]]), { x: 0, y: 0 }, { x: 2, y: 2 })).toEqual([]);
  });
});
