// Procedural people art — the player and pedestrian NPCs are drawn with vector
// Graphics once and baked to textures at startup (renderer.generateTexture), so
// the per-frame cost is plain sprite rendering. Three facings are baked
// (S front, E profile, N back); W renders as E mirrored via negative x-scale.
// No binary assets involved — palettes recolor one rig into a crowd.
import { Graphics, Texture, type Renderer } from "pixi.js";
import type { Cardinal } from "./assets";
import { CROWD, PLAYER, paletteOf } from "@/ui/characters";

export interface PersonPalette {
  shirt: number;
  legs: number;
  skin: number;
  hair: number;
  /**
   * What they are wearing over the base rig. Omitted is `casual` — the street's
   * own look, backpack and all. Indoors the Café dresses its staff and its
   * manager differently from its customers, so who works there reads before
   * anybody says a word.
   *
   *   - `uniform`: `shirt` is the shirt (white), `accent` the apron (black).
   *   - `chef`: a uniform with a white cap.
   *   - `suit`: `shirt` is the jacket, `accent` the tie, with a white shirt
   *     showing at the collar.
   */
  outfit?: Outfit;
  /** Apron or tie colour, depending on `outfit`. */
  accent?: number;
  /**
   * The cut of their hair, so a figure twelve pixels tall still reads as the
   * person in their portrait (ui/characters.ts). Omitted is a plain crop.
   */
  hairStyle?: FigureHair;
  /** A full beard or goatee, drawn in the hair colour. */
  beard?: boolean;
  /** Glasses worn on the face. */
  glasses?: boolean;
}

export type Outfit = "casual" | "uniform" | "chef" | "suit";

export type FigureHair =
  "short" | "swept" | "buzz" | "curly" | "bun" | "ponytail" | "long" | "bob" | "receding";

export const PLAYER_PALETTE: PersonPalette = paletteOf(PLAYER.look);

/** The city's pedestrians, and the café's customers: the crowd in ui/characters.ts. */
export const NPC_PALETTES: PersonPalette[] = CROWD.map(paletteOf);

export interface PersonTextures {
  /** Two-frame walk cycle per facing (W reuses E — mirror the sprite). */
  walk: Record<Cardinal, [Texture, Texture]>;
  idle: Record<Cardinal, Texture>;
  /** All unique baked textures, for disposal on unmount. */
  all: Texture[];
}

type BakeFacing = "S" | "E" | "N";

/** 0 = idle (both feet planted), 1/2 = walk frames (alternating lifted leg). */
function drawPerson(palette: PersonPalette, facing: BakeFacing, frame: 0 | 1 | 2): Graphics {
  const g = new Graphics();
  // Invisible bounds pin so every frame bakes to identical dimensions (keeps
  // the sprite anchor stable across texture swaps).
  g.rect(-10, -40, 20, 40).fill({ color: 0x000000, alpha: 0 });

  const liftL = frame === 1 ? 3 : 0;
  const liftR = frame === 2 ? 3 : 0;
  // Legs (two stubs; a lifted leg reads as a stride at this size)
  g.roundRect(-5.5, -9 - liftL, 5, 9 + liftL - (liftL ? 2 : 0), 2).fill(palette.legs);
  g.roundRect(0.5, -9 - liftR, 5, 9 + liftR - (liftR ? 2 : 0), 2).fill(palette.legs);
  if (frame === 1) g.roundRect(-5.5, -3, 5, 3, 1.5).fill({ color: 0x000000, alpha: 0.12 });
  if (frame === 2) g.roundRect(0.5, -3, 5, 3, 1.5).fill({ color: 0x000000, alpha: 0.12 });

  // Body
  const outfit = palette.outfit ?? "casual";
  g.roundRect(-7, -25, 14, 18, 5).fill(palette.shirt);
  if (facing === "N" && outfit === "casual") {
    // Backpack on the back view — the street's look, not a uniform's.
    g.roundRect(-5, -23, 10, 11, 3).fill({ color: 0x000000, alpha: 0.22 });
  } else if (facing !== "N") {
    // Subtle shading edge on the front/profile
    g.roundRect(-7, -12, 14, 5, 2).fill({ color: 0x000000, alpha: 0.08 });
  }
  if (outfit === "uniform" || outfit === "chef") drawApron(g, facing, palette.accent ?? 0x1d1d22);
  if (outfit === "suit") drawSuit(g, facing, palette.accent ?? 0x7a2a33);

  // Head
  g.circle(0, -30, 7.5).fill(palette.skin);
  g.circle(0, -30, 7.5).stroke({ color: 0xffffff, alpha: 0.2, width: 1 });
  drawHair(g, facing, palette);
  if (facing !== "N") {
    if (facing === "S") {
      g.circle(-2.6, -29.5, 1.1).fill(0x22262e);
      g.circle(2.6, -29.5, 1.1).fill(0x22262e);
    } else {
      g.circle(3.4, -29.5, 1.1).fill(0x22262e);
    }
    if (palette.beard) {
      if (facing === "S") g.ellipse(0, -25.8, 4.8, 2.6).fill(palette.hair);
      else g.ellipse(2.6, -26.2, 3.6, 2.4).fill(palette.hair);
    }
    if (palette.glasses) {
      if (facing === "S") {
        g.rect(-4.6, -30.8, 3.8, 2.6).stroke({ color: 0x22262e, width: 0.8 });
        g.rect(0.8, -30.8, 3.8, 2.6).stroke({ color: 0x22262e, width: 0.8 });
      } else {
        g.rect(2, -30.8, 3.6, 2.6).stroke({ color: 0x22262e, width: 0.8 });
      }
    }
  }
  if (outfit === "chef") {
    // A short white cap, sitting on the hair line.
    g.roundRect(-6.5, -41, 13, 6, 2.5).fill(0xf6f6f4);
    g.rect(-6.5, -36.5, 13, 1.5).fill({ color: 0x000000, alpha: 0.1 });
  }
  return g;
}

