// Who the player is: the name they chose and the look they built, once, at the
// start of the game.
//
// There is one identity and everything reads it. The walking figure in the
// city, the café and MAISON; the portrait behind every conversation; the name
// on the HUD, on a speaker tag, in a greeting — all of them come from here, so
// the player never looks like one person in the world and another in a scene.
// At work only the clothes change (ui/characters.ts §dressPlayer): the house
// uniform on the counter, a suit once the branch is theirs.
//
// Stored on the account, in the city document beside the track (cityState),
// and mirrored in this browser under the signed-in player's own key, so it
// survives a reload offline and two accounts in one browser never swap faces.
// A manual save carries a copy (framework/saves/manualSave.ts), so loading a
// save brings back the character that career was played as.
import { create } from "zustand";
import { isConfigured } from "@/framework/config/appConfig";
import { auth } from "@/framework/auth/firebase";
import { loadJson, saveJson } from "@/lib/persist";
import { saveCharacter, serverCityBlob } from "@/framework/city/cityState";
import type { PersonPalette } from "@/world/characterArt";
import {
  PLAYER,
  dressPlayer,
  paletteOf,
  type CharacterLook,
  type Clothes,
  type HairStyle,
  type PlayerOutfit,
} from "@/ui/characters";

export type Gender = "male" | "female";
/** Body build. Men choose slim, average or broad; women slim, average or curvy. */
export type Build = "slim" | "average" | "broad" | "curvy";
/** Face shape. Men: oval, square, angular. Women: oval, round, heart. */
export type FaceShape = "oval" | "square" | "angular" | "round" | "heart";
export type Beard = "none" | "stubble" | "goatee" | "full";
export type Earrings = "none" | "studs" | "hoops";

/** The clothes a player can choose for the street. Work clothes are the job's. */
export type CasualClothes = Extract<
  Clothes,
  "tee" | "hoodie" | "shirt" | "cardigan" | "bomber" | "coat" | "blazer"
>;

export interface PlayerIdentity {
  v: 1;
  name: string;
  /** Decides which hairstyles, builds, face shapes and facial hair are offered. */
  gender: Gender;
  build: Build;
  face: FaceShape;
  skin: number;
  hairStyle: HairStyle;
  hair: number;
  eyes: number;
  beard: Beard;
  freckles: boolean;
  clothes: CasualClothes;
  /** The main garment. */
  top: number;
  /** Its second colour: trim, collar, the tee under a cardigan. */
  accent: number;
  legs: number;
  shoes: number;
  /** The suit they wear once promoted. */
  suit: number;
  /** Frame colour, or null for none. */
  glasses: number | null;
  earrings: Earrings;
  /** Cap colour, or null for none. Worn on the street, not at work. */
  cap: number | null;
  /** Sunglasses pushed up into the hair. */
  sunglasses: boolean;
  /**
   * False until the player has confirmed this character. A restart sets it
   * back so the creator opens again, starting from the character they had.
   */
  confirmed: boolean;
}

// ── The choices on offer ─────────────────────────────────────────────────────

export interface Swatch {
  value: number;
  label: string;
}

const sw = (value: number, label: string): Swatch => ({ value, label });

export const SKIN_TONES: readonly Swatch[] = [
  sw(0xf6dcc3, "Porcelain"),
  sw(0xf0d9b5, "Fair"),
  sw(0xe8c9a0, "Light"),
  sw(0xdfba95, "Warm beige"),
  sw(0xd9a066, "Tan"),
  sw(0xc98e5a, "Golden brown"),
  sw(0xa9714b, "Brown"),
  sw(0x8d5a3b, "Deep brown"),
  sw(0x6b4329, "Rich"),
];

export const HAIR_COLOURS: readonly Swatch[] = [
  sw(0x101010, "Black"),
  sw(0x2e2622, "Dark brown"),
  sw(0x5a3a24, "Brown"),
  sw(0x8a4b2c, "Chestnut"),
  sw(0xa0442a, "Auburn"),
  sw(0xd8c15a, "Blonde"),
  sw(0xe8e2d0, "Platinum"),
  sw(0x8a8a8a, "Grey"),
  sw(0xd987b5, "Pink"),
  sw(0x3d5ab8, "Blue"),
];

