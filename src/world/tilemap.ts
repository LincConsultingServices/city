// Ground layer — district-tinted blocks, an asphalt road network with lane
// markings, and light sidewalks bordering the roads (PRD §6.1). Procedural (Pixi
// Graphics), data-driven from cityMap. Real sprite props layer on top (props.ts).

import { Container, Graphics } from 'pixi.js';
import { mapToWorld, TILE_W, TILE_H } from '@/lib/iso';
import { GRID_W, GRID_H, districtGround, isRoad, roadKind } from './cityMap';

const OUTLINE = 0x2f333b;
const ROAD = 0x3b4048;
const ROAD_EDGE = 0x2b2f36;
const SIDEWALK = 0xe6e9ef;
const LANE = 0xe8c860;

const neighborsRoad = (x: number, y: number) =>
  isRoad(x - 1, y) || isRoad(x + 1, y) || isRoad(x, y - 1) || isRoad(x, y + 1);

export function buildGround(): Container {
  const container = new Container();
  const g = new Graphics();
  const hw = TILE_W * 0.5;
  const hh = TILE_H * 0.5;

  for (let y = 0; y < GRID_H; y++) {
    for (let x = 0; x < GRID_W; x++) {
      const p = mapToWorld({ x, y });
      const diamond = [p.x, p.y - hh, p.x + hw, p.y, p.x, p.y + hh, p.x - hw, p.y];
      const rk = roadKind(x, y);

      if (rk) {
        g.poly(diamond).fill({ color: ROAD }).stroke({ width: 1, color: ROAD_EDGE, alpha: 0.5 });
        if (rk === 'h') {
          g.moveTo(p.x - 44, p.y - 22)
            .lineTo(p.x + 44, p.y + 22)
            .stroke({ width: 3, color: LANE, alpha: 0.85 });
        } else if (rk === 'v') {
          g.moveTo(p.x + 44, p.y - 22)
            .lineTo(p.x - 44, p.y + 22)
            .stroke({ width: 3, color: LANE, alpha: 0.85 });
        } else {
          // intersection — a small stone centre
          g.circle(p.x, p.y, 8).fill({ color: 0x4a5058 });
        }
        continue;
      }

      const gc = districtGround(x, y);
      const color = neighborsRoad(x, y) ? SIDEWALK : (x + y) % 2 === 0 ? gc.base : gc.alt;
      g.poly(diamond).fill({ color }).stroke({ width: 1, color: OUTLINE, alpha: 0.1 });
    }
  }

  container.addChild(g);
  container.eventMode = 'none';
  return container;
}
