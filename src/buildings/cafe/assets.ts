// Café interior sprites — building-owned, never shared with world/assets.ts
// (PRD §7.3: "Interior module, layout, props"). Curated from Kenney's Isometric
// Miniature Library and logged in public/assets/ASSETS_LICENSES.md.
//
// This is the seam that lets real art replace procedural geometry one prop at a
// time. Most of the room stays procedural on purpose — flat iso volumes in the
// cafe.jpg palette read correctly, and the Kenney pack is wood-toned library
// furniture that would pull the room away from its oxblood reference. Only the
// two props where drawn detail genuinely beats geometry are adopted.
import { Assets, Texture } from "pixi.js";
import type { PropKind } from "./room";

const BASE = "/assets/cafe";

const KEYS = ["cafe_shelf", "cafe_lamp"] as const;
export type CafeAssetKey = (typeof KEYS)[number];

/**
 * Which prop kinds are served by a sprite instead of a procedural bake, and how
 * wide they should draw in world pixels. The width matters: assets.test.ts holds
 * these against the source PNGs so nothing is ever upscaled into mush — the
 * city's own spriteDensity.test.ts cannot see this directory.
 */
export const PROP_SPRITE: Partial<Record<PropKind, { key: CafeAssetKey; width: number }>> = {
  shelf: { key: "cafe_shelf", width: 112 },
  pendant: { key: "cafe_lamp", width: 44 },
};

let loaded = false;

export async function loadCafeAssets(): Promise<void> {
  if (loaded) return;
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

export const cafeTex = (key: CafeAssetKey): Texture => Assets.get<Texture>(key);