export const EYE_COLOURS: readonly Swatch[] = [
  sw(0x4a2c18, "Brown"),
  sw(0x2a1a10, "Dark brown"),
  sw(0x7a5a30, "Hazel"),
  sw(0x4f6b4a, "Green"),
  sw(0x4a6b8a, "Blue"),
  sw(0x6a7a86, "Grey"),
];

export const HAIRSTYLES: readonly { value: HairStyle; label: string }[] = [
  { value: "short", label: "Short" },
  { value: "swept", label: "Swept back" },
  { value: "buzz", label: "Buzz cut" },
  { value: "curly", label: "Curly" },
  { value: "bun", label: "Bun" },
  { value: "ponytail", label: "Ponytail" },
  { value: "long", label: "Long" },
  { value: "bob", label: "Bob" },
  { value: "receding", label: "Receding" },
];

export const GENDERS: readonly { value: Gender; label: string }[] = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
];

/** What each gender is offered. The first of each list is that gender's default. */
export const HAIRSTYLES_FOR: Record<Gender, readonly { value: HairStyle; label: string }[]> = {
  male: [
    { value: "short", label: "Short" },
    { value: "swept", label: "Swept back" },
    { value: "buzz", label: "Buzz cut" },
    { value: "curly", label: "Curly" },
    { value: "receding", label: "Receding" },
  ],
  female: [
    { value: "long", label: "Long" },
    { value: "bob", label: "Bob" },
    { value: "ponytail", label: "Ponytail" },
    { value: "bun", label: "Bun" },
    { value: "curly", label: "Curly" },
  ],
};

export const BUILDS_FOR: Record<Gender, readonly { value: Build; label: string }[]> = {
  male: [
    { value: "average", label: "Average" },
    { value: "slim", label: "Slim" },
    { value: "broad", label: "Broad" },
  ],
  female: [
    { value: "average", label: "Average" },
    { value: "slim", label: "Slim" },
    { value: "curvy", label: "Curvy" },
  ],
};

export const FACES_FOR: Record<Gender, readonly { value: FaceShape; label: string }[]> = {
  male: [
    { value: "oval", label: "Oval" },
    { value: "square", label: "Square jaw" },
    { value: "angular", label: "Angular" },
  ],
  female: [
    { value: "oval", label: "Oval" },
    { value: "round", label: "Round" },
    { value: "heart", label: "Heart" },
  ],
};

export const BEARDS: readonly { value: Beard; label: string }[] = [
  { value: "none", label: "None" },
  { value: "stubble", label: "Stubble" },
  { value: "goatee", label: "Goatee" },
  { value: "full", label: "Full beard" },
];

export const CLOTHES: readonly { value: CasualClothes; label: string }[] = [
  { value: "tee", label: "T-shirt" },
  { value: "hoodie", label: "Hoodie" },
  { value: "shirt", label: "Shirt" },
  { value: "cardigan", label: "Cardigan" },
  { value: "bomber", label: "Bomber jacket" },
  { value: "coat", label: "Coat & scarf" },
  { value: "blazer", label: "Blazer" },
];

export const OUTFIT_COLOURS: readonly Swatch[] = [
  sw(0x3d78d8, "Blue"),
  sw(0x1f3d70, "Navy"),
  sw(0x4aa3c7, "Sky"),
  sw(0x2f8f86, "Teal"),
  sw(0x5fae6f, "Green"),
  sw(0xe2be78, "Sand"),
  sw(0xf0954f, "Orange"),
  sw(0xc95f4e, "Red"),
  sw(0x96453f, "Brick"),
  sw(0xd987b5, "Pink"),
  sw(0x8a6fd1, "Purple"),
  sw(0xe8dfd0, "Cream"),
  sw(0x7c7466, "Taupe"),
  sw(0x33363d, "Charcoal"),
];

export const TROUSER_COLOURS: readonly Swatch[] = [
  sw(0x2a3350, "Navy"),
  sw(0x3d5a80, "Denim"),
  sw(0x2f2f38, "Charcoal"),
  sw(0x1b1d22, "Black"),
  sw(0x6a6e78, "Grey"),
  sw(0xb59a6a, "Khaki"),
  sw(0x4a4139, "Brown"),
  sw(0x55603a, "Olive"),
];

