import { describe, it, expect } from 'vitest';
import { findPath, type Grid } from '@/lib/pathfind';

const openGrid: Grid = { width: 5, height: 5, walkable: () => true };

describe('findPath (A*)', () => {
  it('returns [] when start === goal', () => {
    expect(findPath(openGrid, { x: 1, y: 1 }, { x: 1, y: 1 })).toEqual([]);
  });

  it('finds the shortest path on an open grid (manhattan length, goal last)', () => {
    const p = findPath(openGrid, { x: 0, y: 0 }, { x: 2, y: 1 });
    expect(p.length).toBe(3);
    expect(p[p.length - 1]).toEqual({ x: 2, y: 1 });
  });

  it('routes around a wall and never steps on it', () => {
    // x=1 is a wall except at y=4 (a single gap).
    const grid: Grid = { width: 5, height: 5, walkable: (x, y) => !(x === 1 && y !== 4) };
    const p = findPath(grid, { x: 0, y: 0 }, { x: 2, y: 0 });
    expect(p.length).toBeGreaterThan(0);
    expect(p[p.length - 1]).toEqual({ x: 2, y: 0 });
    expect(p.some((c) => c.x === 1 && c.y !== 4)).toBe(false);
  });

  it('returns [] when the goal is unreachable (a full blocking column)', () => {
    const grid: Grid = { width: 3, height: 3, walkable: (x) => x !== 1 };
    expect(findPath(grid, { x: 0, y: 0 }, { x: 2, y: 0 })).toEqual([]);
  });

  it('returns [] when the goal cell itself is not walkable', () => {
    const grid: Grid = { width: 3, height: 3, walkable: (x, y) => !(x === 2 && y === 2) };
    expect(findPath(grid, { x: 0, y: 0 }, { x: 2, y: 2 })).toEqual([]);
  });
});
