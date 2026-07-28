// What the room SHOWS for a given world state — pure, so §18.2.8's acceptance
// criterion is a test rather than a walkthrough:
//
//   "Every decision changes at least one of: the rail, the press wall, the
//    atelier's noise, or the cloth on the shelf."
//
// scene.ts renders this; it decides nothing itself. Keeping the decisions here
// means the ten keys in §12 can be proved to each land somewhere visible without
// a renderer, and it keeps the 3D room and the readable list (§15) reading off
// the same reasoning rather than two parallel switch statements.
//
// Nothing in this file ranks a state. A rail of neutrals and a rail carrying
// someone else's label are dressed with the same care, in the same light (§11).
import { GARMENT_NEUTRALS, MAISON_PALETTE } from "./props";
import { RAIL_SHAPE, type MaisonWorld } from "./world";

export interface GarmentDressing {
  color: number;
  /** The price tag's colour — house, entry, or cut (§12 `price_tags`). */
  tag: number;
  /** A second name on the neck (§12 `house_mark`). */
  collabMark: boolean;
}

export interface RoomDressing {
  /** What hangs on the brass, in hanging order. */
  garments: GarmentDressing[];
  /** Filled frames along the stair run (§12 `press`). */
  clippings: number;
  /** Bolts of cloth on the atelier shelf (§12 `cash`). */
  bolts: number;
  /** `funded` buys better cloth, not more of it. */
  boltsPremium: boolean;
  /** The number chalked on the steel column (§3.5). */
  chalk: string;
  /** The resale printout pinned by the desk (§12 `resale`). */
  printoutStrong: boolean;
  /** Hélène's boxes stacked by the door (§12 `buyer`). */
  boxes: number;
  /** A second name on the desk paperwork (§12 `equity`). */
  paperwork: number;
  /** How many of the three machines are running (§6, §12 `atelier_mood`). */
  machinesRunning: number;
  /** Someone is humming — the atelier at its best (§6). */
  humming: boolean;
}

/** Price-tag colour per band. The number itself is read off the list (§15). */
const TAG_COLOUR = {
  house: MAISON_PALETTE.bone,
  entry: MAISON_PALETTE.ash,
  cut: MAISON_PALETTE.brass,
} as const;

const CLIPPINGS = { empty: 0, one: 1, mixed: 2, cold: 2, warm: 4 } as const;
const BOLTS = { season: 4, tight: 1, funded: 2 } as const;
/** `strained` runs them longer and stops them harder; `fractured` silences two. */
const MACHINES = { steady: 3, strained: 3, fractured: 1, trusting: 3 } as const;
const BOXES = { circling: 0, signed: 3, walked: 0 } as const;

export function roomDressing(world: MaisonWorld): RoomDressing {
  const garments: GarmentDressing[] = [];
  let i = 0;
  for (const [count, label] of RAIL_SHAPE[world.rail].pieces) {
    for (let n = 0; n < count; n++, i++) {
      garments.push({
        color:
          label === "vermilion"
            ? MAISON_PALETTE.vermilion
            : GARMENT_NEUTRALS[i % GARMENT_NEUTRALS.length],
        tag: TAG_COLOUR[world.price_tags],
        collabMark: world.house_mark === "collab_logo",
      });
    }
  }

  return {
    garments,
    clippings: CLIPPINGS[world.press],
    bolts: BOLTS[world.cash],
    boltsPremium: world.cash === "funded",
    chalk: world.countdown,
    printoutStrong: world.resale === "strong",
    boxes: BOXES[world.buyer],
    // Sold equity puts a second name on the paperwork — the same desk, one more
    // signature on it (§12).
    paperwork: world.equity === "sold" ? 2 : 1,
    machinesRunning: MACHINES[world.atelier_mood],
    humming: world.atelier_mood === "trusting",
  };
}
