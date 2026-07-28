// The Café's look — procedural. Every prop is drawn once with vector Graphics and
// baked to a texture (renderer.generateTexture), the same technique the city uses
// for its people (world/characterArt.ts) and its sky. No binary assets, so the
// room ships without waiting on an art pipeline; PROP_SPRITE is the seam where a
// real sprite takes over per-kind (cafedev.md §7 phase 3).
//
// Palette and prop list are read off cafe.jpg: warm wood, oxblood, cream, and a
// black-and-white checkered floor, all sitting in a dark surround.
import { Graphics, Texture, type Renderer } from "pixi.js";
import { TILE_W, TILE_H } from "@/lib/iso";
import type { PropKind } from "./room";

const HW = TILE_W / 2; // 66 — half a tile diamond, on the x axis
const HH = TILE_H / 2; // 33 — half a tile diamond, on the y axis

export const CAFE_PALETTE = {
  /** Beyond the walls. The room is a lit island in this. */
  void: 0x140f10,
  floorLight: 0xd8cfc4,
  floorDark: 0x2e2a2c,
  wallPlank: 0x8a6242,
  wallPlankLine: 0x6e4c33,
  oxblood: 0x96453f,
  counterTop: 0xb5836a,
  woodDark: 0x5c3a28,
  woodMid: 0x7a4f36,
  cream: 0xe8dfd0,
  steel: 0xcfcbc2,
  espresso: 0x3a3134,
  green: 0x4e7a3c,
  brass: 0xc9a227,
  glass: 0x9fb7bd,
} as const;

/** Darken a hex colour by `k` (1 = unchanged). Used for the two side faces. */
function shade(color: number, k: number): number {
  const r = Math.round(((color >> 16) & 0xff) * k);
  const g = Math.round(((color >> 8) & 0xff) * k);
  const b = Math.round((color & 0xff) * k);
  return (r << 16) | (g << 8) | b;
}

const LEFT_FACE = 0.74;
const RIGHT_FACE = 0.56;

/**
 * Every prop bakes against the same invisible full-tile box, so `anchor(0.5, 1)`
 * always lands on the tile's bottom vertex no matter how tall or small the prop
 * is. Without this pin each texture would anchor to its own bounds and the room
 * would jitter between prop sizes.
 */
function pin(g: Graphics): Graphics {
  return g.rect(-HW, -HH, TILE_W, TILE_H).fill({ color: 0x000000, alpha: 0 });
}

/** A box standing on the tile: `f` is its footprint as a fraction of the tile. */
function isoBox(g: Graphics, f: number, h: number, color: number, topColor = color): Graphics {
  const w = HW * f;
  const d = HH * f;
  // Left face, then right, then the top — painter's order within one prop.
  g.poly([-w, -h, 0, d - h, 0, d, -w, 0]).fill(shade(color, LEFT_FACE));
  g.poly([0, d - h, w, -h, w, 0, 0, d]).fill(shade(color, RIGHT_FACE));
  g.poly([0, -d - h, w, -h, 0, d - h, -w, -h]).fill(topColor);
  return g;
}

/** A flat diamond lying on the floor: rugs, mats, the floor itself. */
function isoFlat(g: Graphics, f: number, color: number, alpha = 1): Graphics {
  const w = HW * f;
  const d = HH * f;
  g.poly([0, -d, w, 0, 0, d, -w, 0]).fill({ color, alpha });
  return g;
}

// ── Individual props ──────────────────────────────────────────────────────────

const P = CAFE_PALETTE;

