// Meridian Bank's look — procedural, the same technique the Café and MAISON use:
// every prop is drawn once with vector Graphics and baked to a texture, so the
// room ships without waiting on painted art.
//
// The house: cream marble, dark walnut, navy and a little gold. Calm, solid,
// slightly old-fashioned — a place built to look like your money is safe in it.
//
// Faces: on this camera the two visible faces of a box are the one facing +y
// (the "left" face here) and the one facing +x (the "right" face). So anything
// on the back wall (y = 0) puts its detail on the left face, and anything
// against the left wall (x = 0) — the ATMs, the printer, the board — puts its
// detail on the right face, where you can see it.
import { Graphics, Texture, type Renderer } from "pixi.js";
import { TILE_W, TILE_H } from "@/lib/iso";
import type { PropKind } from "./room";

const HW = TILE_W / 2;
const HH = TILE_H / 2;

export const BANK_PALETTE = {
  void: 0x0b0e14,
  marble: 0xe6dfd2,
  marbleAlt: 0xd9d1c3,
  marbleVein: 0xc9c0b0,
  boards: 0x8a6a4a,
  boardsAlt: 0x83634a,
  carpet: 0x2f3e5e,
  carpetAlt: 0x2b3957,
  plaster: 0xebe4d6,
  plasterDeep: 0xd0c7b5,
  wainscot: 0x5c3f2c,
  walnut: 0x6b4528,
  walnutLight: 0x8f603b,
  navy: 0x1f2d4d,
  navyLight: 0x34497a,
  gold: 0xc9a24a,
  goldLight: 0xe5c77a,
  glass: 0xa9c6d3,
  steel: 0x4a5160,
  steelLight: 0x8d96a6,
  screen: 0x16303f,
  screenGlow: 0x6fd0e8,
  leaf: 0x3f7a4a,
  leafLight: 0x5b9a5e,
  pot: 0x9a6b4a,
  paper: 0xf3efe6,
  red: 0xa83a32,
  green: 0x3f9a5a,
  ink: 0x22252c,
} as const;

const P = BANK_PALETTE;

/** Darken (k < 1) or lighten (k > 1), clamped per channel — see MAISON's props.ts for why. */
export function shade(color: number, k: number): number {
  const ch = (v: number) => Math.max(0, Math.min(255, Math.round(v * k)));
  return (ch((color >> 16) & 0xff) << 16) | (ch((color >> 8) & 0xff) << 8) | ch(color & 0xff);
}

const LEFT_FACE = 0.8;
const RIGHT_FACE = 0.62;

/** Every prop bakes against the same full-tile box so anchor(0.5, 1) lands on the tile. */
function pin(g: Graphics): Graphics {
  return g.rect(-HW, -HH, TILE_W, TILE_H).fill({ color: 0x000000, alpha: 0 });
}

/**
 * A box standing on the tile. `f` is its footprint as a fraction of the tile,
 * `lift` raises its base (a monitor on a desk, a sign on a wall).
 */
function isoBox(
  g: Graphics,
  f: number,
  h: number,
  color: number,
  topColor = color,
  lift = 0,
  alpha = 1,
): Graphics {
  const w = HW * f;
  const d = HH * f;
  const b = -lift;
  g.poly([-w, b - h, 0, b + d - h, 0, b + d, -w, b]).fill({ color: shade(color, LEFT_FACE), alpha });
  g.poly([0, b + d - h, w, b - h, w, b, 0, b + d]).fill({ color: shade(color, RIGHT_FACE), alpha });
  g.poly([0, b - d - h, w, b - h, 0, b + d - h, -w, b - h]).fill({ color: topColor, alpha });
  return g;
}

/** A flat diamond on the floor. */
function isoFlat(g: Graphics, f: number, color: number, alpha = 1): Graphics {
  const w = HW * f;
  const d = HH * f;
  return g.poly([0, -d, w, 0, 0, d, -w, 0]).fill({ color, alpha });
}

/**
 * A panel painted on the +y ("left") face of a full-width box: `u0..u1` across
 * the face (0 = left corner, 1 = bottom corner), `v0..v1` up it in pixels.
 */
