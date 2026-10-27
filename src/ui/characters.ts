// The character sheet — every person in CEO City, designed once.
//
// Each design is the single source for how someone looks: the conversation
// portrait (ui/Portrait.tsx) draws it large, and the walking figure in the
// world (world/characterArt.ts) draws the same hair, beard, glasses and clothes
// at twelve pixels, via `paletteOf`. Change someone here and they change
// everywhere they appear.
//
// The looks follow the people as they are written: the café's staff in the
// house uniform, Owen in the suit of the one person who does not work in the
// room, the customers in their own clothes; MAISON's seven as PRD_Building_
// MAISON.md §5 describes them (Élise's tape measure and reading glasses, Ines's
// sunglasses pushed into her hair, Hélène dressed one stop cooler than the room).
import type { PersonPalette } from "@/world/characterArt";

export type HairStyle =
  | "short" // a side-parted crop
  | "swept" // neat, combed back from a side part
  | "buzz" // close-cropped
  | "curly"
  | "bun"
  | "ponytail"
  | "long"
  | "bob"
  | "receding"; // high forehead, the sides kept

export type Clothes =
  | "uniform" // the café's white shirt and black bib apron
  | "chef" // white double-breasted jacket
  | "suit" // jacket, white shirt, tie
  | "blazer" // jacket over a plain top
  | "tee"
  | "hoodie"
  | "cardigan" // open, over a tee in `accent`
  | "bomber"
  | "coat" // heavy coat with a scarf in `accent`
  | "shirt"; // collared shirt, sleeves rolled

export interface CharacterLook {
  /** Years. Fifty and over shows in the face: lines at the eyes and brow. */
  age?: number;
  skin: number;
  hair: number;
  hairStyle: HairStyle;
  /** Iris colour. Defaults to a warm brown. */
  eyes?: number;
  beard?: "full" | "stubble" | "goatee";
  clothes: Clothes;
  /** The main garment's colour. */
  top: number;
  /** Second colour: the apron, the tie, the scarf, the tee under a cardigan. */
  accent?: number;
  /** Trousers or skirt, for the walking figure. */
  legs: number;
  /** Frame colour, when they wear glasses. */
  glasses?: number;
  /** Glasses pushed up onto the head rather than worn. */
  glassesUp?: boolean;
  earrings?: "hoops" | "studs";
  freckles?: boolean;
  hat?: "toque" | "cap";
  hatColor?: number;
  /** Sunglasses pushed into the hair. */
  sunglasses?: boolean;
  /** A tape measure around the neck. */
  tapeMeasure?: boolean;
  expression?: "smile" | "grin" | "calm";
}

export interface CharacterDesign {
  name: string;
  role: string;
  look: CharacterLook;
}

// ── The player ───────────────────────────────────────────────────────────────

export const PLAYER: CharacterDesign = {
  name: "You",
  role: "new in town",
  look: {
    age: 23,
    skin: 0xf0d9b5,
    hair: 0x3b2d23,
    hairStyle: "short",
    eyes: 0x4a6b8a,
    clothes: "bomber",
    top: 0x3d78d8,
    accent: 0x1f3d70,
    legs: 0x2a3350,
    expression: "grin",
  },
};

/** The house uniform's colours: white shirt, black apron, black trousers. */
const UNIFORM_TOP = 0xf4f4f2;
const UNIFORM_APRON = 0x1d1d22;

// ── What the player wears ────────────────────────────────────────────────────

/**
 * The player's wardrobe. Their own clothes on the street and at the interview;
 * the house uniform once they work the counter; a suit once the branch, and then
 * the business, is theirs. The same face throughout — only the clothes change.
 */
export type PlayerOutfit = "casual" | "uniform" | "professional";

export const PLAYER_OUTFITS: Readonly<Record<PlayerOutfit, CharacterDesign>> = {
  casual: PLAYER,
  uniform: {
    name: "You",
    role: "on the counter",
    look: {
      ...PLAYER.look,
      clothes: "uniform",
      top: UNIFORM_TOP,
      accent: UNIFORM_APRON,
      legs: UNIFORM_APRON,
      expression: "smile",
    },
  },
  professional: {
    name: "You",
    role: "running the business",
    look: {
      ...PLAYER.look,
      hairStyle: "swept",
      clothes: "suit",
      top: 0x2f3a4f,
      accent: 0x3d78d8,
      legs: 0x2f3a4f,
      expression: "smile",
    },
  },
};

/** What the player wears for a career role (cafe journey roles; anything else is casual). */
export function playerOutfitFor(role: string | null | undefined): PlayerOutfit {
  switch (role) {
    case "employee":
      return "uniform";
    case "branch_manager":
    case "ceo":
      return "professional";
    default:
      return "casual";
  }
}

// ── The café ─────────────────────────────────────────────────────────────────