/**
 * Hair, by cut and by facing. The back view is mostly hair; the front and
 * profile show a cap of it with whatever falls past the face — long hair and a
 * bob down the sides, a bun or a ponytail, a bald crown with the sides kept.
 */
function drawHair(g: Graphics, facing: BakeFacing, palette: PersonPalette): void {
  const c = palette.hair;
  const style = palette.hairStyle ?? "short";

  if (facing === "N") {
    if (style === "receding") {
      g.ellipse(0, -28.5, 7.2, 3.6).fill(c);
      return;
    }
    if (style === "curly") {
      for (const [x, y] of [
        [-4.5, -34],
        [0, -36],
        [4.5, -34],
        [-5, -29],
        [5, -29],
        [0, -31],
      ]) {
        g.circle(x, y, 3.4).fill(c);
      }
      return;
    }
    g.ellipse(0, -31, 7.5, 6).fill({ color: c, alpha: style === "buzz" ? 0.8 : 1 });
    if (style === "long") g.roundRect(-6.5, -32, 13, 12, 4).fill(c);
    if (style === "bob") g.roundRect(-7.5, -32, 15, 7, 3).fill(c);
    if (style === "ponytail") g.roundRect(-1.6, -31, 3.2, 10, 1.6).fill(c);
    if (style === "bun") g.circle(0, -37.5, 3.4).fill(c);
    return;
  }

  const front = facing === "S";
  const capX = front ? 0 : -1.5;
  switch (style) {
    case "receding":
      g.circle(front ? -6.2 : -5.5, -31.5, 2).fill(c);
      if (front) g.circle(6.2, -31.5, 2).fill(c);
      return;
    case "curly":
      for (const [x, y] of [
        [-5, -34.5],
        [0, -37],
        [5, -34.5],
      ]) {
        g.circle(front ? x : x - 1.5, y, 3.3).fill(c);
      }
      return;
    case "buzz":
      g.ellipse(capX, -34.5, 7, 3).fill({ color: c, alpha: 0.85 });
      return;
    default:
      g.ellipse(capX, -34, 7, 4).fill(c);
  }
  if (style === "long") {
    if (front) {
      g.roundRect(-8, -34, 3, 12, 1.5).fill(c);
      g.roundRect(5, -34, 3, 12, 1.5).fill(c);
    } else {
      g.roundRect(-8.5, -34, 4.5, 13, 2).fill(c);
    }
  }
  if (style === "bob") {
    if (front) {
      g.roundRect(-8, -34, 3, 8, 1.5).fill(c);
      g.roundRect(5, -34, 3, 8, 1.5).fill(c);
    } else {
      g.roundRect(-8.5, -34, 4.5, 9, 2).fill(c);
    }
  }
  if (style === "bun") g.circle(front ? 0 : -4, front ? -38.5 : -37, 3).fill(c);
  if (style === "ponytail" && !front) g.roundRect(-9.5, -33, 3, 9, 1.5).fill(c);
}

