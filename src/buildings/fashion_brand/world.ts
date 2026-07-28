// MAISON world state (docs/maison.md §12) — the ten keys, a pure reducer, and
// the house in words.
//
// Two rules this module exists to keep:
//
//  1. PRESENTATION ONLY. Nothing here influences scoring. The server owns tiers;
//     this is what the house looks like afterwards.
//  2. THE RAIL HAS NO OPINION (§11). describeRail() reports what is hanging
//     there. It never says good, bad, better, or "you should have". A rail of
//     neutrals and a rail carrying somebody else's label are described in the
//     same voice, because one of them might have been the right call and this
//     building is not the thing that decides that.
//
// There is no 3D rail to look at (§0.3), so the words ARE the rail. When an
// interior lands it renders from this same state and these functions become the
// §15 verbal half of a channel that finally has two.

export const RAIL_STATES = [
  "bold",
  "bold_thin",
  "mixed",
  "neutral",
  "capsule",
  "collab",
  "thin",
] as const;
export const PRICE_TAGS = ["house", "entry", "cut"] as const;
export const HOUSE_MARKS = ["clean", "collab_logo"] as const;
export const PRESS_STATES = ["empty", "one", "mixed", "warm", "cold"] as const;
export const ATELIER_MOODS = ["steady", "strained", "fractured", "trusting"] as const;
export const CASH_STATES = ["season", "tight", "funded"] as const;
export const EQUITY_STATES = ["whole", "sold"] as const;
export const RESALE_STATES = ["strong", "soft"] as const;
export const BUYER_STATES = ["circling", "signed", "walked"] as const;
export const COUNTDOWNS = ["11w", "9w", "8w", "7w", "5w", "4w", "2w", "1w", "after"] as const;

export type Rail = (typeof RAIL_STATES)[number];
export type PriceTags = (typeof PRICE_TAGS)[number];
export type HouseMark = (typeof HOUSE_MARKS)[number];
export type Press = (typeof PRESS_STATES)[number];
export type AtelierMood = (typeof ATELIER_MOODS)[number];
export type Cash = (typeof CASH_STATES)[number];
export type Equity = (typeof EQUITY_STATES)[number];
export type Resale = (typeof RESALE_STATES)[number];
export type Buyer = (typeof BUYER_STATES)[number];
export type Countdown = (typeof COUNTDOWNS)[number];

export interface MaisonWorld {
  rail: Rail;
  price_tags: PriceTags;
  house_mark: HouseMark;
  press: Press;
  atelier_mood: AtelierMood;
  cash: Cash;
  equity: Equity;
  resale: Resale;
  buyer: Buyer;
  countdown: Countdown;
}

/** The legal value set for every key — the reducer's and the audit's contract. */
export const WORLD_DOMAIN: { readonly [K in keyof MaisonWorld]: readonly string[] } = {
  rail: RAIL_STATES,
  price_tags: PRICE_TAGS,
  house_mark: HOUSE_MARKS,
  press: PRESS_STATES,
  atelier_mood: ATELIER_MOODS,
  cash: CASH_STATES,
  equity: EQUITY_STATES,
  resale: RESALE_STATES,
  buyer: BUYER_STATES,
  countdown: COUNTDOWNS,
};

export const WORLD_KEYS = Object.keys(WORLD_DOMAIN) as (keyof MaisonWorld)[];

/** Eleven weeks out: eight vermilion pieces, one season of cash, nothing decided. */
export const INITIAL_WORLD: MaisonWorld = {
  rail: "bold",
  price_tags: "house",
  house_mark: "clean",
  press: "empty",
  atelier_mood: "steady",
  cash: "season",
  equity: "whole",
  resale: "strong",
  buyer: "circling",
  countdown: "11w",
};

/**
 * Level B starts the same season in a house it inherited (§14): the secondary
 * market is a character from beat one rather than something you discover.
 */
export const initialWorld = (track: "A" | "B"): MaisonWorld =>
  track === "B" ? { ...INITIAL_WORLD, resale: "strong", cash: "tight" } : { ...INITIAL_WORLD };

/** The beat clock (§3.5) — competency code → the number chalked on the column. */
export const COUNTDOWN_BY_COMPETENCY: Record<string, Countdown> = {
  C1: "11w",
  C2: "9w",
  C3: "8w",
  C4: "7w",
  C5: "5w",
  C6: "4w",
  C7: "2w",
  C8: "1w",
  C9: "after",
};

// ── Reducer ──────────────────────────────────────────────────────────────────

/** Pure; empty = the delta is applicable. Mirrors validateManifest's shape. */
export function validateDelta(delta: Record<string, string>): string[] {
  const problems: string[] = [];
  for (const [key, value] of Object.entries(delta)) {
    const domain = WORLD_DOMAIN[key as keyof MaisonWorld];
    if (!domain) {
      problems.push(`unknown world key '${key}'`);
    } else if (!domain.includes(value)) {
      problems.push(`'${value}' is not a legal value for '${key}' (${domain.join(" · ")})`);
    }
  }
  return problems;
}

