// MAISON's look — procedural, the same technique the Café uses: every prop is
// drawn once with vector Graphics and baked to a texture, so the room ships
// without waiting on the §17 art pipeline. PROP_SPRITE is the seam where real
// art takes over per kind.
//
// docs/maison.md §4: bone, ash, raw plaster, pale oak, brushed brass, black
// steel — and ONE saturated colour, vermilion, which appears only on the rail.
// When the rail goes neutral the building loses its only warm hue, which is the
// emotional content of the C2 decision delivered without a word. That rule is
// enforced in props.test.ts, because it is the whole art direction in one line.
import { Graphics, Texture, type Renderer } from "pixi.js";
import { TILE_W, TILE_H } from "@/lib/iso";
import type { PropKind } from "./room";

const HW = TILE_W / 2;
const HH = TILE_H / 2;

export const MAISON_PALETTE = {
  /** Beyond the walls. The room is a cold lit island in this. */
  void: 0x0e0e10,
  /** The boutique floor: polished, pale, and deliberately under-lit. */
  floorPolish: 0xb8b2a8,
  floorPolishAlt: 0xb2aca2,
  /** The atelier floor: bare board, warmer, working. */
  floorBoard: 0x9c8f7c,
  floorBoardAlt: 0x968979,
  plaster: 0xd6d0c6,
  plasterDeep: 0xb9b2a6,
  ash: 0x8c8880,
  bone: 0xe6e0d4,
  oak: 0xc0a781,
  brass: 0xb08d4f,
  steel: 0x3a3c40,
  glass: 0xa8bcc0,
  /** North light through the tall atelier windows. Cool, and the only honest light. */
  northLight: 0xdfe7ea,
  chalk: 0xe8e4d8,
  /** The house. Only ever on a garment. */
  vermilion: 0xd6421f,
} as const;

/** Neutrals a garment can be when it is not vermilion (§3.3: bone, ash, sand). */
export const GARMENT_NEUTRALS = [0xe6e0d4, 0xa8a49b, 0xcbb694] as const;

/**
 * Darken (`k < 1`) or lighten (`k > 1`) a colour, per channel.
 *
 * The clamp is load-bearing. Lightening a pale colour overflows a channel past
 * 255, which carries into the next one and produces a number wider than 24 bits
 * — Pixi then throws "Unable to convert color", and because that happens inside
 * the interior's async build, the room never finishes loading and the city has
 * already been hidden. One highlight on a bone-coloured garment took the whole
 * building down exactly that way.
 */
export function shade(color: number, k: number): number {
  const ch = (v: number) => Math.max(0, Math.min(255, Math.round(v * k)));
  const r = ch((color >> 16) & 0xff);
  const g = ch((color >> 8) & 0xff);
  const b = ch(color & 0xff);
  return (r << 16) | (g << 8) | b;
}

const LEFT_FACE = 0.78;
const RIGHT_FACE = 0.6;

/**
 * Every prop bakes against the same invisible full-tile box, so `anchor(0.5, 1)`
 * always lands on the tile's bottom vertex however tall the prop is.
 */
function pin(g: Graphics): Graphics {
  return g.rect(-HW, -HH, TILE_W, TILE_H).fill({ color: 0x000000, alpha: 0 });
}

/** A box standing on the tile: `f` is its footprint as a fraction of the tile. */
function isoBox(g: Graphics, f: number, h: number, color: number, topColor = color): Graphics {
  const w = HW * f;
  const d = HH * f;
  g.poly([-w, -h, 0, d - h, 0, d, -w, 0]).fill(shade(color, LEFT_FACE));
  g.poly([0, d - h, w, -h, w, 0, 0, d]).fill(shade(color, RIGHT_FACE));
  g.poly([0, -d - h, w, -h, 0, d - h, -w, -h]).fill(topColor);
  return g;
}

/** A flat diamond lying on the floor. */
function isoFlat(g: Graphics, f: number, color: number, alpha = 1): Graphics {
  const w = HW * f;
  const d = HH * f;
  g.poly([0, -d, w, 0, 0, d, -w, 0]).fill({ color, alpha });
  return g;
}

const P = MAISON_PALETTE;

// ── Individual props ──────────────────────────────────────────────────────────

/** §4: straight lines, no chamfers on architecture. The wall is a slab. */
function wall(g: Graphics, color: number, h = 96): Graphics {
  return isoBox(g, 1, h, color, shade(color, 1.06));
}