function leftPanel(g: Graphics, u0: number, u1: number, v0: number, v1: number, color: number, alpha = 1, f = 1) {
  const w = HW * f;
  const d = HH * f;
  const pt = (u: number, v: number) => [-w + u * w, u * d - v];
  g.poly([...pt(u0, v1), ...pt(u1, v1), ...pt(u1, v0), ...pt(u0, v0)]).fill({ color, alpha });
}

/** The same on the +x ("right") face: u = 0 is the bottom corner, 1 the right corner. */
function rightPanel(g: Graphics, u0: number, u1: number, v0: number, v1: number, color: number, alpha = 1, f = 1) {
  const w = HW * f;
  const d = HH * f;
  const pt = (u: number, v: number) => [u * w, d - u * d - v];
  g.poly([...pt(u0, v1), ...pt(u1, v1), ...pt(u1, v0), ...pt(u0, v0)]).fill({ color, alpha });
}

const WALL_H = 110;

/** Plaster above a walnut dado, gold picture rail between — the bank's wall. */
function wall(g: Graphics): Graphics {
  isoBox(g, 1, WALL_H, P.plaster, shade(P.plaster, 1.04));
  leftPanel(g, 0, 1, 0, 34, P.wainscot);
  rightPanel(g, 0, 1, 0, 34, P.wainscot);
  leftPanel(g, 0, 1, 34, 37, P.gold);
  rightPanel(g, 0, 1, 34, 37, P.gold);
  return g;
}

function plant(g: Graphics): Graphics {
  isoBox(g, 0.36, 18, P.pot, shade(P.pot, 1.1));
  g.circle(0, -34, 14).fill(P.leaf);
  g.circle(-8, -44, 10).fill(P.leafLight);
  g.circle(8, -46, 11).fill(P.leaf);
  g.circle(0, -56, 9).fill(P.leafLight);
  return g;
}