export const SHOE_COLOURS: readonly Swatch[] = [
  sw(0xf2f2ee, "White"),
  sw(0x1b1d22, "Black"),
  sw(0x5c3a28, "Brown"),
  sw(0xb08458, "Tan"),
  sw(0xc0423a, "Red"),
  sw(0x24304d, "Navy"),
];

export const SUIT_COLOURS: readonly Swatch[] = [
  sw(0x2f3a4f, "Navy"),
  sw(0x2b3240, "Charcoal"),
  sw(0x1d1f24, "Black"),
  sw(0x5f6670, "Grey"),
  sw(0x4a3a2e, "Brown"),
  sw(0x5a2430, "Burgundy"),
];

export const GLASSES: readonly { value: number | null; label: string }[] = [
  { value: null, label: "None" },
  { value: 0x22262e, label: "Black frames" },
  { value: 0xb08d3a, label: "Gold frames" },
  { value: 0x6b4a2e, label: "Tortoiseshell" },
  { value: 0x9aa3ad, label: "Silver frames" },
];

export const EARRINGS: readonly { value: Earrings; label: string }[] = [
  { value: "none", label: "None" },
  { value: "studs", label: "Studs" },
  { value: "hoops", label: "Hoops" },
];

export const CAP_COLOURS: readonly { value: number | null; label: string }[] = [
  { value: null, label: "No cap" },
  { value: 0x9c3b30, label: "Red cap" },
  { value: 0x1f3d70, label: "Navy cap" },
  { value: 0x1b1d22, label: "Black cap" },
  { value: 0x5fae6f, label: "Green cap" },
  { value: 0xe8dfd0, label: "Cream cap" },
];

export const NAME_MAX = 20;

// ── Making, checking and cleaning one ────────────────────────────────────────

/** The game's own player, as a starting point: the look everyone had before. */
export function defaultIdentity(name = "", gender: Gender = "male"): PlayerIdentity {
  const l = PLAYER.look;
  const base: PlayerIdentity = {
    v: 1,
    name: cleanName(name),
    gender: "male",
    build: "average",
    face: "oval",
    skin: l.skin,
    hairStyle: l.hairStyle,
    hair: l.hair,
    eyes: l.eyes ?? 0x4a6b8a,
    beard: "none",
    freckles: false,
    clothes: "bomber",
    top: l.top,
    accent: l.accent ?? 0x1f3d70,
    legs: l.legs,
    shoes: 0xf2f2ee,
    suit: 0x2f3a4f,
    glasses: null,
    earrings: "none",
    cap: null,
    sunglasses: false,
    confirmed: false,
  };
  return gender === "male" ? base : withGender(base, "female");
}

const allowed = <T>(xs: readonly { value: T }[], v: T): boolean => xs.some((x) => x.value === v);

/**
 * The same person as another gender: the choices only one gender has are moved
 * to that gender's first option; everything else — colours, clothes, name —
 * is kept.
 */
export function withGender(id: PlayerIdentity, gender: Gender): PlayerIdentity {
  return {
    ...id,
    gender,
    hairStyle: allowed(HAIRSTYLES_FOR[gender], id.hairStyle)
      ? id.hairStyle
      : HAIRSTYLES_FOR[gender][0].value,
    build: allowed(BUILDS_FOR[gender], id.build) ? id.build : BUILDS_FOR[gender][0].value,
    face: allowed(FACES_FOR[gender], id.face) ? id.face : FACES_FOR[gender][0].value,
    beard: gender === "female" ? "none" : id.beard,
  };
}

