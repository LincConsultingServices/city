// City asset manifest + loader (PRD §14). Curated CC0 sprites from the Kenney
// isometric packs (see public/assets/ASSETS_LICENSES.md), copied with semantic
// names into public/assets/city/. Two sprite families:
//   • 132-wide tiles (city/landscape/buildings ground pieces) — native to the
//     132×66 grid (iso.ts), drawn at 1×.
//   • 99-wide modular pieces (floors/roofs) + 100-scale vehicles/trees — scaled
//     by STACK_SCALE (≈1.333) so their 100×50 diamond matches a 132×66 tile.
import { Assets, Texture } from "pixi.js";
import { TILE_H } from "@/lib/iso";
import type { District, PropKind } from "./cityMap";

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
  "ground_plaza",
  "ground_plaza2",
  "ground_pave_tree",
  "ground_lawn",
  "ground_fountain",
  "ground_lamp",
  "ground_bench",
  "ground_pool",
  "ground_asphalt",
  "road_ew",
  "road_ns",
  "road_cross",
  "road_cw_ew",
  "road_cw_ns",
  "ground_grass",
  "ground_grass2",
  "ground_dirt",
  "ground_grass3",
  "ground_dirt2",
  "ground_pool2",
  "ground_tree_path",
  "ground_parking",
  "ground_parking2",
  // props
  "prop_lamp",
  "prop_lamp2",
  "prop_lamp_thin",
  "prop_billboard",
  "prop_tree",
  "prop_tree_round",
  "prop_bench2",
  "prop_bench3",
  "prop_barrier_red",
  // particle / effect textures (greyscale, tinted at use)
  "fx_soft",
  "fx_dust",
  "fx_smoke",
  "fx_cloud",
  "fx_leaf",
  "fx_confetti",
  "fx_star",
  "fx_glow",
  // parked cars (static street dressing)
  "parked_blue",
  "parked_red",
  "parked_silver",
  "parked_green",
  // building grounds (132-wide, complete single stories)
  "g_awn_green",
  "g_awn_green2",
  "g_awn_orange",
  "g_awn_shop",
  "g_brown_door",
  "g_cream_arch",
  "g_cream_win",
  "g_plain",
  "g_red_arch",
  "g_shop_red",
  "g_shopfront",
  "g_stand",
  "g_awn_red",
  "g_win_blue",
  "g_win_blue2",
  "g_brown_arch_wide",
  "g_brown_arch_tall",
  "g_awn_green3",
  "g_awn_blue",
  "g_awn_orange2",
  "g_cream_arch2",
  "g_red_arch2",
  "g_red_top",
  "g_shop_green",
  "g_shop_small",
  "g_garage",
  // building grounds/floors (99-wide stackable family)
  "g_brown_arch",
  "g_glass_band",
  "g_glass_big",
  "g_glass_brown",
  "g_glass_store",
  "g_red_windows",
  "g_windows_wide",
  "g_windows_wide2",
  "g_glass_wide",
  "g_glass_orange",
  "g_red_band",
  "g_red_glass",
  "g_arch_brown2",
  "f_blue_win",
  "f_cream",
  "f_cream_arch",
  "f_plain",
  "f_red_arch",
  "f_yellow",
  "f_brown",
  "f_cream2",
  "f_pale",
  "f_white",
  "f_yellow2",
  "f_gray",
  "f_blue2",
  // roofs (99-wide)
  "r_flat",
  "r_flat2",
  "r_flat_ac",
  "r_flat_ac2",
  "r_slope_beige",
  "r_slope_gray",
  "r_slope_orange",
  "r_slope_red",
  "r_round_gray",
  "r_round_red",
  "r_slope_orange2",
  "r_slope_red2",
  "r_slope_gray2",
  "r_curve_orange",
  "r_curve_red",
  "r_curve_gray",
  "r_curve_dark",
  "r_flat_ac3",
  "r_flat_box",
  // vehicles (cardinal directions)
  "car_taxi_E",
  "car_taxi_N",
  "car_taxi_S",
  "car_taxi_W",
  "car_police_E",
  "car_police_N",
  "car_police_S",
  "car_police_W",
  "car_amb_E",
  "car_amb_N",
  "car_amb_S",
  "car_amb_W",
  "car_garbage_E",
  "car_garbage_N",
  "car_garbage_S",
  "car_garbage_W",
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
  downtown: [
    null,
    null,
    null,
    null,
    null,
    null,
    "ground_pave_tree",
    null,
    "ground_lawn",
    null,
    "ground_tree_path",
    "ground_bench",
  ],
  market: [
    null,
    null,
    null,
    null,
    null,
    "ground_bench",
    null,
    null,
    null,
    "ground_pave_tree",
    null,
    null,
  ],
  // IMPORTANT: a district's variety tiles must share its base tile's skirt depth
  // (see groundSkirt). A shallow-skirt tile drawn in front of a deep-skirt one
  // fails to cover its side wall, leaving a dark step across the ground — so
  // grass blocks (33) never mix with flat landscape tiles (17), and so on.
  // Campus/civic also stay plainly green: trees and benches are explicit props.
  campus: [
    null,
    null,
    "ground_grass3",
    null,
    null,
    null,
    null,
    "ground_grass3",
    null,
    null,
    null,
    null,
  ],
  tech: [
    null,
    null,
    null,
    "ground_lawn",
    null,
    "ground_parking",
    null,
    "ground_pave_tree",
    null,
    "ground_parking2",
    "ground_asphalt",
    "ground_pool2",
  ],
  industrial: [
    null,
    null,
    null,
    "ground_dirt2",
    null,
    null,
    null,
    "ground_dirt2",
    null,
    null,
    null,
    null,
  ],
  civic: [null, null, null, null, null, "ground_grass3", null, null, null, null, null, null],
};

