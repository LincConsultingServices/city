// Pure Pixi scene builders for the Café — no React, no store, no ticker. Given a
// baked texture set they return containers the canvas can drop into its layer
// graph. Placement follows the city's own conventions exactly (world/CityCanvas
// .tsx §makeProp): anchor (0.5, 1) at `mapToWorld(cell) + TILE_H/2`, depth via
// `zIndex = cell.x + cell.y` plus a per-class epsilon.
import { Container, Graphics, Polygon, Sprite, Text } from "pixi.js";
import { TILE_H, TILE_W, mapToWorld } from "@/lib/iso";
import { CAFE_PALETTE, shade, type CafeTextures } from "./props";
import { PROP_SPRITE } from "./assets";
import {
  FURNITURE,
  GATES,
  NEAR_EDGE,
  ROOM_H,
  ROOM_W,
  SIGNS,
  type Gate,
  type PropKind,
  type Sign,
} from "./room";

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
/**
 * The cast sort just behind the player, so when you walk onto the cell somebody
 * is standing on it is you in front — the room should never hide you from
 * yourself.
 */
export const Z_CAST = 0.55;

function place(sprite: Sprite, cx: number, cy: number): Sprite {
  const w = mapToWorld(cx, cy);
  sprite.anchor.set(0.5, 1);
  sprite.position.set(w.x, w.y + TILE_H / 2);
  return sprite;
}

/**
 * The whole floor as a single Graphics: one filled diamond, a warm pool drawn
 * into it, and grid seams for scale.
 *
 * It used to be ROOM_W × ROOM_H individual Sprites (120 of them) in a sorted
 * container, plus a separate warmth Sprite with a Graphics mask on top. That
 * shape only earns its keep if tiles differ from each other or need to y-sort —
 * a flat single-colour surface under everything does neither. One Graphics is
 * one geometry and one draw call, the sorted container is gone, the mask's
 * stencil pass is gone, and two baked textures no longer exist to allocate or
 * dispose.
 *
 * The pool is clipped for free here: we only ever draw inside the floor's own
 * polygons, so nothing can spill onto the dark surround the way the masked
 * sprite did.
 */
export function buildFloor(): Graphics {
  const g = new Graphics();

  // Outer edge of the floor: the four corners of the room's diamond.
  const t = mapToWorld(0, 0);
  const r = mapToWorld(ROOM_W - 1, 0);
  const b = mapToWorld(ROOM_W - 1, ROOM_H - 1);
  const l = mapToWorld(0, ROOM_H - 1);
  g.poly([
    t.x,
    t.y - TILE_H / 2,
    r.x + TILE_W / 2,
    r.y,
    b.x,
    b.y + TILE_H / 2,
    l.x - TILE_W / 2,
    l.y,
  ]).fill(CAFE_PALETTE.floor);

  // The warm pool the room sits in — concentric diamonds shrinking toward the
  // middle. cafe.jpg is a lit island in a dark surround; an evenly-lit floor
  // reads flat however good the props are.
  const mid = mapToWorld((ROOM_W - 1) / 2, (ROOM_H - 1) / 2);
  for (let i = 10; i >= 1; i--) {
    const k = i / 10;
    g.poly([
      mid.x,
      mid.y - (ROOM_H + ROOM_W) * (TILE_H / 4) * k,
      mid.x + (ROOM_W + ROOM_H) * (TILE_W / 4) * k,
      mid.y,
      mid.x,
      mid.y + (ROOM_H + ROOM_W) * (TILE_H / 4) * k,
      mid.x - (ROOM_W + ROOM_H) * (TILE_W / 4) * k,
      mid.y,
    ]).fill({ color: CAFE_PALETTE.lamp, alpha: 0.022 });
  }

  // Grid seams, so the floor still has a sense of scale without a pattern
  // competing with the furniture. Half-cell offsets put them on tile edges.
  const seam = { color: CAFE_PALETTE.floorSeam, width: 1.5, alpha: 0.5 };
  for (let x = 0; x <= ROOM_W; x++) {
    const a = mapToWorld(x - 0.5, -0.5);
    const b = mapToWorld(x - 0.5, ROOM_H - 0.5);
    g.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke(seam);
  }
  for (let y = 0; y <= ROOM_H; y++) {
    const a = mapToWorld(-0.5, y - 0.5);
    const b = mapToWorld(ROOM_W - 0.5, y - 0.5);
    g.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke(seam);
  }

  return g;
}

export interface FurnitureLayer {
  /** Everything that y-sorts against the player. */
  root: Container;
  /** The counter flap: a hinged leaf over a half-door, drawn at any openness. */
  flap: FlapView;
  /**
   * The espresso machine, so the ambient layer can shake it when the grinder
   * runs. It is the hero prop and the one thing in the room loud enough to be
   * worth animating for a beat and a half (PRD §6).
   */
  machine: Sprite | null;
}

