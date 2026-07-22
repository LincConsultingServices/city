// A* over the walkable tile grid (PRD §6.3, §12.2). Pure and unit-tested; the
// world layer wires it to click-to-move. 4-neighbour movement keeps iso paths
// clean and corner-cut-free. Returns the step sequence from the first move to
// the goal (inclusive), or [] if start==goal or the goal is unreachable.

import type { Cell } from './iso';
import { cellKey } from './iso';

export interface Grid {
  width: number;
  height: number;
  /** True when the cell can be stood on. */
  walkable: (x: number, y: number) => boolean;
}

const NEIGHBORS: ReadonlyArray<readonly [number, number]> = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

const manhattan = (a: Cell, b: Cell) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

const inBounds = (grid: Grid, x: number, y: number) =>
  x >= 0 && y >= 0 && x < grid.width && y < grid.height;

export function findPath(grid: Grid, start: Cell, goal: Cell): Cell[] {
  if (start.x === goal.x && start.y === goal.y) return [];
  if (!inBounds(grid, goal.x, goal.y) || !grid.walkable(goal.x, goal.y)) return [];

  const open = new Set<string>([cellKey(start)]);
  const cameFrom = new Map<string, Cell>();
  const gScore = new Map<string, number>([[cellKey(start), 0]]);
  const fScore = new Map<string, number>([[cellKey(start), manhattan(start, goal)]]);
  const nodes = new Map<string, Cell>([[cellKey(start), start]]);

  while (open.size > 0) {
    // Lowest fScore in the open set (linear scan — fine for F0 grid sizes).
    let currentKey: string | null = null;
    let best = Infinity;
    for (const k of open) {
      const f = fScore.get(k) ?? Infinity;
      if (f < best) {
        best = f;
        currentKey = k;
      }
    }
    if (currentKey === null) break;

    const current = nodes.get(currentKey)!;
    if (current.x === goal.x && current.y === goal.y) {
      return reconstruct(cameFrom, current);
    }

    open.delete(currentKey);
    const currentG = gScore.get(currentKey) ?? Infinity;

    for (const [dx, dy] of NEIGHBORS) {
      const nx = current.x + dx;
      const ny = current.y + dy;
      if (!inBounds(grid, nx, ny) || !grid.walkable(nx, ny)) continue;
      const neighbor: Cell = { x: nx, y: ny };
      const nKey = cellKey(neighbor);
      const tentative = currentG + 1;
      if (tentative < (gScore.get(nKey) ?? Infinity)) {
        cameFrom.set(nKey, current);
        gScore.set(nKey, tentative);
        fScore.set(nKey, tentative + manhattan(neighbor, goal));
        nodes.set(nKey, neighbor);
        open.add(nKey);
      }
    }
  }

  return []; // unreachable
}

function reconstruct(cameFrom: Map<string, Cell>, goal: Cell): Cell[] {
  const path: Cell[] = [goal];
  let cur = goal;
  for (;;) {
    const prev = cameFrom.get(cellKey(cur));
    if (!prev) break;
    path.unshift(prev);
    cur = prev;
  }
  // Drop the start cell — callers want the steps to take, not where we stand.
  path.shift();
  return path;
}
