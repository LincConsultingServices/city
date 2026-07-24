// Café interior sprites — curated from Kenney's "Isometric Miniature Library"
// pack (public/assets/ASSETS_LICENSES.md), cropped to their bounding box and
// renamed under public/assets/cafe/. Building-owned (PRD_City_Frontend.md §7.3:
// "Interior module, layout, props" — never shared with world/assets.ts).
import { Assets, Texture } from "pixi.js";

const BASE = "/assets/cafe";

const KEYS = [
  "cafe_counter",
  "cafe_shelf",
  "cafe_table",
  "cafe_chair",
  "cafe_lamp",
  "cafe_rug",
] as const;
export type CafeAssetKey = (typeof KEYS)[number];

let loaded = false;

export async function loadCafeAssets(): Promise<void> {
  if (loaded) return;
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
