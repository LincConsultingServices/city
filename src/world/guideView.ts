// The guide arrow and the destination beacon — the world half of the map.
//
// A small gold chevron circles the player's feet and points along the walking
// route to wherever they marked on the map, a few steps ahead so it leads round
// buildings rather than through them. Where they are going gets a soft pulsing
// ring on the ground and a pin bobbing over it.
//
// Both are deliberately quiet: small, warm rather than bright, with motion kept
// to a slow pulse, and tied to the ground — the arrow circles the player's feet
// on the ground plane and the ring lies flat on the street — so they read as
// part of the street instead of as UI stuck to the screen. They sit in the fx
// layer, above the night tint, so they stay legible after dark without getting
// louder.
import { Container, Graphics } from "pixi.js";
import { TILE_H, TILE_W, mapToWorld } from "@/lib/iso";
import type { Cell } from "@/lib/pathfinding";
import { guideTarget, hasArrived, routeTo, type Destination } from "./navigation";

const GOLD = 0xffc65c;
const INK = 0x2a2116;
/** How far from the player's feet the arrow circles, in ground-plane pixels. */
const ORBIT = 38;
/** How quickly the arrow swings round to a new heading. */
const TURN_RATE = 9;
/** The ground plane is squashed by the iso projection; this un-squashes headings. */
const SQUASH = TILE_H / TILE_W;

export interface GuideView {
  /** Add to the fx layer. */
  view: Container;
  /**
   * Call every frame. `onArrive` fires once, when the player reaches the
   * destination — the caller clears it.
   */
  update(
    dtS: number,
    elapsed: number,
    player: { x: number; y: number },
    at: Cell,
    dest: Destination | null,
    onArrive: (dest: Destination) => void,
  ): void;
  /** The current route, start cell included — for walking it on request. */
  route(): readonly Cell[];
}

export function createGuide(reduced: boolean): GuideView {
  const view = new Container();

  // The arrow circles the player's feet on the ground plane, but is drawn at
  // its full shape facing its on-screen heading: squashed flat as well, a
  // chevron this small turned into a sliver against the grass. A pale outline
  // and a soft shadow keep it readable on grass, paving and road alike.
  const plane = new Container();
  const arrow = new Container();
  const CHEVRON = [-11, -11, 13, 0, -11, 11, -4, 0];
  const shadow = new Graphics().poly(CHEVRON).fill({ color: INK, alpha: 0.28 });
  shadow.position.set(1.5, 2.5);
  const body = new Graphics()
    .poly(CHEVRON)
    .fill({ color: GOLD, alpha: 0.95 })
    .stroke({ color: 0xfff6e0, width: 2, alpha: 0.9, join: "round" });
  arrow.addChild(shadow, body);
  plane.addChild(arrow);
  view.addChild(plane);

  // The beacon: a ring on the ground, and a pin standing over it.
  const beacon = new Container();
  const ringPlane = new Container();
  ringPlane.scale.y = SQUASH;
  const ring = new Graphics();
  ring.circle(0, 0, 30).stroke({ color: GOLD, width: 3, alpha: 0.85 });
  ring.circle(0, 0, 30).fill({ color: GOLD, alpha: 0.12 });
  ringPlane.addChild(ring);
  const pin = new Graphics();
  pin
    .poly([0, 0, -7, -12, 0, -24, 7, -12])
    .fill({ color: GOLD, alpha: 0.95 })
    .stroke({ color: INK, width: 1.5, alpha: 0.5 });
  pin.circle(0, -12, 2.6).fill({ color: INK, alpha: 0.55 });
  beacon.addChild(ringPlane, pin);
  view.addChild(beacon);

  plane.visible = false;
  beacon.visible = false;

  let heading = 0;
  let headingSet = false;
  let route: Cell[] = [];
  let routedFrom = "";
  let routedTo: Destination | null = null;

  return {
    view,
    route: () => route,

    update(dtS, elapsed, player, at, dest, onArrive) {
      if (!dest) {
        plane.visible = false;
        beacon.visible = false;
        headingSet = false;
        routedTo = null;
        return;
      }

      if (hasArrived(at, dest)) {
        plane.visible = false;
        beacon.visible = false;
        onArrive(dest);
        return;
      }

      // Re-route only when the player changes cell or the destination changes —
      // A* on a 45×45 grid is cheap, but not free sixty times a second.
      const from = `${at.x},${at.y}`;
      if (from !== routedFrom || dest !== routedTo) {
        route = routeTo(at, dest);
        routedFrom = from;
        routedTo = dest;
      }

      // Heading, measured on the ground plane rather than on screen.
      const target = guideTarget(route, dest);
      const t = mapToWorld(target.x, target.y);
      const want = Math.atan2((t.y - player.y) / SQUASH, t.x - player.x);
      if (!headingSet || reduced) {
        heading = want;
        headingSet = true;
      } else {
        let delta = want - heading;
        delta = Math.atan2(Math.sin(delta), Math.cos(delta));
        heading += delta * Math.min(1, dtS * TURN_RATE);
      }

      // A gentle forward nudge so it reads as "this way", never a flashing light.
      const nudge = reduced ? 0 : 3 * Math.max(0, Math.sin(elapsed * 3));
      plane.position.set(player.x, player.y);
      // Its spot on the ground ring, projected; its rotation, the same heading
      // as seen on screen.
      const gx = Math.cos(heading);
      const gy = Math.sin(heading) * SQUASH;
      arrow.position.set(gx * (ORBIT + nudge), gy * (ORBIT + nudge));
      arrow.rotation = Math.atan2(gy, gx);
      plane.visible = true;

      const d = mapToWorld(dest.cell.x, dest.cell.y);
      beacon.position.set(d.x, d.y);
      const pulse = reduced ? 1 : 1 + 0.12 * Math.sin(elapsed * 2.4);
      ring.scale.set(pulse);
      ring.alpha = reduced ? 1 : 0.75 + 0.25 * Math.sin(elapsed * 2.4);
      pin.position.y = reduced ? -6 : -6 - 4 * Math.abs(Math.sin(elapsed * 2));
      beacon.visible = true;
    },
  };
}
