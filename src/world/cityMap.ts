// City map data (F0 overworld). Data-driven so the real map/venues are content,
// not code (PRD §6.1, §12.2). A 4×4 grid of blocks separated by 1-cell avenues
// (the Kenney street tiles are complete two-way streets with sidewalks), six
// districts, the competency venues + Shop/Trophy Hall placed by district, plus
// decorative filler buildings and props (trees/lamps/fountain). Building
// INTERIORS are intentionally not scaffolded yet — main city UI only.
import type { Grid, Cell } from "@/lib/pathfinding";

export const BLOCK = 11; // road every BLOCK cells (1-cell road + 10-cell block interior)
export const BLOCKS = 4;
export const GRID_W = BLOCKS * BLOCK + 1; // 45
export const GRID_H = BLOCKS * BLOCK + 1;
export const SPAWN: Cell = { x: 17, y: 17 }; // civic plaza

export type District = "downtown" | "market" | "campus" | "tech" | "industrial" | "civic";

export const DISTRICT_NAME: Record<District, string> = {
  downtown: "Downtown",
  market: "Market Street",
  campus: "Campus Quarter",
  tech: "Tech Park",
  industrial: "Industrial Edge",
  civic: "Civic Center",
};

// [br][bc] → district for each of the 4×4 blocks.
const DISTRICT_GRID: District[][] = [
  ["downtown", "downtown", "market", "market"],
  ["downtown", "civic", "civic", "market"],
  ["campus", "civic", "industrial", "industrial"],
  ["campus", "campus", "tech", "tech"],
];

export function isRoad(x: number, y: number): boolean {
  return x % BLOCK === 0 || y % BLOCK === 0;
}

export function districtAt(x: number, y: number): District {
  const bc = Math.min(BLOCKS - 1, Math.floor(Math.max(0, x - 1) / BLOCK));
  const br = Math.min(BLOCKS - 1, Math.floor(Math.max(0, y - 1) / BLOCK));
  return DISTRICT_GRID[br][bc];
}

export type VenueKind = "competency" | "shop" | "trophy" | "locked" | "cafe";

export interface CityBuilding {
  id: string;
  displayName: string;
  district: District;
  kind: VenueKind;
  footprintTiles: Cell[];
  entranceTile: Cell; // the walkable cell you stand on to enter
  competency?: string;
  level?: string;
  hostedActivities: string[];
  interactable: boolean;
}

/** Rect footprint helper: w×h tiles anchored at (fx,fy); entrance centered below. */
function rect(fx: number, fy: number, w: number, h: number): { footprintTiles: Cell[]; entranceTile: Cell } {
  const footprintTiles: Cell[] = [];
  for (let dy = 0; dy < h; dy++)
    for (let dx = 0; dx < w; dx++) footprintTiles.push({ x: fx + dx, y: fy + dy });
  return { footprintTiles, entranceTile: { x: fx + Math.floor(w / 2), y: fy + h } };
}

/** Block-interior origin: block (bc,br) interior starts at (bc*BLOCK+1, br*BLOCK+1). */
const blockOrigin = (bc: number, br: number) => ({ ox: bc * BLOCK + 1, oy: br * BLOCK + 1 });

function venue(
  id: string,
  displayName: string,
  district: District,
  bc: number,
  br: number,
  dx: number,
  dy: number,
  w: number,
  h: number,
  opts: Partial<CityBuilding> = {},
): CityBuilding {
  const { ox, oy } = blockOrigin(bc, br);
  return {
    id,
    displayName,
    district,
    kind: "competency",
    interactable: true,
    hostedActivities: [],
    ...rect(ox + dx, oy + dy, w, h),
    ...opts,
  };
}

export const VENUES: CityBuilding[] = [
  // Downtown (blocks 0,0 / 1,0 / 0,1)
  venue("bank", "Bank", "downtown", 0, 0, 2, 2, 3, 2, { competency: "C4", level: "BEGINNER" }),
  venue("stock_exchange", "Stock Exchange", "downtown", 1, 0, 2, 2, 3, 2, { competency: "C4", level: "BEGINNER" }),
  venue("venture_capitalist", "Venture Capitalist", "downtown", 0, 1, 2, 2, 2, 2, { competency: "C3", level: "BEGINNER" }),
  // Market Street (blocks 2,0 / 3,0 / 3,1)
  venue("ice_cream_cart", "Ice Cream Cart", "market", 2, 0, 3, 2, 2, 2, {
    competency: "C4",
    level: "BEGINNER",
    hostedActivities: ["C4-BEG-09", "C4-BEG-11"],
  }),
  venue("fashion_brand", "Fashion Brand", "market", 3, 0, 2, 2, 2, 2, { competency: "C8", level: "BEGINNER" }),
  venue("cafe", "Café", "market", 2, 0, 0, 5, 2, 2, { kind: "cafe" }), // dedicated stub — build out later
  venue("the_shop", "The Shop", "market", 3, 1, 3, 3, 2, 2, { kind: "shop" }),
  // Campus Quarter (blocks 0,2 / 0,3 / 1,3)
  venue("school", "School / College", "campus", 0, 2, 2, 2, 3, 2, { competency: "C2", level: "BEGINNER" }),
  venue("gym", "Gym", "campus", 1, 3, 2, 2, 2, 2, { competency: "C9", level: "BEGINNER" }),
  // Tech Park (blocks 2,3 / 3,3)
  venue("ai_it", "AI IT Company", "tech", 2, 3, 2, 2, 3, 2, { competency: "C2", level: "BEGINNER" }),
  venue("social_media", "Social Media Studio", "tech", 3, 3, 2, 2, 2, 2, { competency: "C8", level: "BEGINNER" }),
  // Industrial Edge (blocks 2,2 / 3,2)
  venue("race_car", "Race Car Mfg", "industrial", 2, 2, 2, 2, 3, 2, { competency: "C5", level: "BEGINNER" }),
  venue("custom", "Custom (client)", "industrial", 3, 2, 3, 2, 2, 2, { kind: "locked" }),
  // Civic Center (block 1,1; block 2,1 + 1,2 stay open as the park/plaza)
  venue("trophy_hall", "Trophy Hall", "civic", 1, 1, 2, 2, 2, 2, { kind: "trophy" }),
];