/**
 * Every prop in the room, plus the counter flap as a separately-addressable
 * hinged container. `root.sortableChildren` is on: Pixi re-sorts it each render,
 * which is what lets the player walk in front of and behind the furniture.
 */
export function buildFurniture(tex: CafeTextures): FurnitureLayer {
  const root = new Container();
  root.sortableChildren = true;
  let machine: Sprite | null = null;

  for (const p of FURNITURE) {
    const sprite = place(new Sprite(tex.prop[p.kind]), p.cell.x, p.cell.y);
    if (p.kind === "espresso_machine") machine = sprite;
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

  const flap = buildFlap(GATES[0]);
  root.addChild(flap.view);

  for (const s of SIGNS) root.addChild(buildSign(s));

  return { root, flap, machine };
}

/**
 * How far above its counter cell a sign hangs. Somebody working behind the
 * counter one cell to the left stands directly above the counter on screen, with
 * their head ~106px up — so the board hangs above that, or it hides their face.
 */
const SIGN_LIFT = 132;

/**
 * A board hanging over the counter, naming what happens beneath it. The room's
 * stations are where a customer's visit goes — order, collect, the kitchen — and
 * a player new to the room should be able to read that off the counter rather
 * than work it out from where people stand.
 */
function buildSign(sign: Sign): Container {
  const holder = new Container();
  const w = mapToWorld(sign.cell.x, sign.cell.y);
  holder.position.set(w.x, w.y - SIGN_LIFT);
  // In front of the counter it hangs over, behind anyone standing in front of it.
  holder.zIndex = sign.cell.x + sign.cell.y + 0.3;

  const label = new Text({
    text: sign.text,
    style: {
      fill: CAFE_PALETTE.cream,
      fontFamily: "Outfit, sans-serif",
      fontSize: 12,
      fontWeight: "700",
      letterSpacing: 1.5,
    },
    resolution: Math.max(2, Math.ceil(window.devicePixelRatio || 1) * 2),
  });
  label.anchor.set(0.5, 0.5);

  const padX = 9;
  const padY = 4;
  const bw = label.width + padX * 2;
  const bh = label.height + padY * 2;
  const board = new Graphics();
  // Two drop wires up to the ceiling, then a dark board with a brass edge.
  board.rect(-bw / 2 + 8, -bh / 2 - 26, 1.2, 26).fill({ color: CAFE_PALETTE.steel, alpha: 0.7 });
  board.rect(bw / 2 - 9, -bh / 2 - 26, 1.2, 26).fill({ color: CAFE_PALETTE.steel, alpha: 0.7 });
  board.roundRect(-bw / 2, -bh / 2, bw, bh, 4).fill(CAFE_PALETTE.espresso);
  board.roundRect(-bw / 2, -bh / 2, bw, bh, 4).stroke({ color: CAFE_PALETTE.brass, width: 1.5 });
  holder.addChild(board, label);
  return holder;
}

/** The counter flap, as the room animates it. */
export interface FlapView {
  view: Container;
  /** What you click to lift or lower it. Its hit area is the closed counter's shape. */
  hit: Graphics;
  /** 0 is down and shut, 1 is up and open; anything between is mid-swing. */
  setOpen(t: number): void;
}

/** Counter height, matching the counter run either side (props.ts §counter). */
const FLAP_H = 40;
/** How thick the lifting leaf is. */
const LEAF_T = 5;
/** Pixels of rise per map cell of leaf, so the leaf keeps its length as it lifts. */
const LEAF_RISE = 58;

/**
 * The counter flap, the way a real one works: the countertop over the gap is a
 * hinged leaf that folds back onto the counter beside it, and under it a
 * half-door swings in toward the staff side. Shut, the two read as one more
 * section of counter; open, there is a gap you can walk through.
 *
 * Drawn in map space and projected, rather than rotating a sprite, so the leaf
 * turns about its hinge in depth instead of the whole counter tipping over.
 * The hinge is the edge shared with the counter at x−1; the half-door hangs off
 * the customer-side corner of that same edge.
 */
function buildFlap(gate: Gate): FlapView {
  const view = new Container();
  const w = mapToWorld(gate.cell.x, gate.cell.y);
  view.position.set(w.x, w.y);
  view.zIndex = gate.cell.x + gate.cell.y;

  const hw = TILE_W / 2;
  const hh = TILE_H / 2;
  /** Map offset from the cell centre (mx, my) and height z → local pixels. */
  const at = (mx: number, my: number, z: number): [number, number] => [
    (mx - my) * hw,
    (mx + my) * hh - z,
  ];
  const flat = (pts: [number, number][]) => pts.flat();
  /** Twice the signed area: positive when the polygon winds clockwise on screen. */
  const winding = (pts: [number, number][]) => {
    let a = 0;
    for (let k = 0; k < pts.length; k++) {
      const [x1, y1] = pts[k];
      const [x2, y2] = pts[(k + 1) % pts.length];
      a += x1 * y2 - x2 * y1;
    }
    return a;
  };

  const P = CAFE_PALETTE;
  const g = new Graphics();
  // Clicks land on the shape of the closed counter, whatever the drawing is doing.
  g.hitArea = new Polygon(
    flat([
      at(-0.5, -0.5, FLAP_H),
      at(0.5, -0.5, FLAP_H),
      at(0.5, -0.5, 0),
      at(0.5, 0.5, 0),
      at(-0.5, 0.5, 0),
      at(-0.5, 0.5, FLAP_H),
    ]),
  );
  g.eventMode = "static";
  g.cursor = "pointer";
  view.addChild(g);

  // The closed top, for telling which way up the leaf is facing as it turns.
  const upright = winding([at(-0.5, -0.5, 0), at(0.5, -0.5, 0), at(0.5, 0.5, 0), at(-0.5, 0.5, 0)]);

  function setOpen(t: number): void {
    const open = Math.max(0, Math.min(1, t));
    g.clear();

    // The dark under the counter top, seen through the open side of the gap.
    // It fades as the leaf lifts and the light gets in.
    g.poly(
      flat([at(0.5, -0.5, FLAP_H), at(0.5, 0.5, FLAP_H), at(0.5, 0.5, 0), at(0.5, -0.5, 0)]),
    ).fill({ color: 0x000000, alpha: 0.32 * (1 - open) });

    // The half-door: hinged at the customer-side corner by the counter at x−1,
    // swinging in toward the staff side.
    const phi = open * (Math.PI / 2) * 0.96;
    const fx = -0.5 + Math.cos(phi);
    const fy = 0.5 - Math.sin(phi);
    const door = (u: number, v: number): [number, number] =>
      at(-0.5 + (fx + 0.5) * u, 0.5 + (fy - 0.5) * u, 2 + (FLAP_H - 6) * v);
    // Its customer-side face is lit; turned edge-on and past, it falls into shade.
    const doorShade = 0.95 - 0.33 * open;
    g.poly(flat([door(0, 0), door(1, 0), door(1, 1), door(0, 1)])).fill(
      shade(P.oxblood, doorShade),
    );
    // A brass-edged panel inset, and a kick plate along the bottom.
    g.poly(flat([door(0.14, 0.22), door(0.86, 0.22), door(0.86, 0.86), door(0.14, 0.86)])).stroke({
      color: P.brass,
      width: 1.5,
      alpha: 0.75,
    });
    g.poly(flat([door(0, 0), door(1, 0), door(1, 0.1), door(0, 0.1)])).fill({
      color: P.brass,
      alpha: 0.35,
    });

    // The leaf: the countertop over the gap, turning about the hinge edge and
    // folding right back to rest upside down on the counter beside it.
    const theta = open * Math.PI * 0.985;
    const c = Math.cos(theta);
    const sn = Math.sin(theta);
    /** A point on the leaf: `d` along it from the hinge, `my` across, `under` into it. */
    const leaf = (d: number, my: number, under = 0): [number, number] =>
      at(
        -0.5 + d * c + under * sn * (LEAF_T / LEAF_RISE),
        my,
        FLAP_H + d * sn * LEAF_RISE + ((1 - c) / 2) * LEAF_T - under * c * LEAF_T,
      );
    const top: [number, number][] = [leaf(0, -0.5), leaf(1, -0.5), leaf(1, 0.5), leaf(0, 0.5)];
    const under: [number, number][] = [
      leaf(0, -0.5, 1),
      leaf(1, -0.5, 1),
      leaf(1, 0.5, 1),
      leaf(0, 0.5, 1),
    ];
    // Edges first — the customer-side edge and the free end — then the face.
    g.poly(flat([top[3], top[2], under[2], under[3]])).fill(shade(P.oxblood, 0.78));
    g.poly(flat([top[1], top[2], under[2], under[1]])).fill(shade(P.oxblood, 0.6));
    const faceUp = Math.sign(winding(top)) === Math.sign(upright) && open < 0.5;
    if (faceUp) {
      g.poly(flat(top)).fill(shade(P.counterTop, 1.06 - 0.25 * open));
      // The brass strip along the free edge — the one detail that says "flap".
      g.poly(flat([leaf(0.92, -0.5), leaf(1, -0.5), leaf(1, 0.5), leaf(0.92, 0.5)])).fill({
        color: P.brass,
        alpha: 0.8,
      });
    } else {
      // The underside: bare wood and the hinge plates.
      g.poly(flat(under)).fill(shade(P.counterTop, 0.7));
      for (const y0 of [-0.36, 0.2]) {
        g.poly(
          flat([
            leaf(0, y0, 1),
            leaf(0.12, y0, 1),
            leaf(0.12, y0 + 0.16, 1),
            leaf(0, y0 + 0.16, 1),
          ]),
        ).fill({ color: P.steel, alpha: 0.9 });
      }
    }
  }

  setOpen(0);
  return { view, hit: g, setOpen };
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