function drawProp(kind: PropKind): Graphics {
  const g = pin(new Graphics());

  switch (kind) {
    case "wall_plaster":
      return wall(g, P.plaster);

    case "wall_north": {
      // A tall window: plaster reveal, cold glass, one mullion. The light in it
      // is the only honest light in the building (§4), so it is the brightest
      // thing in the room that is not the rail.
      wall(g, P.plaster);
      g.poly([-HW * 0.72, -84, 0, -84 + HH * 0.72, 0, -18, -HW * 0.72, -18 - HH * 0.72]).fill(
        P.northLight,
      );
      g.poly([0, -84 + HH * 0.72, HW * 0.72, -84, HW * 0.72, -18 - HH * 0.72, 0, -18]).fill(
        shade(P.northLight, 0.94),
      );
      g.rect(-1.5, -84, 3, 66).fill(P.plasterDeep);
      return g;
    }

    case "shopfront_glass": {
      // Low, so it never stands between the camera and the floor.
      isoBox(g, 1, 30, P.plasterDeep);
      isoFlat(g, 0.9, P.glass, 0.34);
      return g;
    }

    case "door": {
      // Heavy, and it does not have a bell (§1). Just a threshold and a jamb.
      isoFlat(g, 0.86, shade(P.steel, 1.5), 0.5);
      g.rect(-HW * 0.5, -46, 3, 46).fill(P.steel);
      g.rect(HW * 0.5 - 3, -46, 3, 46).fill(P.steel);
      return g;
    }

    case "balustrade": {
      // The lip of the raised platform: a solid rise with a brass handrail.
      isoBox(g, 1, 30, P.plasterDeep);
      g.poly([-HW, -38, 0, -38 + HH, HW, -38, 0, -38 - HH]).fill(P.brass);
      return g;
    }

    case "steps": {
      // Four broad steps. Drawn as stacked treads so the rise reads at a glance.
      for (let i = 0; i < 4; i++) {
        const y = -i * 6;
        const f = 1 - i * 0.06;
        g.poly([0, y - HH * f, HW * f, y, 0, y + HH * f, -HW * f, y]).fill(
          shade(P.plasterDeep, 1 - i * 0.04),
        );
      }
      return g;
    }

    case "ramp": {
      // The ramp is not only accessibility housekeeping — it is how rails get
      // wheeled between the two levels (§3.1). It gets a brass edge, like the
      // handrail, so it reads as part of the building rather than an apology.
      g.poly([0, -HH, HW, 0, 0, HH, -HW, 0]).fill(P.plasterDeep);
      g.poly([0, -HH - 20, HW, -20, HW, -14, 0, -HH - 14]).fill(shade(P.plasterDeep, 0.9));
      g.poly([0, -HH - 20, HW, -20, 0, HH - 20, -HW, -20]).fill({ color: P.brass, alpha: 0.5 });
      return g;
    }

    case "column": {
      // Black steel, floor to ceiling. The countdown is chalked on it (§3.5).
      isoBox(g, 0.3, 120, P.steel);
      g.rect(-10, -78, 20, 16).fill({ color: P.chalk, alpha: 0.22 });
      return g;
    }

    // ── the boutique ────────────────────────────────────────────────────────
    case "rail": {
      // The hero. Brushed brass, one of exactly three specular things in the
      // building (§4). The garments on it are drawn separately, from world
      // state, by scene.ts — this is the empty rail.
      g.rect(-HW * 0.62, -8, 3, 74).fill(shade(P.brass, 0.7));
      g.rect(HW * 0.62 - 3, -8, 3, 74).fill(shade(P.brass, 0.7));
      g.rect(-HW * 0.66, -78, TILE_W * 0.66, 4).fill(P.brass);
      isoFlat(g, 0.5, P.steel, 0.18);
      return g;
    }

    case "desk": {
      isoBox(g, 0.92, 34, P.oak, shade(P.oak, 1.12));
      // The lookbook, closed, where it has been all along (§13).
      g.rect(-14, -44, 26, 9).fill(P.bone);
      g.rect(-14, -44, 26, 2).fill(P.brass);
      return g;
    }

    case "mirror": {
      // Full height. It shows the collection at body scale, never the player.
      isoBox(g, 0.5, 104, P.oak);
      g.poly([-HW * 0.34, -100, 0, -100 + HH * 0.34, 0, -14, -HW * 0.34, -14 - HH * 0.34]).fill(
        shade(P.glass, 1.1),
      );
      g.poly([0, -100 + HH * 0.34, HW * 0.34, -100, HW * 0.34, -14 - HH * 0.34, 0, -14]).fill(
        P.glass,
      );
      return g;
    }

    case "alcove":
      // Enclosed and softly lit — the private corner of the room.
      return wall(g, shade(P.plaster, 0.94), 78);

    case "press_frame": {
      // Along the stair run. Filled frames are drawn over these from `press`
      // state; the wall itself is just the empty frames.
      wall(g, P.plaster);
      g.poly([-HW * 0.5, -74, 0, -74 + HH * 0.5, 0, -34, -HW * 0.5, -34 - HH * 0.5]).stroke({
        color: P.steel,
        width: 2,
      });
      g.poly([0, -74 + HH * 0.5, HW * 0.5, -74, HW * 0.5, -34 - HH * 0.5, 0, -34]).stroke({
        color: P.steel,
        width: 2,
      });
      return g;
    }

    case "dress_form": {
      // Bone linen on a steel stand. The mirror's hero piece hangs on one.
      g.rect(-2, -18, 4, 18).fill(P.steel);
      isoFlat(g, 0.34, P.steel, 0.5);
      g.ellipse(0, -44, 15, 26).fill(P.bone);
      g.ellipse(0, -64, 9, 11).fill(shade(P.bone, 0.94));
      return g;
    }

    // ── the atelier: the only room in MAISON that is actually working ────────
    case "cutting_table": {
      isoBox(g, 1, 30, P.oak, shade(P.oak, 1.14));
      // Chalk marks. The wear budget lives entirely upstairs (§4).
      g.rect(-22, -36, 30, 1.5).fill({ color: P.chalk, alpha: 0.75 });
      g.rect(-10, -32, 22, 1.5).fill({ color: P.chalk, alpha: 0.55 });
      return g;
    }

    case "machine": {
      isoBox(g, 0.78, 26, P.oak);
      isoBox(g, 0.44, 46, P.steel, shade(P.steel, 1.3));
      g.rect(-13, -52, 26, 5).fill(shade(P.steel, 1.5));
      return g;
    }

    case "bench": {
      // Élise's. The only bench with a tape measure left on it.
      isoBox(g, 0.94, 28, P.oak, shade(P.oak, 1.1));
      g.rect(-16, -34, 30, 2).fill(P.bone);
      return g;
    }

    case "shelving": {
      // Bolts of cloth. How `cash` reads in the room (§12) — the count changes.
      isoBox(g, 0.86, 82, P.ash);
      for (let i = 0; i < 3; i++) g.rect(-20, -70 + i * 22, 40, 4).fill(shade(P.ash, 1.25));
      return g;
    }

    case "press_steam":
      isoBox(g, 0.7, 40, P.steel, shade(P.steel, 1.35));
      return g;
  }
}

