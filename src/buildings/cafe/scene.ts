// Pure Pixi scene builders for the Café — no React, no store, no ticker. Given a
// baked texture set they return containers the canvas can drop into its layer
// graph. Placement follows the city's own conventions exactly (world/CityCanvas
// .tsx §makeProp): anchor (0.5, 1) at `mapToWorld(cell) + TILE_H/2`, depth via
// `zIndex = cell.x + cell.y` plus a per-class epsilon.
import { Container, Graphics, Sprite } from "pixi.js";
import { TILE_H, TILE_W, mapToWorld } from "@/lib/iso";
import type { CafeTextures } from "./props";
import { PROP_SPRITE } from "./assets";
import { FURNITURE, GATES, NEAR_EDGE, ROOM_H, ROOM_W, type Gate, type PropKind } from "./room";

/** Depth offsets, so props sharing a cell stack in a sensible order. */
const Z_FLAT = -0.1; // rugs and the doormat, under everything upright
const Z_OVERLAY = 0.2; // the pastry case in front of its wall
/**
 * The near-edge sills sort *behind* everything on their own row. They are the
 * frontmost row in the room, so by depth alone they would clip the feet of
 * anyone standing along the front — and there is nothing between them and the
 * camera for them to occlude anyway.
 */
const Z_NEAR_EDGE = -0.5;
export const Z_PLAYER = 0.6; // matches the city's own player offset

function place(sprite: Sprite, cx: number, cy: number): Sprite {
  const w = mapToWorld(cx, cy);
  sprite.anchor.set(0.5, 1);
  sprite.position.set(w.x, w.y + TILE_H / 2);
  return sprite;
}

/**
 * The checkered floor. Static, so it goes in its own container sorted once —
 * the same split the city uses between `ground` and `actors`.
 */
export function buildFloor(tex: CafeTextures): Container {
  const ground = new Container();
  ground.sortableChildren = true;
  for (let y = 0; y < ROOM_H; y++) {
    for (let x = 0; x < ROOM_W; x++) {
      const tile = place(new Sprite(tex.floor[(x + y) % 2]), x, y);
      tile.zIndex = x + y;
      ground.addChild(tile);
    }
  }
  ground.sortChildren();
  return ground;
}

/**
 * The warm pool of light, laid over the floor and under everything upright.
 * Additive and low-alpha, so it lifts the middle of the room without washing the
 * checkerboard out — cafe.jpg is a lit island, not an evenly-lit box.
 */
export function buildWarmth(tex: CafeTextures): Container {
  const layer = new Container();

  const glow = new Sprite(tex.warmth);
  glow.anchor.set(0.5);
  glow.blendMode = "add";
  glow.alpha = 0.85;
  const mid = mapToWorld((ROOM_W - 1) / 2, (ROOM_H - 1) / 2);
  glow.position.set(mid.x, mid.y);
  glow.width = (ROOM_W + ROOM_H) * TILE_W * 0.42;
  glow.height = (ROOM_W + ROOM_H) * TILE_H * 0.52;

  // Clipped to the floor. A soft pool is wide by nature, and unmasked it spills
  // past the walls as a halo floating on the dark surround outside the room.
  const top = mapToWorld(0, 0);
  const right = mapToWorld(ROOM_W - 1, 0);
  const bottom = mapToWorld(ROOM_W - 1, ROOM_H - 1);
  const left = mapToWorld(0, ROOM_H - 1);
  const mask = new Graphics()
    .poly([
      top.x,
      top.y - TILE_H / 2,
      right.x + TILE_W / 2,
      right.y,
      bottom.x,
      bottom.y + TILE_H / 2,
      left.x - TILE_W / 2,
      left.y,
    ])
    .fill(0xffffff);

  layer.addChild(glow, mask);
  glow.mask = mask;
  return layer;
}

export interface FurnitureLayer {
  /** Everything that y-sorts against the player. */
  root: Container;
  /** The flap, wrapped so it can swing about its hinge. */
  flap: Container;
}

/**
 * Every prop in the room, plus the counter flap as a separately-addressable
 * hinged container. `root.sortableChildren` is on: Pixi re-sorts it each render,
 * which is what lets the player walk in front of and behind the furniture.
 */
export function buildFurniture(tex: CafeTextures): FurnitureLayer {
  const root = new Container();
  root.sortableChildren = true;

  for (const p of FURNITURE) {
    const sprite = place(new Sprite(tex.prop[p.kind]), p.cell.x, p.cell.y);
    fitSprite(sprite, p.kind);
    const base = p.cell.x + p.cell.y;
    sprite.zIndex = NEAR_EDGE.has(p.kind)
      ? base + Z_NEAR_EDGE
      : p.overlay
        ? base + Z_OVERLAY
        : p.blocking
          ? base
          : base + Z_FLAT;
    root.addChild(sprite);
  }

  const flap = buildFlap(tex, GATES[0]);
  root.addChild(flap);

  return { root, flap };
}

/**
 * The counter flap. The sprite hangs off a container parked on the diamond's
 * left corner, so rotating the container swings the free end up — a hinge, not a
 * sprite spinning about its middle. Closed is rotation 0.
 */
function buildFlap(tex: CafeTextures, gate: Gate): Container {
  const hinge = new Container();
  const w = mapToWorld(gate.cell.x, gate.cell.y);
  hinge.position.set(w.x - TILE_W / 2, w.y);
  hinge.zIndex = gate.cell.x + gate.cell.y;

  const sprite = new Sprite(tex.prop.flap);
  sprite.anchor.set(0.5, 1);
  sprite.position.set(TILE_W / 2, TILE_H / 2);
  sprite.eventMode = "static";
  sprite.cursor = "pointer";
  hinge.addChild(sprite);

  return hinge;
}

/**
 * Procedural bakes already come out tile-sized; a real sprite arrives at its own
 * native resolution, so it has to be scaled to the width the layout expects.
 */
function fitSprite(sprite: Sprite, kind: PropKind): void {
  const spec = PROP_SPRITE[kind];
  if (!spec || !sprite.texture.width) return;
  sprite.scale.set(spec.width / sprite.texture.width);
}

/** How far the flap swings when it is up. Negative lifts the free end. */
export const FLAP_OPEN_ROTATION = -0.95;
