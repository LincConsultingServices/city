// Isometric transform — 2:1 diamond projection (PRD §6.2, §12.2). Ported from the
// Godot F0 (core/iso.gd). Pure functions, seedable/testable: grid cell ⇄ world pixel.

// Native scale of the Kenney isometric city/buildings/landscape packs: a 132×66
// (2:1) diamond top face. Rendering sprites at 1× keeps them crisp.
export const TILE_W = 132;
export const TILE_H = 66;
const HALF_W = TILE_W / 2;
const HALF_H = TILE_H / 2;

export interface Vec2 {
  x: number;
  y: number;
}

/** Grid cell (col,row) → world-space pixel (center of the tile's diamond). */
export function mapToWorld(col: number, row: number): Vec2 {
  return { x: (col - row) * HALF_W, y: (col + row) * HALF_H };
}

/** World-space pixel → fractional grid cell (inverse of mapToWorld). */
export function worldToMap(x: number, y: number): Vec2 {
  const a = x / HALF_W;
  const b = y / HALF_H;
  return { x: (a + b) / 2, y: (b - a) / 2 };
}

/** The four corner points of a tile's diamond, in world space (for drawing/hit-test). */
export function tilePolygon(col: number, row: number): Vec2[] {
  const c = mapToWorld(col, row);
  return [
    { x: c.x, y: c.y - HALF_H }, // top
    { x: c.x + HALF_W, y: c.y }, // right
    { x: c.x, y: c.y + HALF_H }, // bottom
    { x: c.x - HALF_W, y: c.y }, // left
  ];
}

/** Round a fractional cell to the nearest integer grid cell. */
export function roundCell(v: Vec2): Vec2 {
  return { x: Math.round(v.x), y: Math.round(v.y) };
}
