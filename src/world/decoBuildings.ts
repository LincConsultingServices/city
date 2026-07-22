// Decorative (non-venue) buildings — extruded iso blocks with lit windows, for
// city fill. Same projection as venue exteriors; drawn from cityMap data. Not
// interactive (they just occupy the block and read as a skyline).

import { Container, Graphics } from 'pixi.js';
import { mapToWorld, TILE_W, TILE_H } from '@/lib/iso';
import type { DecoBuilding } from './cityMap';

const OUTLINE = 0x2f333b;

interface Pt {
  x: number;
  y: number;
}
const add = (p: Pt, q: Pt): Pt => ({ x: p.x + q.x, y: p.y + q.y });
const mul = (p: Pt, s: number): Pt => ({ x: p.x * s, y: p.y * s });

// Deterministic per-window "lit" so the skyline doesn't flicker between mounts.
function lit(x: number, y: number, r: number, c: number): boolean {
  const h = Math.sin(x * 12.9898 + y * 78.233 + r * 37.719 + c * 19.19) * 43758.5453;
  return h - Math.floor(h) > 0.5;
}

function faceWindows(
  g: Graphics,
  base: Pt,
  U: Pt,
  V: Pt,
  cols: number,
  rows: number,
  seed: number,
) {
  const su = 0.28 / cols;
  const sv = 0.3 / rows;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const fu = (c + 0.5) / cols;
      const fv = (r + 0.62) / rows;
      const p0 = add(base, add(mul(U, fu - su), mul(V, fv - sv)));
      const p1 = add(base, add(mul(U, fu + su), mul(V, fv - sv)));
      const p2 = add(base, add(mul(U, fu + su), mul(V, fv + sv)));
      const p3 = add(base, add(mul(U, fu - su), mul(V, fv + sv)));
      const on = lit(seed, r * 7 + c, r, c);
      g.poly([p0.x, p0.y, p1.x, p1.y, p2.x, p2.y, p3.x, p3.y]).fill({
        color: on ? 0xffe6a3 : 0x2b2f37,
        alpha: on ? 0.92 : 0.5,
      });
    }
  }
}

export function makeDecoBuilding(deco: DecoBuilding): { container: Container; frontY: number } {
  const container = new Container();
  const g = new Graphics();
  const hw = TILE_W * 0.5;
  const hh = TILE_H * 0.5;
  const H = deco.height;
  const cells = deco.cells.slice().sort((a, b) => a.x + a.y - (b.x + b.y));
  let frontY = -Infinity;
  const rows = Math.max(2, Math.min(5, Math.floor(H / 30)));

  for (const cell of cells) {
    const c = mapToWorld(cell);
    frontY = Math.max(frontY, c.y + hh);

    // Left + right faces.
    g.poly([c.x - hw, c.y, c.x, c.y + hh, c.x, c.y + hh - H, c.x - hw, c.y - H])
      .fill({ color: deco.left })
      .stroke({ width: 1, color: OUTLINE, alpha: 0.45 });
    g.poly([c.x + hw, c.y, c.x, c.y + hh, c.x, c.y + hh - H, c.x + hw, c.y - H])
      .fill({ color: deco.right })
      .stroke({ width: 1, color: OUTLINE, alpha: 0.45 });
    // Roof.
    g.poly([c.x, c.y - hh - H, c.x + hw, c.y - H, c.x, c.y + hh - H, c.x - hw, c.y - H])
      .fill({ color: deco.roof })
      .stroke({ width: 1.5, color: OUTLINE, alpha: 0.6 });

    // Windows on both faces (V points up).
    const seed = cell.x * 31 + cell.y * 17;
    faceWindows(g, { x: c.x - hw, y: c.y }, { x: hw, y: hh }, { x: 0, y: -H }, 2, rows, seed);
    faceWindows(
      g,
      { x: c.x + hw, y: c.y },
      { x: -hw, y: hh },
      { x: 0, y: -H },
      2,
      rows,
      seed + 100,
    );
  }

  container.addChild(g);
  container.zIndex = frontY;
  return { container, frontY };
}
