// Gray-box building exteriors (PRD §6.5) — an extruded iso block + sign + door,
// rendered identically for every venue from its manifest. Open vs Locked is a
// data-driven visual (never color-only, PRD §16: Locked adds a 🔒). No per-
// building bespoke logic — the framework owns state rendering.

import { Container, Graphics, Text } from 'pixi.js';
import { mapToWorld, TILE_W, TILE_H, type Cell } from '@/lib/iso';
import { entranceCell, footprintCells, type BuildingManifest } from '@/framework/building';

const HEIGHT = 74;

interface Palette {
  roof: number;
  left: number;
  right: number;
  door: number;
}
const OPEN: Palette = { roof: 0xd1b880, left: 0x858fa8, right: 0x9ea8c2, door: 0x40424d };
const LOCKED: Palette = { roof: 0xada79b, left: 0x7c7f8a, right: 0x9498a1, door: 0x2f3038 };
const OUTLINE = 0x40424d;

export interface ExteriorHandle {
  container: Container;
  id: string;
  enabled: boolean;
  entrance: Cell;
  frontY: number;
}

export function createExterior(manifest: BuildingManifest): ExteriorHandle {
  const container = new Container();
  const g = new Graphics();
  const pal = manifest.enabled ? OPEN : LOCKED;
  const hw = TILE_W * 0.5;
  const hh = TILE_H * 0.5;

  const cells = footprintCells(manifest)
    .slice()
    .sort((a, b) => a.x + a.y - (b.x + b.y));
  let frontY = -Infinity;
  let minRoofTop = Infinity;
  let sumCx = 0;

  for (const cell of cells) {
    const c = mapToWorld(cell);
    sumCx += c.x;
    frontY = Math.max(frontY, c.y + hh);
    minRoofTop = Math.min(minRoofTop, c.y - hh - HEIGHT);

    // Left face (down-left).
    g.poly([c.x - hw, c.y, c.x, c.y + hh, c.x, c.y + hh - HEIGHT, c.x - hw, c.y - HEIGHT])
      .fill({ color: pal.left })
      .stroke({ width: 1, color: OUTLINE, alpha: 0.5 });
    // Right face (down-right).
    g.poly([c.x + hw, c.y, c.x, c.y + hh, c.x, c.y + hh - HEIGHT, c.x + hw, c.y - HEIGHT])
      .fill({ color: pal.right })
      .stroke({ width: 1, color: OUTLINE, alpha: 0.5 });
    // Roof (top diamond, raised).
    g.poly([
      c.x,
      c.y - hh - HEIGHT,
      c.x + hw,
      c.y - HEIGHT,
      c.x,
      c.y + hh - HEIGHT,
      c.x - hw,
      c.y - HEIGHT,
    ])
      .fill({ color: pal.roof })
      .stroke({ width: 1.5, color: OUTLINE, alpha: 0.7 });
  }

  // Door marker at the entrance cell.
  const ent = mapToWorld(entranceCell(manifest));
  g.poly([ent.x, ent.y - 10, ent.x + 16, ent.y, ent.x, ent.y + 10, ent.x - 16, ent.y]).fill({
    color: pal.door,
    alpha: 0.85,
  });

  container.addChild(g);

  // Sign (displayName) above the roof; add a 🔒 when Locked (not color-only).
  const centerX = sumCx / cells.length;
  const label = new Text({
    text: manifest.enabled ? manifest.displayName : `🔒 ${manifest.displayName}`,
    style: {
      fill: 0xffffff,
      fontFamily: 'IBM Plex Sans, system-ui, sans-serif',
      fontSize: 18,
      fontWeight: '600',
      stroke: { color: OUTLINE, width: 4 },
      align: 'center',
    },
  });
  label.anchor.set(0.5, 1);
  label.position.set(centerX, minRoofTop - 6);
  container.addChild(label);

  container.zIndex = frontY;
  return {
    container,
    id: manifest.id,
    enabled: manifest.enabled,
    entrance: entranceCell(manifest),
    frontY,
  };
}
