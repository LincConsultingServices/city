// Ambient props — real CC0 Kenney tree sprites + procedural streetlights,
// fountain, benches, and cars. Each returns a Container placed at a cell with a
// y-sort zIndex so it composits correctly with buildings and the character.

import { Container, Graphics, Sprite, type Texture } from 'pixi.js';
import { mapToWorld, type Cell } from '@/lib/iso';
import { cityTexture } from './assets';
import type { CarPlacement } from './cityMap';

const OUTLINE = 0x2f333b;

function shade(color: number, f: number): number {
  const r = Math.min(255, Math.round(((color >> 16) & 0xff) * f));
  const g = Math.min(255, Math.round(((color >> 8) & 0xff) * f));
  const b = Math.min(255, Math.round((color & 0xff) * f));
  return (r << 16) | (g << 8) | b;
}

function place(cell: Cell, child: Container | Graphics | Sprite): Container {
  const c = new Container();
  const w = mapToWorld(cell);
  c.addChild(child);
  c.position.set(w.x, w.y);
  c.zIndex = w.y;
  return c;
}

export function makeTree(cell: Cell, tex: Texture | undefined = cityTexture('tree')): Container {
  if (tex) {
    const s = new Sprite(tex);
    s.anchor.set(0.5, 1);
    s.scale.set(1.5);
    s.roundPixels = true;
    return place(cell, s);
  }
  const g = new Graphics();
  g.ellipse(0, 0, 14, 7).fill({ color: 0x000000, alpha: 0.18 });
  g.rect(-4, -26, 8, 26).fill({ color: 0x6b4a2b });
  g.circle(0, -42, 20).fill({ color: 0x5fae4e }).stroke({ width: 2, color: 0x3d7a34 });
  return place(cell, g);
}

export function makeLamp(cell: Cell): Container {
  const g = new Graphics();
  g.ellipse(0, 0, 9, 4).fill({ color: 0x000000, alpha: 0.15 });
  g.rect(-2, -64, 4, 64).fill({ color: 0x484d55 });
  g.rect(-2, -64, 18, 4).fill({ color: 0x484d55 });
  g.circle(15, -59, 5).fill({ color: 0xffe08a });
  g.circle(15, -59, 11).fill({ color: 0xffe08a, alpha: 0.16 });
  return place(cell, g);
}

export function makeFountain(cell: Cell): Container {
  const g = new Graphics();
  g.ellipse(0, 2, 56, 28).fill({ color: 0xcfd3db }).stroke({ width: 2, color: 0x9aa0ab });
  g.ellipse(0, -2, 42, 21).fill({ color: 0x8fc7e8 });
  g.ellipse(0, -10, 16, 8).fill({ color: 0xcfd3db }).stroke({ width: 2, color: 0x9aa0ab });
  g.rect(-3, -36, 6, 26).fill({ color: 0xbfc4cd });
  g.ellipse(0, -36, 11, 5).fill({ color: 0x9fd3ef });
  return place(cell, g);
}

export function makeBench(cell: Cell): Container {
  const g = new Graphics();
  g.ellipse(0, 0, 16, 6).fill({ color: 0x000000, alpha: 0.12 });
  g.rect(-16, -18, 32, 4).fill({ color: 0x9a774d });
  g.rect(-16, -10, 32, 5).fill({ color: 0x8a6a44 });
  g.rect(-14, -6, 3, 8).fill({ color: 0x5c4630 });
  g.rect(11, -6, 3, 8).fill({ color: 0x5c4630 });
  return place(cell, g);
}

export function makeCar(car: CarPlacement): Container {
  const g = new Graphics();
  const sign = car.dir === 'h' ? 1 : -1;
  const hw = 26;
  const hh = 13;
  const H = 13;
  g.ellipse(0, 5, 26, 10).fill({ color: 0x000000, alpha: 0.15 });
  g.poly([-hw * sign, 0, 0, hh, 0, hh - H, -hw * sign, -H]).fill({ color: shade(car.color, 0.72) });
  g.poly([hw * sign, 0, 0, hh, 0, hh - H, hw * sign, -H]).fill({ color: shade(car.color, 0.85) });
  g.poly([0, -hh - H, hw * sign, -H, 0, hh - H, -hw * sign, -H])
    .fill({ color: car.color })
    .stroke({ width: 1, color: OUTLINE, alpha: 0.4 });
  g.poly([0, -hh - H + 3, hw * 0.5 * sign, -H, 0, hh - H - 3, -hw * 0.5 * sign, -H]).fill({
    color: 0xdfe6ee,
    alpha: 0.5,
  });
  return place(car.cell, g);
}