function drawProp(kind: PropKind): Graphics {
  const g = pin(new Graphics());

  switch (kind) {
    case "wall":
      return wall(g);

    case "wall_clock": {
      wall(g);
      // A round brass clock on the +y face.
      const cx = -HW / 2;
      const cy = HH / 2 - 72;
      g.ellipse(cx, cy, 15, 17).fill(P.gold);
      g.ellipse(cx, cy, 12, 14).fill(P.paper);
      g.moveTo(cx, cy).lineTo(cx, cy - 10).stroke({ color: P.ink, width: 2 });
      g.moveTo(cx, cy).lineTo(cx + 6, cy + 3).stroke({ color: P.ink, width: 2 });
      return g;
    }

    case "wall_logo": {
      wall(g);
      // The house mark: a gold disc with a navy "M", over a navy plaque.
      leftPanel(g, 0.12, 0.88, 52, 96, P.navy);
      const cx = -HW / 2;
      const cy = HH / 2 - 74;
      g.circle(cx, cy, 13).fill(P.gold);
      g.poly([cx - 7, cy + 6, cx - 7, cy - 6, cx, cy + 1, cx + 7, cy - 6, cx + 7, cy + 6]).stroke({
        color: P.navy,
        width: 2.5,
        join: "round",
      });
      return g;
    }

    case "wall_vault": {
      wall(g);
      // The vault door: a great steel disc with a wheel. Always closed.
      const cx = -HW / 2;
      const cy = HH / 2 - 52;
      g.ellipse(cx, cy, 30, 38).fill(shade(P.steel, 0.8));
      g.ellipse(cx, cy, 26, 33).fill(P.steelLight);
      g.ellipse(cx, cy, 20, 26).stroke({ color: P.steel, width: 2 });
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        g.moveTo(cx, cy)
          .lineTo(cx + Math.cos(a) * 13, cy + Math.sin(a) * 16)
          .stroke({ color: P.steel, width: 3, cap: "round" });
      }
      g.circle(cx, cy, 4).fill(P.gold);
      return g;
    }

    case "shopfront": {
      // Low walnut base, tall glass above, gold mullion.
      isoBox(g, 1, 16, P.walnut, P.walnutLight);
      isoBox(g, 1, 58, P.glass, shade(P.glass, 1.08), 16, 0.38);
      g.rect(-1, -74, 2, 58).fill({ color: P.gold, alpha: 0.7 });
      return g;
    }

    case "door": {
      // Two glass leaves held open, brass handles — a threshold, not a wall.
      isoFlat(g, 0.95, P.navy, 0.9);
      isoFlat(g, 0.7, P.gold, 0.35);
      return g;
    }

    case "wall_sill":
      return isoBox(g, 1, 14, P.wainscot, shade(P.wainscot, 1.15));

    case "glass": {
      // The manager's office: glass on a walnut sill, a gold frame on top.
      // A thin pane, not a slab: low walnut sill, see-through glass with no lid,
      // and a gold rail along the top edges only — a full gold top face read as
      // a solid yellow ceiling over the whole office.
      isoBox(g, 1, 10, P.walnut, P.walnutLight);
      const w = HW;
      const d = HH;
      g.poly([-w, -10 - 64, 0, d - 10 - 64, 0, d - 10, -w, -10]).fill({ color: P.glass, alpha: 0.22 });
      g.poly([0, d - 10 - 64, w, -10 - 64, w, -10, 0, d - 10]).fill({ color: shade(P.glass, 0.85), alpha: 0.22 });
      g.moveTo(-w, -74).lineTo(0, d - 74).lineTo(w, -74).stroke({ color: P.gold, width: 2, alpha: 0.9 });
      return g;
    }

    case "glass_door": {
      isoFlat(g, 0.9, P.walnut, 0.8);
      g.rect(-HW * 0.9, -86, 3, 72).fill({ color: P.gold, alpha: 0.8 });
      g.rect(HW * 0.9 - 3, -86, 3, 72).fill({ color: P.gold, alpha: 0.8 });
      return g;
    }

    case "counter": {
      // Walnut counter with a marble top and a gold kick strip.
      isoBox(g, 1, 40, P.walnut, P.marble);
      leftPanel(g, 0, 1, 2, 5, P.gold);
      rightPanel(g, 0, 1, 2, 5, P.gold);
      return g;
    }

    case "counter_window": {
      isoBox(g, 1, 40, P.walnut, P.marble);
      leftPanel(g, 0, 1, 2, 5, P.gold);
      rightPanel(g, 0, 1, 2, 5, P.gold);
      // The glass screen, with a speaking slot and a cash tray.
      isoBox(g, 0.86, 46, P.glass, shade(P.glass, 1.12), 40, 0.34);
      leftPanel(g, 0.35, 0.65, 40, 46, P.ink, 0.5, 0.86);
      // A little lamp, so the open window reads as open.
      g.circle(0, -96, 3).fill(P.goldLight);
      return g;
    }

    case "filing_cabinet": {
      isoBox(g, 0.62, 62, P.steelLight, shade(P.steelLight, 1.08));
      for (let i = 0; i < 3; i++) leftPanel(g, 0.15, 0.85, 8 + i * 18, 22 + i * 18, shade(P.steelLight, 0.92), 1, 0.62);
      return g;
    }

    case "back_desk": {
      isoBox(g, 0.86, 30, P.walnut, P.walnutLight);
      // A cash-counting machine and a stack of paper.
      isoBox(g, 0.3, 12, P.steel, P.steelLight, 30);
      g.rect(10, -40, 12, 4).fill(P.paper);
      return g;
    }

    case "safe": {
      isoBox(g, 0.72, 58, P.steel, P.steelLight);
      leftPanel(g, 0.12, 0.88, 6, 52, shade(P.steel, 1.15), 1, 0.72);
      g.circle(-HW * 0.36, -22, 5).fill(P.gold);
      return g;
    }

    case "bookshelf": {
      isoBox(g, 0.86, 92, P.walnut, P.walnutLight);
      const books = [P.red, P.navyLight, P.gold, P.green, P.paper, P.navy];
      for (let s = 0; s < 3; s++) {
        for (let b = 0; b < 6; b++) {
          rightPanel(g, 0.08 + b * 0.14, 0.18 + b * 0.14, 10 + s * 28, 30 + s * 28, books[(b + s) % books.length], 1, 0.86);
        }
      }
      return g;
    }

    case "manager_desk": {
      // Bigger, darker, with a green banker's lamp.
      isoBox(g, 0.92, 34, shade(P.walnut, 0.85), P.walnutLight);
      g.rect(-4, -52, 2, 14).fill(P.gold);
      g.ellipse(-3, -54, 9, 4).fill(P.green);
      g.rect(8, -40, 16, 5).fill(P.paper);
      return g;
    }

    case "rates_board": {
      // A navy board on the wall: the day's rates in gold. The readable version is
      // the panel you open; this is how it looks across the hall.
      isoBox(g, 0.2, 24, P.walnut, P.walnutLight);
      rightPanel(g, 0.05, 0.95, 30, 96, P.navy);
      rightPanel(g, 0.12, 0.88, 84, 90, P.gold);
      for (let i = 0; i < 4; i++) rightPanel(g, 0.12, 0.7, 40 + i * 10, 44 + i * 10, P.goldLight, 0.8);
      for (let i = 0; i < 4; i++) rightPanel(g, 0.76, 0.88, 40 + i * 10, 44 + i * 10, P.paper, 0.9);
      return g;
    }

    case "passbook_printer": {
      isoBox(g, 0.62, 44, P.steelLight, shade(P.steelLight, 1.1));
      rightPanel(g, 0.2, 0.8, 30, 36, P.ink, 1, 0.62); // the slot
      rightPanel(g, 0.25, 0.75, 14, 24, P.screen, 1, 0.62);
      g.circle(HW * 0.2, -10, 2).fill(P.green);
      return g;
    }

    case "atm": {
      // Navy cabinet, glowing screen, keypad, card slot — the gold M on top.
      isoBox(g, 0.7, 76, P.navy, P.navyLight);
      rightPanel(g, 0.18, 0.82, 44, 66, P.screen, 1, 0.7);
      rightPanel(g, 0.24, 0.76, 48, 62, P.screenGlow, 0.55, 0.7);
      rightPanel(g, 0.3, 0.7, 24, 38, P.steelLight, 1, 0.7);
      rightPanel(g, 0.36, 0.64, 18, 20, P.ink, 1, 0.7);
      g.circle(0, -84, 5).fill(P.gold);
      return g;
    }

    case "drop_box": {
      isoBox(g, 0.5, 44, P.navy, P.navyLight);
      rightPanel(g, 0.25, 0.75, 32, 35, P.ink, 1, 0.5);
      rightPanel(g, 0.2, 0.8, 12, 22, P.gold, 0.9, 0.5);
      return g;
    }

    case "form_table": {
      // A standing table with slips in trays and a pen on a chain.
      isoBox(g, 0.7, 42, P.walnut, P.marble);
      g.rect(-18, -50, 12, 6).fill(P.paper);
      g.rect(-2, -52, 12, 6).fill(shade(P.paper, 0.92));
      g.rect(14, -48, 12, 6).fill(P.goldLight);
      g.moveTo(-4, -46).lineTo(4, -40).stroke({ color: P.ink, width: 2 });
      return g;
    }

    case "leaflet_rack": {
      isoBox(g, 0.4, 70, P.walnut, P.walnutLight);
      const colours = [P.gold, P.navyLight, P.green, P.red];
      for (let i = 0; i < 4; i++) {
        leftPanel(g, 0.2, 0.8, 14 + i * 14, 24 + i * 14, colours[i], 1, 0.4);
        rightPanel(g, 0.2, 0.8, 14 + i * 14, 24 + i * 14, colours[(i + 2) % 4], 1, 0.4);
      }
      return g;
    }

    case "bench": {
      // Leather-topped bench on brass legs.
      g.rect(-HW * 0.4, -12, 3, 12).fill(P.gold);
      g.rect(HW * 0.4 - 3, -12, 3, 12).fill(P.gold);
      isoBox(g, 0.62, 7, P.navyLight, shade(P.navyLight, 1.15), 12);
      return g;
    }

    case "desk": {
      // A customer desk with a monitor turned to the officer and a nameplate.
      isoBox(g, 0.82, 32, P.walnut, P.walnutLight);
      isoBox(g, 0.26, 4, P.ink, P.ink, 32);
      isoBox(g, 0.34, 22, P.ink, P.ink, 36);
      rightPanel(g, 0.1, 0.9, 2, 20, P.screen, 1, 0.34);
      g.rect(-24, -38, 14, 4).fill(P.gold);
      return g;
    }

    case "welcome_desk": {
      // A curved-looking reception counter: walnut, with a gold band and a bell.
      isoBox(g, 0.9, 36, P.walnut, P.marble);
      leftPanel(g, 0, 1, 18, 22, P.gold, 1, 0.9);
      rightPanel(g, 0, 1, 18, 22, P.gold, 1, 0.9);
      g.ellipse(-10, -42, 5, 3).fill(P.gold);
      g.circle(-10, -44, 3).fill(P.goldLight);
      return g;
    }

    case "token_machine": {
      isoBox(g, 0.5, 64, P.navy, P.navyLight);
      leftPanel(g, 0.2, 0.8, 40, 56, P.screen, 1, 0.5);
      leftPanel(g, 0.28, 0.72, 44, 52, P.screenGlow, 0.6, 0.5);
      leftPanel(g, 0.3, 0.7, 24, 30, P.gold, 1, 0.5);
      leftPanel(g, 0.35, 0.65, 14, 16, P.paper, 1, 0.5);
      return g;
    }

    case "plant":
      return plant(g);
  }
}

