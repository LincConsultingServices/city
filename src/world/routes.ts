// Deterministic ambient routes — pure map math (no Pixi) so it's unit-testable.
// NPC pedestrians walk closed loops around block perimeters, the same corner
// style the ambient cars use; seeding keeps the street life identical run-to-run.
import type { Cell } from "@/lib/pathfinding";
import { mulberry32 } from "@/lib/rng";
import { BLOCK, BLOCKS } from "./cityMap";

/** Closed loop of the 4 road corners around block (bc,br). */
export function blockPerimeter(bc: number, br: number): Cell[] {
  const x0 = bc * BLOCK;
  const y0 = br * BLOCK;
  const x1 = (bc + 1) * BLOCK;
  const y1 = (br + 1) * BLOCK;
  return [
    { x: x0, y: y0 },
    { x: x1, y: y0 },
    { x: x1, y: y1 },
    { x: x0, y: y1 },
  ];
}

export interface NpcRoute {
  loop: Cell[];
  startLeg: number;
  startT: number; // 0..1 along the starting leg
  speed: number; // cells/sec
  reverse: boolean; // walk the loop counter-clockwise
}

/** Spread `count` pedestrians across distinct blocks (reusing blocks only once
 * all 16 are taken), each with a seeded start point, pace and direction. */
export function npcRoutes(count: number, seed: number): NpcRoute[] {
  const rand = mulberry32(seed);
  const blocks: Array<[number, number]> = [];
  for (let br = 0; br < BLOCKS; br++) {
    for (let bc = 0; bc < BLOCKS; bc++) blocks.push([bc, br]);
  }
  for (let i = blocks.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [blocks[i], blocks[j]] = [blocks[j], blocks[i]];
  }
  const routes: NpcRoute[] = [];
  for (let i = 0; i < count; i++) {
    const [bc, br] = blocks[i % blocks.length];
    routes.push({
      loop: blockPerimeter(bc, br),
      startLeg: Math.floor(rand() * 4),
      startT: rand(),
      speed: 0.5 + rand() * 0.3,
      reverse: rand() < 0.5,
    });
  }
  return routes;
}