function drawProp(kind: PropKind): Graphics {
  const g = pin(new Graphics());

  switch (kind) {
    case "wall_plank":
      return wall(g);

    case "wall_sill":
      // Knee-high: it bounds the near edge of the room without ever standing
      // between the camera and someone walking along the front.
      isoBox(g, 1, 16, P.wallPlank, shade(P.wallPlank, 1.1));
      return g;

    case "wall_window": {
      wall(g);
      // Blind-slatted window, hung on the right face where the camera sees it.
      g.poly([2, -74, 52, -50, 52, -18, 2, -42]).fill(shade(P.glass, 0.8));
      for (let i = 0; i < 5; i++) {
        const t = -70 + i * 7;
        g.poly([4, t, 50, t + 22, 50, t + 25, 4, t + 3]).fill({ color: P.cream, alpha: 0.55 });
      }
      return g;
    }

    case "wall_menu": {
      wall(g);
      g.poly([4, -72, 48, -50, 48, -20, 4, -42]).fill(P.espresso);
      for (let i = 0; i < 4; i++) {
        const t = -66 + i * 8;
        g.poly([10, t, 40, t + 15, 40, t + 17, 10, t + 2]).fill({ color: P.cream, alpha: 0.5 });
      }
      return g;
    }

    case "wall_art": {
      wall(g);
      g.poly([8, -68, 40, -52, 40, -28, 8, -44]).fill(P.brass);
      g.poly([12, -64, 36, -52, 36, -32, 12, -44]).fill(shade(P.green, 0.9));
      return g;
    }

    case "stairs": {
      // A flight climbing away from the camera — decorative, never walked.
      for (let i = 0; i < 5; i++) {
        const h = 18 + i * 18;
        const off = -i * 6;
        g.poly([off - HW, -h, off, HH - h, off, HH - h + 16, off - HW, -h + 16]).fill(
          shade(P.woodDark, LEFT_FACE),
        );
        g.poly([off, HH - h, off + HW, -h, off + HW, -h + 16, off, HH - h + 16]).fill(
          shade(P.woodDark, RIGHT_FACE),
        );
        g.poly([off, -HH - h, off + HW, -h, off, HH - h, off - HW, -h]).fill(P.woodMid);
      }
      return g;
    }

    case "counter":
      isoBox(g, 1, 40, P.oxblood);
      isoFlatAt(g, 1, P.counterTop, -40);
      return g;

    case "flap":
      // Same body as the counter run, drawn a touch lighter so the break in the
      // line reads before you are close enough for the prompt.
      isoBox(g, 1, 40, shade(P.oxblood, 1.18));
      isoFlatAt(g, 1, shade(P.counterTop, 1.1), -40);
      g.poly([-HW + 6, -40, 0, HH - 46, HW - 6, -40, 0, -HH - 34]).stroke({
        color: P.brass,
        width: 2,
        alpha: 0.8,
      });
      return g;

    case "stool": {
      isoBox(g, 0.34, 24, P.oxblood);
      isoFlatAt(g, 0.42, shade(P.oxblood, 1.25), -24);
      return g;
    }

    case "table": {
      leg(g, -12, 4);
      leg(g, 12, 4);
      isoBox(g, 0.72, 30, P.woodDark, P.woodMid);
      return g;
    }

    case "chair": {
      isoBox(g, 0.36, 20, P.woodDark, P.woodMid);
      // Back rest, angled toward the camera's right face.
      g.poly([2, -20, 20, -10, 20, -34, 2, -44]).fill(shade(P.woodDark, 0.85));
      return g;
    }

    case "dresser":
      isoBox(g, 0.92, 52, P.oxblood, P.woodMid);
      for (let i = 0; i < 2; i++) {
        const t = -44 + i * 18;
        g.poly([6, t, 52, t + 24, 52, t + 34, 6, t + 10]).fill(shade(P.oxblood, 0.46));
        g.circle(30, t + 21, 2).fill(P.brass);
      }
      return g;

    case "jukebox": {
      isoBox(g, 0.62, 76, P.woodDark, P.woodMid);
      // Lit arch — the one warm glow on the far wall.
      g.poly([-2, -78, 26, -64, 26, -34, -2, -48]).fill(shade(P.brass, 0.75));
      g.poly([-2, -70, 20, -59, 20, -41, -2, -52]).fill({ color: P.cream, alpha: 0.65 });
      return g;
    }

    case "radiator": {
      isoBox(g, 0.72, 26, P.steel);
      for (let i = 0; i < 5; i++) {
        const o = -18 + i * 9;
        g.poly([o, -26, o + 4, -24, o + 4, -4, o, -6]).fill(shade(P.steel, 0.7));
      }
      return g;
    }

    case "plant": {
      isoBox(g, 0.3, 14, P.oxblood);
      g.ellipse(0, -30, 17, 13).fill(P.green);
      g.ellipse(-8, -38, 11, 9).fill(shade(P.green, 1.2));
      g.ellipse(9, -36, 10, 8).fill(shade(P.green, 0.82));
      return g;
    }

    case "rug_persian":
      // Drawn slightly under a tile so the four rug cells read as one carpet.
      isoFlat(g, 1, P.oxblood);
      isoFlat(g, 0.72, shade(P.oxblood, 0.7));
      isoFlat(g, 0.34, P.brass, 0.5);
      return g;

    case "rug_oval":
      isoFlat(g, 0.9, P.woodMid);
      isoFlat(g, 0.62, shade(P.oxblood, 0.9));
      isoFlat(g, 0.32, shade(P.woodMid, 1.15));
      return g;

    case "door_mat":
      isoFlat(g, 0.8, P.espresso);
      isoFlat(g, 0.58, shade(P.espresso, 1.5));
      return g;

    // ── Overlays: drawn on a host cell without claiming it ──
    case "pastry_case": {
      isoBox(g, 0.68, 30, P.woodMid);
      isoBox(g, 0.6, 56, P.glass, shade(P.glass, 1.1));
      g.poly([-24, -46, 0, -34, 24, -46]).stroke({ color: P.cream, width: 2, alpha: 0.6 });
      return g;
    }

    case "espresso_machine": {
      isoBox(g, 0.6, 36, P.espresso, shade(P.steel, 0.9));
      g.poly([-4, -38, 22, -25, 22, -12, -4, -25]).fill(shade(P.steel, 0.95));
      g.circle(10, -26, 3).fill(P.brass);
      return g;
    }

    case "till":
      isoBox(g, 0.34, 18, P.espresso, P.steel);
      g.poly([-2, -20, 12, -13, 12, -4, -2, -11]).fill(shade(P.steel, 0.8));
      return g;
  }
}

