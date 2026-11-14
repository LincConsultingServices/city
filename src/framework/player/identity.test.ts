import { describe, it, expect, beforeEach, vi } from "vitest";

const putCity = vi.fn();
const getCity = vi.fn();
vi.mock("@/framework/api", () => ({
  api: {
    putCityState: (...a: unknown[]) => putCity(...a),
    getCityState: () => getCity(),
  },
}));

import { hydrateCityState, resetCityState } from "@/framework/city/cityState";
import {
  defaultIdentity,
  firstName,
  hydrateIdentity,
  isIdentity,
  lookOf,
  normalizeIdentity,
  withGender,
  paletteFor,
  randomIdentity,
  resetIdentity,
  useIdentity,
  type PlayerIdentity,
} from "./identity";

const me = (over: Partial<PlayerIdentity> = {}): PlayerIdentity => ({
  ...defaultIdentity("Asha Rao"),
  skin: 0x8d5a3b,
  hair: 0xa0442a,
  hairStyle: "curly",
  cap: 0x9c3b30,
  shoes: 0xc0423a,
  suit: 0x5a2430,
  glasses: 0xb08d3a,
  confirmed: true,
  ...over,
});

beforeEach(() => {
  localStorage.clear();
  resetCityState();
  resetIdentity();
  putCity.mockReset().mockResolvedValue({ ok: true, rev: 1, updatedAt: "" });
  getCity.mockReset().mockResolvedValue({ rev: 0, blob: null, updatedAt: "" });
});

describe("the player's identity", () => {
  it("accepts a whole character and rejects a broken one", () => {
    expect(isIdentity(me())).toBe(true);
    expect(isIdentity({ ...me(), name: "   " })).toBe(false);
    expect(isIdentity({ ...me(), hairStyle: "mohawk" })).toBe(false);
    expect(isIdentity({ ...me(), skin: -1 })).toBe(false);
    expect(isIdentity(null)).toBe(false);
  });

  it("makes a random character that is always a valid one, and keeps the name", () => {
    for (let i = 0; i < 50; i++) {
      const r = randomIdentity("Asha");
      expect(isIdentity(r)).toBe(true);
      expect(r.name).toBe("Asha");
    }
  });

  it("is the same person in every outfit — only the clothes change", () => {
    const id = me();
    for (const outfit of ["casual", "uniform", "professional"] as const) {
      const look = lookOf(id, outfit);
      expect(look.skin).toBe(id.skin);
      expect(look.hair).toBe(id.hair);
      expect(look.hairStyle).toBe(id.hairStyle);
      expect(look.glasses).toBe(id.glasses);
      expect(paletteFor(id, outfit).shoes).toBe(id.shoes);
    }
    expect(lookOf(id, "uniform").clothes).toBe("uniform");
    expect(lookOf(id, "professional").top).toBe(id.suit);
    // The cap is street wear.
    expect(lookOf(id, "casual").hat).toBe("cap");
    expect(lookOf(id, "uniform").hat).toBeUndefined();
    expect(paletteFor(id, "casual").cap).toBe(id.cap);
    expect(paletteFor(id, "uniform").cap).toBeUndefined();
  });

  it("takes the account's character over this browser's", async () => {
    localStorage.setItem("city.anon.character", JSON.stringify(me({ name: "Old" })));
    getCity.mockResolvedValue({ rev: 2, blob: { character: me({ name: "Asha" }) }, updatedAt: "" });
    await hydrateCityState();
    expect(hydrateIdentity()?.name).toBe("Asha");
    expect(firstName()).toBe("Asha");
  });

  it("uploads a character made in this browser when the account has none", async () => {
    localStorage.setItem("city.anon.character", JSON.stringify(me()));
    await hydrateCityState();
    expect(hydrateIdentity()?.name).toBe("Asha Rao");
    expect(putCity).toHaveBeenCalledWith(
      expect.any(Number),
      expect.objectContaining({ character: me() }),
    );
  });

  it("never adopts a character another account left in this browser's city mirror", async () => {
    localStorage.setItem(
      "city.state",
      JSON.stringify({ rev: 4, blob: { character: me({ name: "Someone" }) } }),
    );
    await hydrateCityState();
    expect(hydrateIdentity()).toBeNull();
  });

  it("saves a confirmed character here and on the account", () => {
    useIdentity.getState().setIdentity(me({ name: "  Asha   Rao  " }));
    expect(useIdentity.getState().identity?.name).toBe("Asha Rao");
    expect(JSON.parse(localStorage.getItem("city.anon.character")!).name).toBe("Asha Rao");
    expect(putCity).toHaveBeenCalled();
  });
});

describe("gender, build and face shape", () => {
  it("offers each gender its own hairstyles, builds and faces, and no beard for women", () => {
    const her = withGender(
      me({ beard: "full", hairStyle: "receding", build: "broad", face: "square" }),
      "female",
    );
    expect(her.gender).toBe("female");
    expect(her.beard).toBe("none");
    expect(her.hairStyle).toBe("long");
    expect(her.build).toBe("average");
    expect(her.face).toBe("oval");
    expect(isIdentity(her)).toBe(true);
    // A choice both genders share is kept.
    expect(withGender(me({ hairStyle: "curly" }), "female").hairStyle).toBe("curly");
    // And a woman with a beard is not a valid stored character.
    expect(isIdentity({ ...her, beard: "full" })).toBe(false);
  });

  it("randomizes within the chosen gender", () => {
    for (let i = 0; i < 40; i++) {
      const r = randomIdentity("Asha", Math.random, "female");
      expect(r.gender).toBe("female");
      expect(r.beard).toBe("none");
      expect(isIdentity(r)).toBe(true);
    }
  });

  it("keeps a character saved before gender existed, instead of sending them to the creator", () => {
    const { gender: _g, build: _b, face: _f, ...old } = me({ hairStyle: "swept" });
    const upgraded = normalizeIdentity(old);
    expect(upgraded?.gender).toBe("male");
    expect(upgraded?.build).toBe("average");
    expect(upgraded?.confirmed).toBe(true);
    const {
      gender: _g2,
      build: _b2,
      face: _f2,
      ...oldHer
    } = me({ hairStyle: "bun", beard: "none" });
    expect(normalizeIdentity(oldHer)?.gender).toBe("female");
  });

  it("draws the player's build and gender into the portrait and the walking figure", () => {
    const her = withGender(me(), "female");
    expect(lookOf({ ...her, build: "curvy", face: "heart" })).toMatchObject({
      gender: "female",
      build: "curvy",
      face: "heart",
    });
    expect(paletteFor({ ...her, build: "slim" })).toMatchObject({ build: "slim", female: true });
  });
});

describe("loading the character on arrival", () => {
  it("waits for the account's copy even when arrival is asked about twice", async () => {
    // React mounts twice in development: the second caller must not be told
    // "done" before the document is back.
    let release!: () => void;
    getCity.mockReturnValue(
      new Promise((r) => {
        release = () => r({ rev: 3, blob: { character: me() }, updatedAt: "" });
      }),
    );
    void hydrateCityState();
    const second = hydrateCityState();
    release();
    await second;
    expect(hydrateIdentity()?.name).toBe("Asha Rao");
    expect(getCity).toHaveBeenCalledTimes(1);
  });
});