export interface BankTextures {
  /** [marble a, marble b, boards a, boards b, carpet a, carpet b] */
  floor: Texture[];
  prop: Record<PropKind, Texture>;
  all: Texture[];
}

const PROP_KINDS: PropKind[] = [
  "wall",
  "wall_clock",
  "wall_logo",
  "wall_vault",
  "shopfront",
  "door",
  "wall_sill",
  "glass",
  "glass_door",
  "counter",
  "counter_window",
  "filing_cabinet",
  "back_desk",
  "safe",
  "bookshelf",
  "manager_desk",
  "rates_board",
  "passbook_printer",
  "atm",
  "drop_box",
  "form_table",
  "leaflet_rack",
  "bench",
  "desk",
  "welcome_desk",
  "token_machine",
  "plant",
];

function marbleTile(base: number, veined: boolean): Graphics {
  const g = isoFlat(pin(new Graphics()), 1, base);
  // A thin gold border, and a vein across the odd tiles, so the hall reads as
  // stone rather than paint.
  g.poly([0, -HH, HW, 0, 0, HH, -HW, 0]).stroke({ color: P.goldLight, width: 1, alpha: 0.35 });
  if (veined) {
    g.moveTo(-HW * 0.5, -HH * 0.1)
      .lineTo(-HW * 0.1, HH * 0.15)
      .lineTo(HW * 0.35, -HH * 0.05)
      .stroke({ color: P.marbleVein, width: 1.5, alpha: 0.8 });
  }
  return g;
}

export function bakeBankTextures(renderer: Renderer): BankTextures {
  const all: Texture[] = [];
  const bake = (g: Graphics) => {
    const t = renderer.generateTexture({ target: g, resolution: 2 });
    g.destroy();
    all.push(t);
    return t;
  };

  const floor = [
    bake(marbleTile(P.marble, false)),
    bake(marbleTile(P.marbleAlt, true)),
    bake(isoFlat(pin(new Graphics()), 1, P.boards)),
    bake(isoFlat(pin(new Graphics()), 1, P.boardsAlt)),
    bake(isoFlat(pin(new Graphics()), 1, P.carpet)),
    bake(isoFlat(pin(new Graphics()), 1, P.carpetAlt)),
  ];

  const prop = {} as Record<PropKind, Texture>;
  for (const kind of PROP_KINDS) prop[kind] = bake(drawProp(kind));

  return { floor, prop, all };
}

/** Exported for the test that every kind has a drawing. */
export const BAKED_KINDS: readonly PropKind[] = PROP_KINDS;