// ── Filler buildings (decorative, block movement, no prompt) ──────────────────

export interface FillerBuilding {
  footprintTiles: Cell[];
  visualIndex: number; // → FILLER_VISUALS
}

function filler(bc: number, br: number, dx: number, dy: number, w: number, h: number, visualIndex: number): FillerBuilding {
  const { ox, oy } = blockOrigin(bc, br);
  return { footprintTiles: rect(ox + dx, oy + dy, w, h).footprintTiles, visualIndex };
}

export const FILLERS: FillerBuilding[] = [
  filler(0, 0, 6, 6, 2, 2, 0),
  filler(1, 0, 6, 6, 2, 2, 1),
  filler(2, 0, 7, 6, 2, 2, 3),
  filler(3, 0, 6, 6, 2, 2, 5),
  filler(0, 1, 6, 6, 2, 2, 2),
  filler(3, 1, 7, 7, 2, 2, 6),
  filler(0, 2, 6, 6, 2, 2, 4),
  filler(2, 2, 7, 6, 2, 2, 2),
  filler(0, 3, 5, 6, 2, 2, 1),
  filler(1, 3, 6, 6, 2, 2, 0),
  filler(2, 3, 7, 6, 2, 2, 4),
  filler(3, 3, 6, 6, 2, 2, 6),
];

// ── Props (visual only; trees block movement, lamps/fountain don't) ───────────

export type PropKind = "tree_tall" | "tree_short" | "conifer" | "lamp" | "fountain";

export interface CityProp {
  kind: PropKind;
  cell: Cell;
  blocking: boolean;
}

function treesInBlock(bc: number, br: number, spots: Array<[number, number]>, kind: PropKind = "tree_tall"): CityProp[] {
  const { ox, oy } = blockOrigin(bc, br);
  return spots.map(([dx, dy]) => ({ kind, cell: { x: ox + dx, y: oy + dy }, blocking: true }));
}

export const PROPS: CityProp[] = [
  // Civic park (block 2,1 and 1,2 are open green): fountain + tree ring
  { kind: "fountain", cell: { x: 27, y: 17 }, blocking: false },
  ...treesInBlock(2, 1, [[2, 2], [7, 2], [2, 7], [7, 7]], "tree_tall"),
  ...treesInBlock(1, 2, [[2, 2], [7, 3], [3, 7], [7, 7]], "conifer"),
  // Campus greenery
  ...treesInBlock(0, 2, [[7, 2], [2, 6]], "tree_short"),
  ...treesInBlock(0, 3, [[2, 2], [8, 3]], "tree_tall"),
  ...treesInBlock(1, 3, [[7, 2]], "conifer"),
  // Street lamps at block corners near the civic crossroads (non-blocking)
  { kind: "lamp", cell: { x: 12, y: 12 }, blocking: false },
  { kind: "lamp", cell: { x: 32, y: 12 }, blocking: false },
  { kind: "lamp", cell: { x: 12, y: 32 }, blocking: false },
  { kind: "lamp", cell: { x: 32, y: 32 }, blocking: false },
];

// ── Walkability ───────────────────────────────────────────────────────────────

const blocked = new Set<string>([
  ...VENUES.flatMap((v) => v.footprintTiles.map((t) => `${t.x},${t.y}`)),
  ...FILLERS.flatMap((f) => f.footprintTiles.map((t) => `${t.x},${t.y}`)),
  ...PROPS.filter((p) => p.blocking).map((p) => `${p.cell.x},${p.cell.y}`),
]);

export const cityGrid: Grid = {
  width: GRID_W,
  height: GRID_H,
  isWalkable: (x, y) => x >= 0 && y >= 0 && x < GRID_W && y < GRID_H && !blocked.has(`${x},${y}`),
};

/** Road cells that get a crosswalk texture: the road cell straight out from each
 * venue entrance (the "walk to the venue" moment reads at a glance). */
export const CROSSWALKS = new Set<string>(
  VENUES.map((v) => {
    const e = v.entranceTile;
    // nearest road cell below the entrance column
    const roadY = Math.ceil(e.y / BLOCK) * BLOCK;
    return `${e.x},${roadY}`;
  }),
);

const manhattan = (a: Cell, b: Cell) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

/** The interactable venue whose entrance the player is on or next to, if any. */
export function venueNear(cell: Cell): CityBuilding | null {
  for (const v of VENUES) {
    if (v.interactable && manhattan(cell, v.entranceTile) <= 1) return v;
  }
  return null;
}