// ── Baking ────────────────────────────────────────────────────────────────────

export interface MaisonTextures {
  /** Two floor tones per level: [boutique a, boutique b, atelier a, atelier b]. */
  floor: Texture[];
  prop: Record<PropKind, Texture>;
  /** A hanging garment, by colour — the rail's contents (§3.3). */
  garment: (color: number) => Texture;
  all: Texture[];
}

const FLOOR_TONES = [P.floorPolish, P.floorPolishAlt, P.floorBoard, P.floorBoardAlt];

const PROP_KINDS: PropKind[] = [
  "wall_plaster",
  "wall_north",
  "shopfront_glass",
  "door",
  "balustrade",
  "steps",
  "ramp",
  "column",
  "rail",
  "desk",
  "mirror",
  "alcove",
  "press_frame",
  "dress_form",
  "cutting_table",
  "machine",
  "bench",
  "shelving",
  "press_steam",
];

/**
 * One garment on a hanger — the unit the rail is made of.
 *
 * Narrow on purpose. A rail holds its pieces packed, so they overlap; but §3.3
 * asks a player to read the whole season off it at a glance, and you cannot
 * count a slab. The body is kept under the hanging pitch and given a darker
 * leading edge, so eight pieces stay eight pieces even shoulder to shoulder.
 */
function drawGarment(color: number): Graphics {
  const g = pin(new Graphics());
  g.rect(-1, -70, 2, 8).fill(shade(P.brass, 0.8)); // the hook
  g.poly([-9, -62, 9, -62, 6, -18, -6, -18]).fill(color);
  g.poly([-9, -62, 0, -58, 9, -62, 0, -66]).fill(shade(color, 1.12)); // the shoulder
  g.poly([-9, -62, -6, -62, -4, -18, -6, -18]).fill(shade(color, 0.72)); // the fold
  return g;
}

export function bakeMaisonTextures(renderer: Renderer): MaisonTextures {
  const all: Texture[] = [];
  const bake = (g: Graphics) => {
    const t = renderer.generateTexture(g);
    g.destroy();
    all.push(t);
    return t;
  };

  const floor = FLOOR_TONES.map((tone) => bake(isoFlat(pin(new Graphics()), 1, tone)));

  const prop = {} as Record<PropKind, Texture>;
  for (const kind of PROP_KINDS) prop[kind] = bake(drawProp(kind));

  const garments = new Map<number, Texture>();
  const garment = (color: number): Texture => {
    let t = garments.get(color);
    if (!t) {
      t = bake(drawGarment(color));
      garments.set(color, t);
    }
    return t;
  };
  // Pre-bake the colourways the rail actually uses, so a state change never
  // stalls on a generateTexture mid-frame.
  garment(P.vermilion);
  for (const n of GARMENT_NEUTRALS) garment(n);

  return { floor, prop, garment, all };
}
