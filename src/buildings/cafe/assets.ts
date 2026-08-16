// Café interior sprites — building-owned, never shared with world/assets.ts
// (PRD §7.3: "Interior module, layout, props").
//
// The seam that lets real art replace procedural geometry one prop at a time.
// It currently carries nothing, deliberately.
//
// Kenney's Isometric Miniature Library was tried and rejected. Its "shelf" is a
// library bookcase — books, an open volume on a stand, two lecterns — and its
// "lamp" is a three-candle candelabra with a hard drop shadow baked into the
// PNG. Both are drawn nearly front-on rather than on this room's 2:1 isometric
// axes, so they sit visibly skewed against everything around them, and both are
// light oak where the room is oxblood and dark wood. Wrong subject, wrong
// projection, wrong palette. The procedural back-bar shelving and hanging
// pendant in props.ts beat them on all three counts.
//
// The next sprite that genuinely helps drops in with one line here and needs no
// other change — assets.test.ts already guards whatever this table holds.
import { Assets, Texture } from "pixi.js";
import type { PropKind } from "./room";

const BASE = "/assets/cafe";

const KEYS: readonly string[] = [];
export type CafeAssetKey = string;

/**
 * Which prop kinds are served by a sprite instead of a procedural bake, and how
 * wide they should draw in world pixels. The width matters: assets.test.ts holds
 * these against the source PNGs so nothing is ever upscaled into mush — the
 * city's own spriteDensity.test.ts cannot see this directory.
 */
export const PROP_SPRITE: Partial<Record<PropKind, { key: CafeAssetKey; width: number }>> = {};

/** UI furniture that a sprite can serve instead of a `Graphics` path. */
export interface UiSprite {
  key: CafeAssetKey;
  /**
   * Nine-slice insets in source pixels. A callout is re-cut every time its line
   * changes and runs from about fifty to nearly four hundred pixels wide, so a
   * plain sprite stretched to fit pulls the balloon's round ends out of shape.
   * Only the flat middle bands may stretch; the corners and the ends hold.
   *
   * The tail cannot be held that way — it sits in the middle of the bottom band,
   * which is exactly the band that stretches. Art that ships here has to accept
   * a tail widening with the line, or arrive as a separate piece.
   */
  slice: { left: number; top: number; right: number; bottom: number };
}

/**
 * Kept apart from `PROP_SPRITE` because that table is keyed by `PropKind` and a
 * label over somebody's head is not a prop. Empty for the same reason the table
 * above is: the callout balloon is drawn as a path today (calloutView.ts). A
 * real balloon PNG — tail baked into the bottom band, so the tail point stays
 * the sprite's origin — drops in here with one line and needs no other change.
 */
export const UI_SPRITE: Partial<Record<"callout", UiSprite>> = {};

let loaded = false;

export async function loadCafeAssets(): Promise<void> {
  if (loaded || KEYS.length === 0) return;
  // HMR-safe: module state resets on hot reload but Pixi's Assets cache is
  // global — re-adding an existing bundle throws, so guard it. Same shape as
  // world/assets.ts.
  try {
    Assets.addBundle(
      "cafe",
      KEYS.map((k) => ({ alias: k, src: `${BASE}/${k}.png` })),
    );
  } catch {
    /* bundle already registered from a previous HMR pass */
  }
  await Assets.loadBundle("cafe");
  loaded = true;
}

export const cafeTex = (key: CafeAssetKey): Texture | undefined => Assets.get<Texture>(key);
