// Data-driven city map (PRD §6.1) — districts, road network, props, and
// decorative buildings live here as typed data; the canvas hardcodes no
// positions. This is what makes the gray-box read as a city.

import type { Cell } from '@/lib/iso';

export const GRID_W = 26;
export const GRID_H = 22;
export const SPAWN: Cell = { x: 12, y: 17 };
export const FOUNTAIN: Cell = { x: 12, y: 13 };

const H_ROADS = [10, 15];
const V_ROADS = [8, 18];

export const isRoad = (x: number, y: number) => H_ROADS.includes(y) || V_ROADS.includes(x);
export const isIntersection = (x: number, y: number) => H_ROADS.includes(y) && V_ROADS.includes(x);

/** Road orientation for lane markings: 'h' | 'v' | 'x' (intersection) | null. */
export function roadKind(x: number, y: number): 'h' | 'v' | 'x' | null {
  const h = H_ROADS.includes(y);
  const v = V_ROADS.includes(x);
  if (h && v) return 'x';
  if (h) return 'h';
  if (v) return 'v';
  return null;
}

// ── District ground palette (base, alt for the subtle checker) ───────────────
export interface GroundColors {
  base: number;
  alt: number;
}
export function districtGround(x: number, y: number): GroundColors {
  if (y < 10) {
    if (x < 8) return { base: 0xc2c9d6, alt: 0xb8c0cf }; // Downtown (cool)
    if (x < 18) return { base: 0xd8cdbc, alt: 0xcfc3af }; // Market (warm)
    return { base: 0xc4d2cc, alt: 0xb9c9c2 }; // Tech (mint)
  }
  if (y < 15) return { base: 0xd9dce2, alt: 0xcfd3db }; // Civic plaza (stone)
  return { base: 0xc6d6c2, alt: 0xbccfb6 }; // Campus (green)
}

// ── Props ────────────────────────────────────────────────────────────────────
export const TREES: Cell[] = [
  // Tech park cluster
  { x: 21, y: 3 },
  { x: 22, y: 4 },
  { x: 23, y: 3 },
  { x: 21, y: 5 },
  { x: 23, y: 6 },
  // Civic plaza greenery
  { x: 10, y: 12 },
  { x: 14, y: 12 },
  { x: 10, y: 14 },
  { x: 14, y: 14 },
  // Campus
  { x: 7, y: 18 },
  { x: 16, y: 18 },
  { x: 20, y: 20 },
];

export const LAMPS: Cell[] = [
  { x: 7, y: 9 },
  { x: 9, y: 9 },
  { x: 17, y: 9 },
  { x: 19, y: 9 },
  { x: 7, y: 16 },
  { x: 9, y: 16 },
  { x: 17, y: 16 },
  { x: 19, y: 16 },
];

export const BENCHES: Cell[] = [
  { x: 11, y: 13 },
  { x: 13, y: 13 },
];

export interface CarPlacement {
  cell: Cell;
  dir: 'h' | 'v';
  color: number;
}
export const CARS: CarPlacement[] = [
  { cell: { x: 3, y: 10 }, dir: 'h', color: 0xd66a5a },
  { cell: { x: 13, y: 10 }, dir: 'h', color: 0x5aa0d6 },
  { cell: { x: 8, y: 6 }, dir: 'v', color: 0xe0b84e },
  { cell: { x: 18, y: 12 }, dir: 'v', color: 0x6fbf73 },
];

// ── Decorative (non-venue) buildings — city fill with lit windows ────────────
export interface DecoBuilding {
  cells: Cell[];
  height: number;
  roof: number;
  left: number;
  right: number;
}
const b = (coords: [number, number][]): Cell[] => coords.map(([x, y]) => ({ x, y }));

export const DECO_BUILDINGS: DecoBuilding[] = [
  // Downtown — glass towers (tall, cool)
  {
    cells: b([
      [3, 3],
      [4, 3],
      [3, 4],
      [4, 4],
    ]),
    height: 150,
    roof: 0x9fb0c8,
    left: 0x5f6b86,
    right: 0x74839e,
  },
  {
    cells: b([
      [2, 6],
      [3, 6],
    ]),
    height: 96,
    roof: 0xa7b4c6,
    left: 0x66728a,
    right: 0x7d8aa2,
  },
  // Market — warm mid-rise (near, but clear of, the Ice Cream Cart at 10-11,8)
  {
    cells: b([
      [14, 3],
      [15, 3],
      [14, 4],
      [15, 4],
    ]),
    height: 84,
    roof: 0xd0b487,
    left: 0x9a7f5c,
    right: 0xb0946c,
  },
  // Tech — sleek block
  {
    cells: b([
      [22, 6],
      [23, 6],
    ]),
    height: 110,
    roof: 0x9dc4b4,
    left: 0x5e8578,
    right: 0x74998b,
  },
  // Campus — collegiate low-rise
  {
    cells: b([
      [3, 18],
      [4, 18],
      [5, 18],
    ]),
    height: 70,
    roof: 0xcbb083,
    left: 0x8f7a55,
    right: 0xa68e66,
  },
  // South-east — brick
  {
    cells: b([
      [21, 18],
      [22, 18],
    ]),
    height: 88,
    roof: 0xc98a6a,
    left: 0x8f5a44,
    right: 0xa66c53,
  },
];