/**
 * Apply a leaf's world delta. Invalid entries are skipped rather than thrown — a
 * typo in authored content must never take the venue down mid-season.
 * validateDelta() is the loud half, and it runs in CI over every authored leaf.
 */
export function applyDelta(state: MaisonWorld, delta: Record<string, string>): MaisonWorld {
  const next = { ...state };
  for (const [key, value] of Object.entries(delta)) {
    const domain = WORLD_DOMAIN[key as keyof MaisonWorld];
    if (!domain || !domain.includes(value)) continue;
    (next as Record<string, string>)[key] = value;
  }
  return next;
}

// ── The rail, in words (§3.3, §15) ───────────────────────────────────────────

export interface RailPiece {
  /** What the garment is, in the house's own words. */
  label: string;
  /** The printed number on the tag. */
  price: number;
  /** What the neck label says. */
  neck: string;
}

/** Placeholder price bands — the economy pass owns the real numbers. */
const PRICE_BY_TAG: Record<PriceTags, number> = { house: 890, entry: 320, cut: 445 };

interface RailShape {
  /** [count, label] pairs making up the rail, in hanging order. */
  pieces: [number, string][];
  /** The plain-language line announced on change. */
  line: string;
}

const RAIL_SHAPE: Record<Rail, RailShape> = {
  bold: {
    pieces: [[8, "vermilion"]],
    line: "the rail is eight pieces, all vermilion",
  },
  bold_thin: {
    pieces: [[6, "vermilion"]],
    line: "the rail is six vermilion pieces; none of them have moved",
  },
  mixed: {
    pieces: [
      [5, "neutral"],
      [3, "vermilion"],
    ],
    line: "the rail is vermilion and neutrals together; the neutrals outnumber the vermilion",
  },
  neutral: {
    pieces: [
      [6, "neutral"],
      [2, "vermilion"],
    ],
    line: "the rail is now mostly neutrals; two vermilion pieces remain",
  },
  capsule: {
    pieces: [
      [6, "vermilion"],
      [4, "entry line"],
    ],
    line: "a second, shorter rail stands alongside; the entry line hangs on cheaper hangers",
  },
  collab: {
    pieces: [
      [7, "vermilion"],
      [1, "capsule piece"],
    ],
    line: "one garment on the rail carries a second label",
  },
  thin: {
    pieces: [[4, "vermilion"]],
    line: "the rail is four pieces; the rest was not funded",
  },
};

/** The list a player reads when they look at the collection (§15, acceptance #4). */
export function railContents(state: MaisonWorld): RailPiece[] {
  const price = PRICE_BY_TAG[state.price_tags];
  const neck = state.house_mark === "collab_logo" ? "MAISON + the group" : "MAISON";
  const out: RailPiece[] = [];
  for (const [count, label] of RAIL_SHAPE[state.rail].pieces) {
    for (let i = 0; i < count; i += 1) out.push({ label, price, neck });
  }
  return out;
}

/** The line announced whenever the rail changes. Factual; never a verdict (§11). */
export function describeRail(state: MaisonWorld): string {
  const parts = [RAIL_SHAPE[state.rail].line];
  if (state.price_tags === "entry") parts.push("the tags read entry price");
  if (state.price_tags === "cut") parts.push("the tags have been cut");
  if (state.house_mark === "collab_logo") parts.push("the neck labels carry a second name");
  return `${parts.join("; ")}.`;
}

/** Entering the atelier announces the zone AND its state (§15). */
export function describeAtelier(state: MaisonWorld): string {
  switch (state.atelier_mood) {
    case "steady":
      return "the atelier — three machines running, the usual noise.";
    case "strained":
      return "the atelier — three machines running, nobody talking.";
    case "fractured":
      return "the atelier — one machine running, two benches empty.";
    case "trusting":
      return "the atelier — three machines running, and someone is humming.";
  }
}

/** The press wall is a reader, not an image (§15) — coverage, never quality. */
export function describePress(state: MaisonWorld): string {
  switch (state.press) {
    case "empty":
      return "the press wall — eight empty frames.";
    case "one":
      return "the press wall — one clipping, and seven frames waiting.";
    case "mixed":
      return "the press wall — two clippings that do not agree with each other.";
    case "warm":
      return "the press wall — four clippings, and the house is being written about.";
    case "cold":
      return "the press wall — two clippings, both short.";
  }
}

/** How the money reads on the atelier shelf (§12). */
export function describeCash(state: MaisonWorld): string {
  switch (state.cash) {
    case "season":
      return "the shelf holds a season of cloth.";
    case "tight":
      return "the shelf is down to a few bolts.";
    case "funded":
      return "the shelf is full, and some of it is better cloth than you used to buy.";
  }
}
