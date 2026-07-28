// Pure Pixi scene builders for MAISON — no React, no store, no ticker. Given a
// baked texture set they return containers the canvas drops into its layer
// graph. Placement follows the city's conventions (anchor 0.5/1 at
// `mapToWorld(cell) + TILE_H/2`, depth via `zIndex = cell.x + cell.y`).
//
// The one thing MAISON does that the Café does not: two levels. The atelier sits
// 0.9 m up (§3.1), which here is a lift on the y axis for anything standing on
// it. It is one volume, not two scenes — you can see the atelier from the floor,
// and that sightline is the reason the platform is raised rather than hidden
// (§3.2).
import { Container, Graphics, Sprite } from "pixi.js";
import { TILE_H, mapToWorld } from "@/lib/iso";
import type { Cell } from "@/lib/pathfinding";
import { GARMENT_NEUTRALS, MAISON_PALETTE, type MaisonTextures } from "./props";
import { FURNITURE, PLATFORM_EDGE_Y, PLATFORM_RISE_PX, ROOM_H, ROOM_W, levelAt } from "./room";
import { RAIL_SHAPE, type Rail } from "./world";

const Z_FLAT = -0.1; // the threshold, the ramp — under everything upright
const Z_LIGHT = -0.05; // the key light pool, over the floor and under the rail
export const Z_PLAYER = 0.6; // matches the city's own player offset

/** The lift a cell gets for standing on the raised platform. */
export const riseAt = (cell: Cell): number => (levelAt(cell) === "atelier" ? -PLATFORM_RISE_PX : 0);

function place(sprite: Sprite, cx: number, cy: number): Sprite {
  const w = mapToWorld(cx, cy);
  sprite.anchor.set(0.5, 1);
  sprite.position.set(w.x, w.y + TILE_H / 2 + riseAt({ x: cx, y: cy }));
  return sprite;
}

/**
 * The floor — two tones per level, so the boutique reads polished and pale and
 * the atelier reads like bare working board. Static, sorted once.
 */
export function buildFloor(tex: MaisonTextures): Container {
  const ground = new Container();
  ground.sortableChildren = true;
  for (let y = 0; y < ROOM_H; y++) {
    for (let x = 0; x < ROOM_W; x++) {
      const upstairs = y <= PLATFORM_EDGE_Y;
      const tone = (upstairs ? 2 : 0) + ((x + y) % 2);
      const tile = place(new Sprite(tex.floor[tone]), x, y);
      tile.zIndex = x + y;
      ground.addChild(tile);
    }
  }
  ground.sortChildren();
  return ground;
}

/**
 * §4's key light: the one pool of hard light in the building, over the rail. The
 * boutique is under-lit and the rail is over-lit — three lighting characters in
 * one volume, done with two flat shapes rather than a lighting model.
 */
export function buildKeyLight(): Container {
  const light = new Container();
  const g = new Graphics();
  const w = mapToWorld(5.5, 8.5);
  g.ellipse(w.x, w.y + TILE_H / 2, 150, 76).fill({ color: MAISON_PALETTE.bone, alpha: 0.16 });
  g.ellipse(w.x, w.y + TILE_H / 2, 92, 46).fill({ color: MAISON_PALETTE.bone, alpha: 0.14 });
  g.zIndex = 5.5 + 8.5 + Z_LIGHT;
  light.addChild(g);
  return light;
}

export interface RoomLayer {
  /** Everything that y-sorts against the player. */
  root: Container;
  /** The garments hanging on the rail, rebuilt whenever the season moves. */
  rail: Container;
}

export function buildRoom(tex: MaisonTextures): RoomLayer {
  const root = new Container();
  root.sortableChildren = true;

  for (const p of FURNITURE) {
    const sprite = place(new Sprite(tex.prop[p.kind]), p.cell.x, p.cell.y);
    const base = p.cell.x + p.cell.y;
    sprite.zIndex = p.blocking ? base : base + Z_FLAT;
    root.addChild(sprite);
  }

  const rail = new Container();
  rail.sortableChildren = true;
  root.addChild(rail);

  return { root, rail };
}

/**
 * Hang the season on the rail (§3.3). The rail is the building's primary
 * readout: eight vermilion is the house, mostly-neutral is a house that followed
 * its numbers, four pieces is a house that could not fund the rest.
 *
 * It reports and never judges — every state is drawn in the same light, at the
 * same size, on the same brass. Nothing here marks one as better.
 */
export function dressRail(rail: Container, tex: MaisonTextures, state: Rail): void {
  rail.removeChildren().forEach((c) => c.destroy());

  const pieces = RAIL_SHAPE[state].pieces;
  // Two cells of rail, so the garments spread across both and read as a run.
  const cells: Cell[] = [
    { x: 5, y: 8 },
    { x: 6, y: 8 },
  ];
  let i = 0;
  for (const [count, label] of pieces) {
    for (let n = 0; n < count; n++, i++) {
      const cell = cells[i % cells.length];
      const color =
        label === "vermilion"
          ? MAISON_PALETTE.vermilion
          : GARMENT_NEUTRALS[i % GARMENT_NEUTRALS.length];
      const sprite = place(new Sprite(tex.garment(color)), cell.x, cell.y);
      // Fan them along the rail so eight pieces read as eight, not as one.
      sprite.position.x += (Math.floor(i / cells.length) - 2) * 9;
      sprite.zIndex = cell.x + cell.y + 0.1 + i * 0.001;
      rail.addChild(sprite);
    }
  }
}