export const CAFE_CAST = {
  priya: {
    name: "Priya",
    role: "head barista",
    look: {
      age: 29,
      skin: 0xc98e5a,
      hair: 0x241d18,
      hairStyle: "bun",
      eyes: 0x4a2c18,
      clothes: "uniform",
      top: UNIFORM_TOP,
      accent: UNIFORM_APRON,
      legs: UNIFORM_APRON,
      earrings: "hoops",
      expression: "smile",
    },
  },
  owen: {
    name: "Owen",
    role: "the area manager",
    look: {
      age: 46,
      skin: 0xe8c9a6,
      hair: 0x2a2320,
      hairStyle: "swept",
      eyes: 0x5a4632,
      clothes: "suit",
      top: 0x2b3240,
      accent: 0x7a2a33,
      legs: 0x2b3240,
      expression: "smile",
    },
  },
  tomas: {
    name: "Tomas",
    role: "second barista",
    look: {
      age: 52,
      skin: 0xf0d9b5,
      hair: 0x6a6a6a,
      hairStyle: "buzz",
      eyes: 0x5b7a8c,
      beard: "stubble",
      clothes: "uniform",
      top: UNIFORM_TOP,
      accent: UNIFORM_APRON,
      legs: UNIFORM_APRON,
      expression: "calm",
    },
  },
  marcus: {
    name: "Marcus",
    role: "the regular",
    look: {
      age: 72,
      skin: 0x8d5a3b,
      hair: 0xd8d2c8,
      hairStyle: "receding",
      eyes: 0x3a2618,
      beard: "full",
      clothes: "coat",
      top: 0x5c3a28,
      accent: 0x9c3b30,
      legs: 0x3a3134,
      glasses: 0x6b5a3a,
      expression: "calm",
    },
  },
  nadia: {
    name: "Nadia",
    role: "the commuter",
    look: {
      age: 34,
      skin: 0xe8c9a0,
      hair: 0x201a14,
      hairStyle: "long",
      eyes: 0x3d2a1c,
      clothes: "cardigan",
      top: 0x96453f,
      accent: 0xe8dfd0,
      legs: 0x2c3a45,
      earrings: "studs",
      expression: "smile",
    },
  },
  ray: {
    name: "Ray",
    role: "the food truck",
    look: {
      age: 41,
      skin: 0xd9a066,
      hair: 0x2e2622,
      hairStyle: "curly",
      eyes: 0x3a2618,
      beard: "full",
      clothes: "tee",
      top: 0xc9a227,
      legs: 0x4a4139,
      hat: "cap",
      hatColor: 0x9c3b30,
      expression: "grin",
    },
  },
  ellery: {
    name: "Ellery",
    role: "the office buyer",
    look: {
      age: 38,
      skin: 0xf5e0c4,
      hair: 0x3b2d23,
      hairStyle: "bob",
      eyes: 0x4f6b4a,
      clothes: "blazer",
      top: 0x9fb7bd,
      accent: 0xf4f4f2,
      legs: 0x33415e,
      glasses: 0x2a2a30,
      earrings: "studs",
      freckles: true,
      expression: "calm",
    },
  },
} as const satisfies Record<string, CharacterDesign>;

export const CAFE_CREW = {
  crew_till: {
    name: "Sam",
    role: "on the till",
    look: {
      age: 22,
      skin: 0xe8c9a0,
      hair: 0x5a3a24,
      hairStyle: "ponytail",
      eyes: 0x4a2c18,
      clothes: "uniform",
      top: UNIFORM_TOP,
      accent: UNIFORM_APRON,
      legs: UNIFORM_APRON,
      freckles: true,
      expression: "smile",
    },
  },
  crew_kitchen: {
    name: "Dev",
    role: "the cook",
    look: {
      age: 31,
      skin: 0x8d5a3b,
      hair: 0x101010,
      hairStyle: "buzz",
      eyes: 0x2a1a10,
      beard: "goatee",
      clothes: "chef",
      top: UNIFORM_TOP,
      accent: UNIFORM_APRON,
      legs: UNIFORM_APRON,
      hat: "toque",
      expression: "grin",
    },
  },
} as const satisfies Record<string, CharacterDesign>;

// ── MAISON ───────────────────────────────────────────────────────────────────