/**
 * Skirt depth for a ground key (how far the tile art hangs below the diamond).
 * Derived from the loaded texture rather than a hand-kept list, so new tiles
 * from any pack land at the right height: a flat tile's art is the 132×66
 * diamond plus its skirt, and anything taller than SKIRT_CITY is a feature
 * sticking *up* (trees, lamps), which doesn't deepen the skirt.
 */
export function groundSkirt(key: AssetKey): number {
  const h = tex(key)?.height;
  if (!h) return SKIRT_CITY;
  return Math.min(h - TILE_H, SKIRT_CITY);
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
  bank: {
    type: "stack",
    ground: "g_brown_arch",
    floors: ["f_cream_arch", "f_cream_arch"],
    roof: "r_flat_ac",
  },
  stock_exchange: {
    type: "stack",
    ground: "g_glass_brown",
    floors: ["f_blue_win", "f_blue_win"],
    roof: "r_flat2",
  },
  venture_capitalist: {
    type: "stack",
    ground: "g_glass_store",
    floors: ["f_red_arch"],
    roof: "r_flat_ac2",
  },
  // Market Street — warm storefronts
  ice_cream_cart: { type: "single", key: "g_stand" },
  fashion_brand: {
    type: "stack",
    ground: "g_red_windows",
    floors: ["f_cream"],
    roof: "r_slope_red",
  },
  the_shop: { type: "single", key: "g_awn_shop" },
  // Campus Quarter
  school: { type: "stack", ground: "g_windows_wide", floors: ["f_yellow"], roof: "r_slope_beige" },
  gym: { type: "stack", ground: "g_windows_wide2", floors: [], roof: "r_round_gray" },
  // Tech Park — tallest glass
  ai_it: {
    type: "stack",
    ground: "g_glass_big",
    floors: ["f_blue_win", "f_plain", "f_blue_win"],
    roof: "r_flat_ac",
  },
  social_media: { type: "stack", ground: "g_glass_band", floors: ["f_plain"], roof: "r_flat" },
  // Industrial Edge
  race_car: { type: "stack", ground: "g_windows_wide2", floors: [], roof: "r_round_red" },
  custom: { type: "stack", ground: "g_red_windows", floors: ["f_plain"], roof: "r_slope_gray" },
  // Civic Center
  trophy_hall: {
    type: "stack",
    ground: "g_brown_arch",
    floors: ["f_cream_arch"],
    roof: "r_slope_orange",
  },
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
  // Expanded set — district skyline personality from existing sprites only.
  { type: "single", key: "g_cream_arch" }, // 7 stately downtown arches
  { type: "single", key: "g_red_arch" }, // 8 brick row
  { type: "single", key: "g_awn_green2" }, // 9 market awnings
  { type: "stack", ground: "g_windows_wide", floors: [], roof: "r_flat_ac2" }, // 10 warehouse + AC
  { type: "stack", ground: "g_brown_arch", floors: ["f_cream"], roof: "r_slope_gray" }, // 11 townhouse
  { type: "single", key: "g_plain" }, // 12 quiet low-rise
  { type: "stack", ground: "g_glass_band", floors: ["f_blue_win"], roof: "r_flat2" }, // 13 office
  { type: "stack", ground: "g_windows_wide2", floors: [], roof: "r_flat_ac" }, // 14 industrial flat
  { type: "stack", ground: "g_glass_big", floors: ["f_blue_win", "f_blue_win"], roof: "r_flat" }, // 15 tall glass
  { type: "stack", ground: "g_glass_store", floors: ["f_plain", "f_plain"], roof: "r_flat2" }, // 16 mid tower
  // Real sprites from the full Kenney packs — genuine variety, not tint reuse.
  { type: "single", key: "g_awn_red" }, // 17 red-awning corner shop
  { type: "single", key: "g_win_blue" }, // 18 blue-window block
  { type: "single", key: "g_brown_arch_wide" }, // 19 wide brick arcade
  { type: "single", key: "g_awn_green3" }, // 20 greengrocer
  { type: "single", key: "g_brown_arch_tall" }, // 21 tall brick arcade
  { type: "single", key: "g_red_top" }, // 22 red-capped block
  { type: "single", key: "g_cream_arch2" }, // 23 cream arcade
  { type: "single", key: "g_red_arch2" }, // 24 red arcade
  { type: "single", key: "g_awn_blue" }, // 25 blue-awning store
  { type: "single", key: "g_shop_green" }, // 26 green shopfront
  { type: "single", key: "g_garage" }, // 27 garage / depot
  { type: "single", key: "g_awn_orange2" }, // 28 orange-awning cafe front
  { type: "single", key: "g_shop_small" }, // 29 small kiosk
  { type: "single", key: "g_win_blue2" }, // 30 glassy low-rise
  { type: "stack", ground: "g_glass_wide", floors: ["f_white"], roof: "r_curve_gray" }, // 31
  { type: "stack", ground: "g_glass_orange", floors: ["f_cream2"], roof: "r_slope_orange2" }, // 32
  { type: "stack", ground: "g_red_band", floors: ["f_pale"], roof: "r_slope_red2" }, // 33
  { type: "stack", ground: "g_red_glass", floors: ["f_gray"], roof: "r_curve_red" }, // 34
  { type: "stack", ground: "g_arch_brown2", floors: ["f_brown"], roof: "r_curve_orange" }, // 35
  { type: "stack", ground: "g_glass_big", floors: ["f_blue2", "f_white"], roof: "r_flat_box" }, // 36
  { type: "stack", ground: "g_windows_wide", floors: ["f_yellow2"], roof: "r_slope_gray2" }, // 37
  { type: "stack", ground: "g_glass_store", floors: ["f_gray", "f_blue2"], roof: "r_flat_ac3" }, // 38
  { type: "stack", ground: "g_red_windows", floors: ["f_brown"], roof: "r_curve_dark" }, // 39
];

