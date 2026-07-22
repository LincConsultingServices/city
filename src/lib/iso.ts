// Iso — the one isometric projection (PRD §6.2: fixed 2:1 diamond, no rotation).
// Pure math so every tile, footprint, and draw call agrees on one mapping and it
// is trivially unit-testable. Ported from the Godot F0 (core/iso.gd).
//
// World space is pixels; map space is diamond cells.

export interface Cell {
  x: number; // column
  y: number; // row
}

export interface Point {
  x: number;
  y: number;
}

export const TILE_W = 256; // diamond width (PRD §14.2)
export const TILE_H = 128; // diamond height (2:1)

/** Cell (col, row) → world pixel at the cell's CENTER. */
export function mapToWorld(cell: Point): Point {
  return {
    x: (cell.x - cell.y) * (TILE_W * 0.5),
    y: (cell.x + cell.y) * (TILE_H * 0.5),
  };
}

/** World pixel → fractional cell. */
export function worldToMap(pos: Point): Point {
  const a = pos.x / (TILE_W * 0.5);
  const b = pos.y / (TILE_H * 0.5);
  return { x: (a + b) * 0.5, y: (b - a) * 0.5 };
}

/** World pixel → nearest integer cell. */
export function worldToCell(pos: Point): Cell {
  const c = worldToMap(pos);
  return { x: Math.round(c.x), y: Math.round(c.y) };
}

/** The 4 corner points (world space) of a cell's diamond. */
export function tilePolygon(cell: Point): Point[] {
  const c = mapToWorld(cell);
  const hw = TILE_W * 0.5;
  const hh = TILE_H * 0.5;
  return [
    { x: c.x, y: c.y - hh }, // top
    { x: c.x + hw, y: c.y }, // right
    { x: c.x, y: c.y + hh }, // bottom
    { x: c.x - hw, y: c.y }, // left
  ];
}

export const cellKey = (c: Cell): string => `${c.x},${c.y}`;
export const cellEquals = (a: Cell, b: Cell): boolean => a.x === b.x && a.y === b.y;
