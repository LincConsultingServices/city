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