/** Subtle multiplicative washes cycled deterministically across fillers so the
 * repeated sprites read as distinct buildings. White = untinted. */
export const FILLER_TINTS: number[] = [
  0xffffff, 0xf4e8d8, 0xffffff, 0xe6edf7, 0xffffff, 0xf1e3e3, 0xffffff, 0xe9f0e4,
];

/** Sprite for each map prop kind (null = drawn procedurally, e.g. the plaque). */
export const PROP_TEXTURE: Record<PropKind, AssetKey | null> = {
  // Trees use the 32×45 city-pack sprite, not the roads pack's 11–19px ones:
  // against a 132px tile the latter were ~10× under-dense and rendered as
  // featureless green pills. Variety comes from tint + target size instead.
  tree_tall: "prop_tree",
  tree_short: "prop_tree_round",
  conifer: "prop_tree",
  lamp: "prop_lamp",
  lamp2: "prop_lamp2",
  lamp_thin: "prop_lamp_thin",
  fountain: "ground_fountain",
  billboard: "prop_billboard",
  bench: "ground_bench",
  street_bench: "prop_bench2",
  street_bench2: "prop_bench3",
  barrier: "prop_barrier_red",
  pool: "ground_pool",
  tree_prop: "prop_tree",
  tree_round: "prop_tree_round",
  parked_blue: "parked_blue",
  parked_red: "parked_red",
  parked_silver: "parked_silver",
  parked_green: "parked_green",
  plaque: null,
};

/** Props drawn as full ground tiles (replace the base tile, no upright sprite). */
export const GROUND_PROPS: ReadonlySet<PropKind> = new Set(["fountain", "bench", "pool"]);

/**
 * Target on-screen WIDTH in world px for each upright prop, against the 132px
 * tile. Scale is derived from the real texture at runtime (`propScale`) rather
 * than hand-tuned multipliers, so a prop's size stays physically right no
 * matter which pack its art came from — the mistake that made 12px trees get
 * blown up 2.1× and read as pills. `spriteDensity.test.ts` guards the ratio.
 */
export const PROP_TARGET_W: Partial<Record<PropKind, number>> = {
  lamp: 30,
  lamp2: 30,
  lamp_thin: 30,
  billboard: 116,
  tree_prop: 56,
  tree_round: 52,
  tree_tall: 60,
  tree_short: 50,
  conifer: 46,
  street_bench: 46,
  street_bench2: 46,
  barrier: 44,
  parked_blue: 58,
  parked_red: 58,
  parked_silver: 58,
  parked_green: 58,
};

/** Subtle per-kind tint so the two tree sprites read as a varied canopy. */
export const PROP_TINT: Partial<Record<PropKind, number>> = {
  tree_tall: 0xffffff,
  tree_short: 0xd9f0c4,
  conifer: 0xbcd9b0,
  tree_prop: 0xeaf7e0,
};

/** Display scale for an upright prop: target width ÷ real texture width. */
export function propScale(kind: PropKind): number {
  const target = PROP_TARGET_W[kind];
  const key = PROP_TEXTURE[kind];
  if (!target || !key) return 1;
  const w = tex(key)?.width;
  return w ? target / w : 1;
}

// ── Vehicles ──────────────────────────────────────────────────────────────────

export type CarKind = "taxi" | "police" | "amb" | "garbage";
export type Cardinal = "N" | "E" | "S" | "W";

export const carTexture = (kind: CarKind, dir: Cardinal): Texture =>
  tex(`car_${kind}_${dir}` as AssetKey);
