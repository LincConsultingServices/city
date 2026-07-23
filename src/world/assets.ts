// City asset manifest + loader (PRD §14). Curated CC0 sprites from the Kenney
// isometric packs (see public/assets/ASSETS_LICENSES.md), copied with semantic
// names into public/assets/city/. Two sprite families:
//   • 132-wide tiles (city/landscape/buildings ground pieces) — native to the
//     132×66 grid (iso.ts), drawn at 1×.
//   • 99-wide modular pieces (floors/roofs) + 100-scale vehicles/trees — scaled
//     by STACK_SCALE (≈1.333) so their 100×50 diamond matches a 132×66 tile.
import { Assets, Texture } from "pixi.js";
import type { District } from "./cityMap";

/** Scale for the 99/100-wide sprite family (→ 132-wide). */
export const STACK_SCALE = 132 / 99;
/** Wall height of one stacked story, in native 99-scale pixels. */
export const STORY_H = 35;
/** Skirt (dirt/pavement below the diamond's front vertex) per family. */
export const SKIRT_CITY = 35; // city-pack ground tiles (132×99..131)
export const SKIRT_LAND = 17; // landscape-pack tiles (132×83)

const BASE = "/assets/city";

// Every curated sprite: key → file (all under public/assets/city/).
const KEYS = [
  // ground / roads
  "ground_plaza", "ground_plaza2", "ground_pave_tree", "ground_lawn", "ground_fountain",
  "ground_lamp", "ground_bench", "ground_pool", "ground_asphalt",
  "road_ew", "road_ns", "road_cross", "road_cw_ew", "road_cw_ns",
  "ground_grass", "ground_grass2", "ground_dirt",
  // props
  "prop_lamp", "prop_lamp2", "prop_billboard", "prop_tree", "tree_tall", "tree_short", "conifer_tall",
  // building grounds (132-wide, complete single stories)
  "g_awn_green", "g_awn_green2", "g_awn_orange", "g_awn_shop", "g_brown_door", "g_cream_arch",
  "g_cream_win", "g_plain", "g_red_arch", "g_shop_red", "g_shopfront", "g_stand",
  // building grounds/floors (99-wide stackable family)
  "g_brown_arch", "g_glass_band", "g_glass_big", "g_glass_brown", "g_glass_store",
  "g_red_windows", "g_windows_wide", "g_windows_wide2",
  "f_blue_win", "f_cream", "f_cream_arch", "f_plain", "f_red_arch", "f_yellow",
  // roofs (99-wide)
  "r_flat", "r_flat2", "r_flat_ac", "r_flat_ac2",
  "r_slope_beige", "r_slope_gray", "r_slope_orange", "r_slope_red", "r_round_gray", "r_round_red",
  // vehicles (cardinal directions)
  "car_taxi_E", "car_taxi_N", "car_taxi_S", "car_taxi_W",
  "car_police_E", "car_police_N", "car_police_S", "car_police_W",
  "car_amb_E", "car_amb_N", "car_amb_S", "car_amb_W",
] as const;

export type AssetKey = (typeof KEYS)[number];

let loaded = false;

export async function loadCityAssets(): Promise<void> {
  if (loaded) return;
  // HMR-safe: module state resets on hot reload but Pixi's Assets cache is
  // global — re-adding an existing bundle throws/warns, so guard it.
  try {
    Assets.addBundle(
      "city",
      KEYS.map((k) => ({ alias: k, src: `${BASE}/${k}.png` })),
    );
  } catch {
    /* bundle already registered from a previous HMR pass */
  }
  await Assets.loadBundle("city");
  loaded = true;
}

export const tex = (key: AssetKey): Texture => Assets.get<Texture>(key);

// ── Ground selection ──────────────────────────────────────────────────────────

/** Base ground tile per district (variety tiles are sprinkled on top of this). */
export const DISTRICT_GROUND: Record<District, AssetKey> = {
  downtown: "ground_plaza",
  market: "ground_plaza2",
  campus: "ground_grass",
  tech: "ground_plaza",
  industrial: "ground_dirt",
  civic: "ground_grass2",
};

