// Procedural people art — the player and pedestrian NPCs are drawn with vector
// Graphics once and baked to textures at startup (renderer.generateTexture), so
// the per-frame cost is plain sprite rendering. Three facings are baked
// (S front, E profile, N back); W renders as E mirrored via negative x-scale.
// No binary assets involved — palettes recolor one rig into a crowd.
import { Graphics, Texture, type Renderer } from "pixi.js";
import type { Cardinal } from "./assets";

export interface PersonPalette {
  shirt: number;
  legs: number;
  skin: number;
  hair: number;
}

export const PLAYER_PALETTE: PersonPalette = {
  shirt: 0x3d78d8,
  legs: 0x2a3350,
  skin: 0xf0d9b5,
  hair: 0x3b2d23,
};

export const NPC_PALETTES: PersonPalette[] = [
  { shirt: 0xc95f4e, legs: 0x33415e, skin: 0xf0d9b5, hair: 0x241d18 },
  { shirt: 0x5fae6f, legs: 0x4a4139, skin: 0xc98e5a, hair: 0x101010 },
  { shirt: 0xe2be78, legs: 0x2f3a52, skin: 0x8d5a3b, hair: 0x201a14 },
  { shirt: 0x8a6fd1, legs: 0x3a3a3a, skin: 0xf5e0c4, hair: 0x8a4b2c },
  { shirt: 0x4aa3c7, legs: 0x584a68, skin: 0xd9a066, hair: 0x2e2622 },
  { shirt: 0xd987b5, legs: 0x2c3a45, skin: 0xf0d9b5, hair: 0xd8c15a },
  { shirt: 0xececec, legs: 0x2f2f38, skin: 0xa9714b, hair: 0x30281f },
  { shirt: 0xf0954f, legs: 0x40506e, skin: 0xe8c9a0, hair: 0x5a5a5a },
];

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
  g.roundRect(-7, -25, 14, 18, 5).fill(palette.shirt);
  if (facing === "N") {
    // Backpack on the back view
    g.roundRect(-5, -23, 10, 11, 3).fill({ color: 0x000000, alpha: 0.22 });
  } else {
    // Subtle shading edge on the front/profile
    g.roundRect(-7, -12, 14, 5, 2).fill({ color: 0x000000, alpha: 0.08 });
  }

  // Head
  g.circle(0, -30, 7.5).fill(palette.skin);
  g.circle(0, -30, 7.5).stroke({ color: 0xffffff, alpha: 0.2, width: 1 });
  if (facing === "N") {
    // Back of the head is mostly hair
    g.ellipse(0, -31, 7.5, 6).fill(palette.hair);
  } else {
    g.ellipse(facing === "E" ? -1.5 : 0, -34, 7, 4).fill(palette.hair);
    if (facing === "S") {
      g.circle(-2.6, -29.5, 1.1).fill(0x22262e);
      g.circle(2.6, -29.5, 1.1).fill(0x22262e);
    } else {
      g.circle(3.4, -29.5, 1.1).fill(0x22262e);
    }
  }
  return g;
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

/** Shared soft drop-shadow ellipse. */
export function bakeShadowTexture(renderer: Renderer): Texture {
  const g = new Graphics();
  g.ellipse(0, 0, 11, 5).fill({ color: 0x000000, alpha: 0.3 });
  return bake(renderer, g);
}

export function destroyTextures(textures: Texture[]): void {
  for (const t of textures) t.destroy(true);
}