/** A random look, keeping the name. */
export function randomIdentity(
  name: string,
  rand: () => number = Math.random,
  gender?: Gender,
): PlayerIdentity {
  const pick = <T>(xs: readonly T[]): T => xs[Math.floor(rand() * xs.length) % xs.length];
  const g: Gender = gender ?? (rand() < 0.5 ? "male" : "female");
  const top = pick(OUTFIT_COLOURS).value;
  let accent = pick(OUTFIT_COLOURS).value;
  if (accent === top)
    accent =
      OUTFIT_COLOURS[(OUTFIT_COLOURS.findIndex((c) => c.value === top) + 3) % OUTFIT_COLOURS.length]
        .value;
  return {
    v: 1,
    name: cleanName(name),
    gender: g,
    build: pick(BUILDS_FOR[g]).value,
    face: pick(FACES_FOR[g]).value,
    skin: pick(SKIN_TONES).value,
    hairStyle: pick(HAIRSTYLES_FOR[g]).value,
    hair: pick(HAIR_COLOURS).value,
    eyes: pick(EYE_COLOURS).value,
    // Mostly clean-shaven, mostly bare-headed: a random face should read as a
    // person, not a costume.
    beard: g === "female" || rand() < 0.65 ? "none" : pick(BEARDS.slice(1)).value,
    freckles: rand() < 0.2,
    clothes: pick(CLOTHES).value,
    top,
    accent,
    legs: pick(TROUSER_COLOURS).value,
    shoes: pick(SHOE_COLOURS).value,
    suit: pick(SUIT_COLOURS).value,
    glasses: rand() < 0.7 ? null : pick(GLASSES.slice(1)).value,
    earrings: rand() < (g === "female" ? 0.35 : 0.8) ? "none" : pick(EARRINGS.slice(1)).value,
    cap: rand() < 0.75 ? null : pick(CAP_COLOURS.slice(1)).value,
    sunglasses: rand() < 0.1,
    confirmed: false,
  };
}

/** Trim, collapse spaces, and cut to length. */
export function cleanName(name: string): string {
  return name.replace(/\s+/g, " ").trim().slice(0, NAME_MAX).trim();
}

const isColour = (v: unknown): v is number =>
  typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= 0xffffff;
const oneOf = <T>(xs: readonly { value: T }[], v: unknown): v is T => xs.some((x) => x.value === v);

/** A stored identity, checked field by field. Anything off is rejected whole. */
export function isIdentity(v: unknown): v is PlayerIdentity {
  if (typeof v !== "object" || v === null) return false;
  const i = v as Record<string, unknown>;
  const gender = i.gender as Gender;
  return (
    i.v === 1 &&
    typeof i.name === "string" &&
    cleanName(i.name) !== "" &&
    oneOf(GENDERS, i.gender) &&
    oneOf(BUILDS_FOR[gender], i.build) &&
    oneOf(FACES_FOR[gender], i.face) &&
    oneOf(HAIRSTYLES_FOR[gender], i.hairStyle) &&
    (gender === "male" || i.beard === "none") &&
    isColour(i.skin) &&
    oneOf(HAIRSTYLES, i.hairStyle) &&
    isColour(i.hair) &&
    isColour(i.eyes) &&
    oneOf(BEARDS, i.beard) &&
    typeof i.freckles === "boolean" &&
    oneOf(CLOTHES, i.clothes) &&
    isColour(i.top) &&
    isColour(i.accent) &&
    isColour(i.legs) &&
    isColour(i.shoes) &&
    isColour(i.suit) &&
    (i.glasses === null || isColour(i.glasses)) &&
    oneOf(EARRINGS, i.earrings) &&
    (i.cap === null || isColour(i.cap)) &&
    typeof i.sunglasses === "boolean" &&
    typeof i.confirmed === "boolean"
  );
}

const FEMININE_HAIR: readonly HairStyle[] = ["long", "bob", "ponytail", "bun"];

/**
 * A stored identity brought up to date, or null if it is not one. Characters
 * saved before gender, build and face existed are kept — given the gender
 * their hair and beard suggest and the default build and face — rather than
 * thrown away, which would send their player back to the creator.
 */
export function normalizeIdentity(v: unknown): PlayerIdentity | null {
  if (typeof v !== "object" || v === null) return null;
  const raw = v as Partial<PlayerIdentity>;
  let id = raw as PlayerIdentity;
  if (raw.gender === undefined) {
    const looksFemale =
      (raw.beard === undefined || raw.beard === "none") &&
      raw.hairStyle !== undefined &&
      FEMININE_HAIR.includes(raw.hairStyle);
    id = withGender(
      { ...raw, build: raw.build ?? "average", face: raw.face ?? "oval" } as PlayerIdentity,
      looksFemale ? "female" : "male",
    );
  }
  return isIdentity(id) ? id : null;
}