/** Deterministic variety tiles per district (index = a stable cell hash % list length; null = base). */
export const DISTRICT_VARIETY: Record<District, (AssetKey | null)[]> = {
  downtown: [null, null, null, null, null, null, "ground_pave_tree", null, "ground_lawn", null, null, "ground_bench"],
  market: [null, null, null, null, null, "ground_bench", null, null, null, "ground_pave_tree", null, null],
  campus: [null, null, null, null, null, null, null, null, null, null, null, null], // trees are props here
  tech: [null, null, null, "ground_lawn", null, null, null, "ground_pave_tree", null, null, null, "ground_pool"],
  industrial: [null, null, null, null, null, null, null, null, "ground_asphalt", null, "ground_asphalt", null],
  civic: [null, null, null, null, null, null, null, null, null, null, null, null], // fountain/trees placed explicitly
};

/** Skirt depth for a ground key (how far the tile art hangs below the diamond). */
export function groundSkirt(key: AssetKey): number {
  if (key === "ground_dirt") return SKIRT_LAND; // 132×83 flat tile
  if (key === "ground_grass" || key === "ground_grass2") return 33; // seamless block, 132×99
  return SKIRT_CITY;
}

/** Road tile by neighbor situation. Our avenues are 1 cell wide on block spines. */
export function roadTile(onNS: boolean, onEW: boolean, crosswalk: boolean): AssetKey {
  if (onNS && onEW) return "road_cross";
  if (crosswalk) return onNS ? "road_cw_ns" : "road_cw_ew";
  return onNS ? "road_ns" : "road_ew";
}

// ── Venue visuals ─────────────────────────────────────────────────────────────

export type VenueVisual =
  | { type: "single"; key: AssetKey } // one 132-wide complete storefront
  | { type: "stack"; ground: AssetKey; floors: AssetKey[]; roof: AssetKey }; // 99-wide tower

/** Per-venue building look (PRD §7.4 themes, from the curated Kenney pieces). */
export const VENUE_VISUAL: Record<string, VenueVisual> = {
  // Downtown — stately/glassy towers
  bank: { type: "stack", ground: "g_brown_arch", floors: ["f_cream_arch", "f_cream_arch"], roof: "r_flat_ac" },
  stock_exchange: { type: "stack", ground: "g_glass_brown", floors: ["f_blue_win", "f_blue_win"], roof: "r_flat2" },
  venture_capitalist: { type: "stack", ground: "g_glass_store", floors: ["f_red_arch"], roof: "r_flat_ac2" },
  // Market Street — warm storefronts
  ice_cream_cart: { type: "single", key: "g_stand" },
  fashion_brand: { type: "stack", ground: "g_red_windows", floors: ["f_cream"], roof: "r_slope_red" },
  the_shop: { type: "single", key: "g_awn_shop" },
  // Campus Quarter
  school: { type: "stack", ground: "g_windows_wide", floors: ["f_yellow"], roof: "r_slope_beige" },
  gym: { type: "stack", ground: "g_windows_wide2", floors: [], roof: "r_round_gray" },
  // Tech Park — tallest glass
  ai_it: { type: "stack", ground: "g_glass_big", floors: ["f_blue_win", "f_plain", "f_blue_win"], roof: "r_flat_ac" },
  social_media: { type: "stack", ground: "g_glass_band", floors: ["f_plain"], roof: "r_flat" },
  // Industrial Edge
  race_car: { type: "stack", ground: "g_windows_wide2", floors: [], roof: "r_round_red" },
  custom: { type: "stack", ground: "g_red_windows", floors: ["f_plain"], roof: "r_slope_gray" },
  // Civic Center
  trophy_hall: { type: "stack", ground: "g_brown_arch", floors: ["f_cream_arch"], roof: "r_slope_orange" },
  // Café — dedicated venue (stub; warm orange-awning storefront)
  cafe: { type: "single", key: "g_awn_orange" },
};

/** Filler (non-interactable) building looks, cycled per placement. */
export const FILLER_VISUALS: VenueVisual[] = [
  { type: "single", key: "g_cream_win" },
  { type: "single", key: "g_brown_door" },
  { type: "stack", ground: "g_red_windows", floors: [], roof: "r_slope_beige" },
  { type: "single", key: "g_shop_red" },
  { type: "stack", ground: "g_glass_store", floors: ["f_plain"], roof: "r_flat" },
  { type: "single", key: "g_awn_green" },
  { type: "single", key: "g_shopfront" },
];

// ── Vehicles ──────────────────────────────────────────────────────────────────

export type CarKind = "taxi" | "police" | "amb";
export type Cardinal = "N" | "E" | "S" | "W";

export const carTexture = (kind: CarKind, dir: Cardinal): Texture => tex(`car_${kind}_${dir}` as AssetKey);