/** A bib apron over the shirt: body and skirt to the knee, straps over the shoulders. */
function drawApron(g: Graphics, facing: BakeFacing, color: number): void {
  if (facing === "S") {
    g.roundRect(-5.5, -20, 11, 15, 2).fill(color);
    g.rect(-4.5, -25, 1.6, 5).fill(color);
    g.rect(2.9, -25, 1.6, 5).fill(color);
    // The waist tie, one shade lighter so the apron has a waist.
    g.rect(-5.5, -15, 11, 1.2).fill({ color: 0xffffff, alpha: 0.12 });
  } else if (facing === "E") {
    // Profile: the front edge of the apron, on the facing side.
    g.roundRect(1, -20, 6, 15, 2).fill(color);
    g.rect(2, -25, 1.6, 5).fill(color);
  } else {
    // Back view: crossed straps and the bow at the waist.
    g.poly([-5, -24, -3.4, -24, 5, -15, 3.4, -15]).fill(color);
    g.poly([5, -24, 3.4, -24, -5, -15, -3.4, -15]).fill(color);
    g.ellipse(-2.4, -14.5, 2.2, 1.4).fill(color);
    g.ellipse(2.4, -14.5, 2.2, 1.4).fill(color);
  }
}

/** A jacket: white shirt and tie at the open collar, lapels, and nothing on the back. */
function drawSuit(g: Graphics, facing: BakeFacing, tie: number): void {
  if (facing === "S") {
    g.poly([-3.4, -25, 3.4, -25, 0, -16]).fill(0xf4f4f2);
    g.poly([-1, -24, 1, -24, 1.6, -18, 0, -16, -1.6, -18]).fill(tie);
    // Lapels: a darker fold either side of the opening.
    g.poly([-3.4, -25, -5.5, -24, -1.2, -16, 0, -16]).fill({ color: 0x000000, alpha: 0.18 });
    g.poly([3.4, -25, 5.5, -24, 1.2, -16, 0, -16]).fill({ color: 0x000000, alpha: 0.18 });
    // Two buttons.
    g.circle(0, -13.5, 0.8).fill({ color: 0x000000, alpha: 0.35 });
    g.circle(0, -10.5, 0.8).fill({ color: 0x000000, alpha: 0.35 });
  } else if (facing === "E") {
    // Profile: collar and a sliver of tie at the front.
    g.poly([3, -25, 6.5, -24, 5.5, -20]).fill(0xf4f4f2);
    g.rect(5, -23, 1.5, 5).fill(tie);
  } else {
    // Back view: the centre seam.
    g.rect(-0.5, -24, 1, 16).fill({ color: 0x000000, alpha: 0.16 });
  }
}

function bake(renderer: Renderer, g: Graphics): Texture {
  const texture = renderer.generateTexture({ target: g, resolution: 2 });
  g.destroy();
  return texture;
}

export function bakePersonTextures(renderer: Renderer, palette: PersonPalette): PersonTextures {
  const all: Texture[] = [];
  const bakeFrame = (facing: BakeFacing, frame: 0 | 1 | 2): Texture => {
    const t = bake(renderer, drawPerson(palette, facing, frame));
    all.push(t);
    return t;
  };
  const idleS = bakeFrame("S", 0);
  const idleE = bakeFrame("E", 0);
  const idleN = bakeFrame("N", 0);
  const walkS: [Texture, Texture] = [bakeFrame("S", 1), bakeFrame("S", 2)];
  const walkE: [Texture, Texture] = [bakeFrame("E", 1), bakeFrame("E", 2)];
  const walkN: [Texture, Texture] = [bakeFrame("N", 1), bakeFrame("N", 2)];
  return {
    idle: { S: idleS, E: idleE, N: idleN, W: idleE },
    walk: { S: walkS, E: walkE, N: walkN, W: walkE },
    all,
  };
}

/**
 * Shared soft drop-shadow. Built from concentric rings so it actually fades —
 * a single filled ellipse gave every person a hard-edged grey sticker.
 */
export function bakeShadowTexture(renderer: Renderer): Texture {
  const g = new Graphics();
  for (let i = 6; i >= 1; i--) {
    const k = i / 6;
    g.ellipse(0, 0, 12 * k, 5.5 * k).fill({ color: 0x000000, alpha: 0.06 });
  }
  return bake(renderer, g);
}

export function destroyTextures(textures: Texture[]): void {
  for (const t of textures) t.destroy(true);
}