// ── Turning it into a look ───────────────────────────────────────────────────

/** The portrait's look for an identity, dressed for an outfit. */
export function lookOf(id: PlayerIdentity, outfit: PlayerOutfit = "casual"): CharacterLook {
  const casual: CharacterLook = {
    age: 23,
    gender: id.gender,
    build: id.build,
    face: id.face,
    skin: id.skin,
    hair: id.hair,
    hairStyle: id.hairStyle,
    eyes: id.eyes,
    beard: id.beard === "none" ? undefined : id.beard,
    freckles: id.freckles || undefined,
    clothes: id.clothes,
    top: id.top,
    accent: id.accent,
    legs: id.legs,
    glasses: id.glasses ?? undefined,
    earrings: id.earrings === "none" ? undefined : id.earrings,
    hat: id.cap !== null ? "cap" : undefined,
    hatColor: id.cap ?? undefined,
    sunglasses: id.sunglasses || undefined,
    expression: "grin",
  };
  return dressPlayer(casual, outfit, id.suit, id.top);
}

/** The walking figure's palette for an identity, dressed for an outfit. */
export function paletteFor(id: PlayerIdentity, outfit: PlayerOutfit = "casual"): PersonPalette {
  return {
    ...paletteOf(lookOf(id, outfit)),
    shoes: id.shoes,
    cap: outfit === "casual" && id.cap !== null ? id.cap : undefined,
    build: id.build,
    female: id.gender === "female" || undefined,
  };
}

// ── The store ────────────────────────────────────────────────────────────────

interface IdentityState {
  /** The player's character, or null before one has ever been made. */
  identity: PlayerIdentity | null;
  /** Make this the player's character: here, in this browser, and on the account. */
  setIdentity: (id: PlayerIdentity) => void;
}

function uid(): string {
  if (!isConfigured()) return "anon";
  try {
    return auth().currentUser?.uid ?? "anon";
  } catch {
    return "anon";
  }
}

/** This browser's copy, under the signed-in player's own key. */
const localKey = () => `city.${uid()}.character`;

export const useIdentity = create<IdentityState>(() => ({
  identity: null,
  setIdentity: (id) => void storeIdentity(id),
}));

/**
 * Make this the player's character and wait until the account has it too —
 * for a save being loaded or a restart, which reload the page straight after.
 */
export async function storeIdentity(id: PlayerIdentity): Promise<void> {
  const clean = { ...id, name: cleanName(id.name) };
  useIdentity.setState({ identity: clean });
  saveJson(localKey(), clean);
  await saveCharacter(clean);
}

/**
 * Settle who the player is, once the city document has been read.
 *
 * The account's copy wins — it is the one that followed them to this device.
 * With none there, this browser's copy is uploaded (a character made offline).
 * With neither, the identity stays null and the creator opens.
 */
export function hydrateIdentity(): PlayerIdentity | null {
  const fromServer = normalizeIdentity(serverCityBlob()?.character);
  if (fromServer) {
    useIdentity.setState({ identity: fromServer });
    saveJson(localKey(), fromServer);
    return fromServer;
  }
  const local = normalizeIdentity(loadJson<unknown>(localKey(), (x): x is unknown => x !== null));
  if (local) {
    useIdentity.setState({ identity: local });
    void saveCharacter(local);
    return local;
  }
  useIdentity.setState({ identity: null });
  return null;
}

/** The player's character right now, or the default look before there is one. */
export function currentIdentity(): PlayerIdentity {
  return useIdentity.getState().identity ?? { ...defaultIdentity("You"), confirmed: true };
}

/** The name to use in a line spoken to the player: their first name. */
export function firstName(): string {
  const name = useIdentity.getState().identity?.name ?? "";
  return name.split(" ")[0] ?? "";
}

/** Tests only. */
export function resetIdentity(): void {
  useIdentity.setState({ identity: null });
}
