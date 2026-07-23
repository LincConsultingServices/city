// A* over the walkable tile grid (PRD §6.3, §12.2). Small, pure, testable — click
// sets a target, this returns the cell path; WASD overrides it in the world layer.

export interface Cell {
  x: number; // col
  y: number; // row
}

export interface Grid {
  width: number;
  height: number;
  /** true = walkable. */
  isWalkable(col: number, row: number): boolean;
}

const key = (x: number, y: number) => `${x},${y}`;

// 4-directional movement keeps diagonal corner-cutting out of an iso city.
const NEIGHBORS: ReadonlyArray<Cell> = [
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 },
];

const manhattan = (a: Cell, b: Cell) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

/**
 * A* shortest path from `start` to `goal` (inclusive of both). Returns [] if there
 * is no path or either endpoint is unwalkable/out of bounds.
 */
export function findPath(grid: Grid, start: Cell, goal: Cell): Cell[] {
  const inBounds = (c: Cell) => c.x >= 0 && c.y >= 0 && c.x < grid.width && c.y < grid.height;
  if (!inBounds(start) || !inBounds(goal)) return [];
  if (!grid.isWalkable(goal.x, goal.y) || !grid.isWalkable(start.x, start.y)) return [];

  const open = new Set<string>([key(start.x, start.y)]);
  const cameFrom = new Map<string, string>();
  const gScore = new Map<string, number>([[key(start.x, start.y), 0]]);
  const fScore = new Map<string, number>([[key(start.x, start.y), manhattan(start, goal)]]);
  const cellOf = new Map<string, Cell>([[key(start.x, start.y), start]]);

  while (open.size > 0) {
    // Lowest fScore in the open set.
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
    const current = cellOf.get(currentKey)!;

    if (current.x === goal.x && current.y === goal.y) {
      return reconstruct(cameFrom, cellOf, currentKey);
    }

    open.delete(currentKey);
    for (const d of NEIGHBORS) {
      const nx = current.x + d.x;
      const ny = current.y + d.y;
      if (nx < 0 || ny < 0 || nx >= grid.width || ny >= grid.height) continue;
      if (!grid.isWalkable(nx, ny)) continue;
      const nKey = key(nx, ny);
      const tentative = (gScore.get(currentKey) ?? Infinity) + 1;
      if (tentative < (gScore.get(nKey) ?? Infinity)) {
        cameFrom.set(nKey, currentKey);
        gScore.set(nKey, tentative);
        fScore.set(nKey, tentative + manhattan({ x: nx, y: ny }, goal));
        cellOf.set(nKey, { x: nx, y: ny });
        open.add(nKey);
      }
    }
  }
  return [];
}

function reconstruct(
  cameFrom: Map<string, string>,
  cellOf: Map<string, Cell>,
  endKey: string,
): Cell[] {
  const path: Cell[] = [];
  let k: string | undefined = endKey;
  while (k) {
    path.unshift(cellOf.get(k)!);
    k = cameFrom.get(k);
  }
  return path;
}