export const MAISON_CAST = {
  elise: {
    name: "Élise",
    role: "head of atelier",
    look: {
      age: 54,
      skin: 0xe8cfb2,
      hair: 0xc9c6bf,
      hairStyle: "bun",
      eyes: 0x5b6b7a,
      clothes: "shirt",
      top: 0x8e9199,
      legs: 0x3f4149,
      glasses: 0x3a3a40,
      glassesUp: true,
      tapeMeasure: true,
      expression: "calm",
    },
  },
  kobby: {
    name: "Kobby",
    role: "junior designer",
    look: {
      age: 26,
      skin: 0x8a5a3c,
      hair: 0x241a14,
      hairStyle: "curly",
      eyes: 0x2a1a10,
      clothes: "bomber",
      top: 0x2f8f86,
      accent: 0xd9a03a,
      legs: 0x2b2f3a,
      earrings: "studs",
      expression: "grin",
    },
  },
  vera: {
    name: "Véra",
    role: "the mentor",
    look: {
      age: 64,
      skin: 0xecd6bc,
      hair: 0xd8d5cf,
      hairStyle: "bob",
      eyes: 0x6a8296,
      clothes: "blazer",
      top: 0x22242a,
      accent: 0x22242a,
      legs: 0x1b1d22,
      earrings: "studs",
      expression: "calm",
    },
  },
  ines: {
    name: "Ines",
    role: "the stylist",
    look: {
      age: 35,
      skin: 0xdfba95,
      hair: 0x2b2119,
      hairStyle: "long",
      eyes: 0x4a2c18,
      clothes: "coat",
      top: 0xbb9b6a,
      accent: 0xe8dfd0,
      legs: 0x35323a,
      sunglasses: true,
      earrings: "hoops",
      expression: "grin",
    },
  },
  helene: {
    name: "Hélène",
    role: "the buyer",
    look: {
      age: 47,
      skin: 0xefd9bd,
      hair: 0x453a30,
      hairStyle: "swept",
      eyes: 0x5b7a8c,
      clothes: "suit",
      top: 0x5a6a80,
      accent: 0xb9c4cf,
      legs: 0x2c333f,
      earrings: "studs",
      expression: "calm",
    },
  },
  dov: {
    name: "Dov",
    role: "the investor",
    look: {
      age: 58,
      skin: 0xe6c9a6,
      hair: 0x5b5148,
      hairStyle: "receding",
      eyes: 0x5a4632,
      beard: "stubble",
      clothes: "cardigan",
      top: 0x7c7466,
      accent: 0xf4f4f2,
      legs: 0x3a352f,
      glasses: 0x5a4632,
      expression: "smile",
    },
  },
  rio: {
    name: "Rio",
    role: "the offer",
    look: {
      age: 33,
      skin: 0xc79a72,
      hair: 0x1d1712,
      hairStyle: "swept",
      eyes: 0x2a1a10,
      beard: "stubble",
      clothes: "shirt",
      top: 0xd9d3c6,
      legs: 0x24262b,
      sunglasses: true,
      expression: "grin",
    },
  },
} as const satisfies Record<string, CharacterDesign>;

// ── The city's people ────────────────────────────────────────────────────────

/**
 * Customers and passers-by: their own clothes, a spread of looks, so a queue of
 * four never reads as four copies of one person. Also used, in order, for the
 * city's pedestrians.
 */
export const CROWD: readonly CharacterLook[] = [
  {
    skin: 0xf0d9b5,
    hair: 0x241d18,
    hairStyle: "short",
    clothes: "tee",
    top: 0xc95f4e,
    legs: 0x33415e,
  },
  {
    skin: 0xc98e5a,
    hair: 0x101010,
    hairStyle: "ponytail",
    clothes: "hoodie",
    top: 0x5fae6f,
    accent: 0x3d7a4c,
    legs: 0x4a4139,
    earrings: "studs",
  },
  {
    skin: 0x8d5a3b,
    hair: 0x201a14,
    hairStyle: "curly",
    clothes: "tee",
    top: 0xe2be78,
    legs: 0x2f3a52,
    beard: "stubble",
  },
  {
    skin: 0xf5e0c4,
    hair: 0x8a4b2c,
    hairStyle: "long",
    clothes: "cardigan",
    top: 0x8a6fd1,
    accent: 0xe8dfd0,
    legs: 0x3a3a3a,
    freckles: true,
  },
  {
    skin: 0xd9a066,
    hair: 0x2e2622,
    hairStyle: "short",
    clothes: "bomber",
    top: 0x4aa3c7,
    accent: 0x2a5f78,
    legs: 0x584a68,
    glasses: 0x2a2a30,
  },
  {
    skin: 0xf0d9b5,
    hair: 0xd8c15a,
    hairStyle: "bob",
    clothes: "hoodie",
    top: 0xd987b5,
    accent: 0xa85f86,
    legs: 0x2c3a45,
  },
  {
    skin: 0xa9714b,
    hair: 0x30281f,
    hairStyle: "buzz",
    clothes: "shirt",
    top: 0x6f8f9c,
    legs: 0x2f2f38,
    beard: "goatee",
  },
  {
    skin: 0xe8c9a0,
    hair: 0x5a5a5a,
    hairStyle: "receding",
    clothes: "coat",
    top: 0xf0954f,
    accent: 0x40506e,
    legs: 0x40506e,
    glasses: 0x6b5a3a,
    beard: "full",
  },
];

// ── Into the walking figure ──────────────────────────────────────────────────

/** The world rig's palette for a design: the same person at twelve pixels. */
export function paletteOf(look: CharacterLook): PersonPalette {
  const outfit =
    look.clothes === "uniform"
      ? "uniform"
      : look.clothes === "chef"
        ? "chef"
        : look.clothes === "suit"
          ? "suit"
          : "casual";
  return {
    shirt: look.top,
    legs: look.legs,
    skin: look.skin,
    hair: look.hair,
    outfit,
    accent: look.accent,
    hairStyle: look.hairStyle,
    beard: look.beard !== undefined && look.beard !== "stubble",
    glasses: look.glasses !== undefined && !look.glassesUp,
  };
}
