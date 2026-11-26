// What the player has in their pocket when they open an account: three cards
// that look like ID and a phone (docs/PRD_Building_Bank.md §7.2).
//
// Only one of the cards is a valid ID. The others — an expired driving licence
// and a library card — are there to be turned down, because "an expired ID, or
// a card that isn't an ID, can't be used" is the identity-check lesson, and it
// sticks far better when you have just handed one over.
//
// Everything is derived from the player's name, so it is the same every visit
// and on every device, with nothing new to store. The address and phone number
// are fictional, in a city that is nowhere in particular.

/** Streets in the city, for the address box. */
export const CITY_ADDRESSES = [
  "12 Harbour Row",
  "48 Market Street",
  "7 Downtown Plaza",
  "230 Riverside Lane",
  "19 Old Mill Road",
  "5 Founders Court",
] as const;

export type IdCardId = "city_id" | "driving_licence" | "library_card";

export interface IdCard {
  id: IdCardId;
  title: string;
  name: string;
  address: string;
  /** "Valid until 2031", "Expired March 2025", or "Not an ID". */
  status: string;
  /** Whether the bank can accept it. */
  valid: boolean;
  /** What the account desk says if you hand this one over. */
  refusal?: string;
  colour: string;
}

export interface Pocket {
  name: string;
  address: string;
  phone: string;
  cards: IdCard[];
}

/** A small, stable hash, so a name always gets the same address and number. */
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function pocketFor(rawName: string): Pocket {
  const name = rawName.trim() || "Alex Morgan";
  const h = hash(name.toLowerCase());
  const address = CITY_ADDRESSES[h % CITY_ADDRESSES.length];
  // The old address on the expired licence: you have moved since.
  const oldAddress = CITY_ADDRESSES[(h + 3) % CITY_ADDRESSES.length];
  const phone = "555" + String(1_000_000 + (h % 9_000_000)).padStart(7, "0");

  return {
    name,
    address,
    phone,
    cards: [
      {
        id: "driving_licence",
        title: "Driving Licence",
        name,
        address: oldAddress,
        status: "Expired March 2025",
        valid: false,
        refusal:
          "This licence has expired, and the address on it is an old one. The bank can only accept ID that is still in date.",
        colour: "#7a2e3b",
      },
      {
        id: "city_id",
        title: "City ID Card",
        name,
        address,
        status: "Valid until 2031",
        valid: true,
        colour: "#26385f",
      },
      {
        id: "library_card",
        title: "City Library",
        name,
        address,
        status: "Not an ID",
        valid: false,
        refusal:
          "A library card says you can borrow books. It doesn't prove who you are: there's no photo and no expiry date. The bank needs a proper ID.",
        colour: "#3f7a4a",
      },
    ],
  };
}

/** The one card the bank accepts. */
export const VALID_ID: IdCardId = "city_id";