/** The plank back/front wall: a tall slab with horizontal board lines. */
function wall(g: Graphics): Graphics {
  isoBox(g, 1, 84, P.wallPlank, shade(P.wallPlank, 0.9));
  for (let i = 0; i < 6; i++) {
    const t = -78 + i * 13;
    g.poly([-HW, t, 0, t + HH, 0, t + HH + 2, -HW, t + 2]).fill(P.wallPlankLine);
    g.poly([0, t + HH, HW, t, HW, t + 2, 0, t + HH + 2]).fill(shade(P.wallPlankLine, 0.8));
  }
  return g;
}

/** A flat diamond raised to `y` — table tops, counter tops. */
function isoFlatAt(g: Graphics, f: number, color: number, y: number): Graphics {
  const w = HW * f;
  const d = HH * f;
  g.poly([0, -d + y, w, y, 0, d + y, -w, y]).fill(color);
  return g;
}

function leg(g: Graphics, x: number, y: number): Graphics {
  return g.rect(x - 2, y - 26, 4, 26).fill(shade(P.woodDark, 0.55));
}

// ── Baking ────────────────────────────────────────────────────────────────────

export interface CafeTextures {
  prop: Record<PropKind, Texture>;
  /** Checkered floor, indexed by `(x + y) % 2`. */
  floor: [Texture, Texture];
  /** Every unique texture, for disposal on unmount. */
  all: Texture[];
}

const ALL_KINDS: PropKind[] = [
  "wall_plank",
  "wall_window",
  "wall_menu",
  "wall_art",
  "wall_sill",
  "stairs",
  "counter",
  "flap",
  "stool",
  "table",
  "chair",
  "dresser",
  "jukebox",
  "radiator",
  "plant",
  "rug_persian",
  "rug_oval",
  "door_mat",
  "pastry_case",
  "espresso_machine",
  "till",
];

function bake(renderer: Renderer, g: Graphics): Texture {
  const texture = renderer.generateTexture({ target: g, resolution: 2 });
  g.destroy();
  return texture;
}

function drawFloor(dark: boolean): Graphics {
  const g = pin(new Graphics());
  isoFlat(g, 1, dark ? P.floorDark : P.floorLight);
  isoFlat(g, 1, 0x000000, 0.06);
  isoFlat(g, 0.96, dark ? P.floorDark : P.floorLight);
  return g;
}

export function bakeCafeTextures(renderer: Renderer): CafeTextures {
  const all: Texture[] = [];
  const prop = {} as Record<PropKind, Texture>;
  for (const kind of ALL_KINDS) {
    const t = bake(renderer, drawProp(kind));
    prop[kind] = t;
    all.push(t);
  }
  const floor: [Texture, Texture] = [
    bake(renderer, drawFloor(false)),
    bake(renderer, drawFloor(true)),
  ];
  all.push(...floor);
  return { prop, floor, all };
}
