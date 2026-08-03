import { describe, it, expect } from "vitest";
import { roomDressing, type RoomDressing } from "./dressing";
import { GARMENT_NEUTRALS, MAISON_PALETTE } from "./props";
import { INITIAL_WORLD, WORLD_DOMAIN, WORLD_KEYS, railContents, type MaisonWorld } from "./world";

const dress = (over: Partial<MaisonWorld> = {}) => roomDressing({ ...INITIAL_WORLD, ...over });

describe("MAISON dressing — §18.2.8 consequence visibility", () => {
  it("gives EVERY world key something visible to change", () => {
    // The blocking acceptance criterion: "every decision changes at least one
    // of: the rail, the press wall, the atelier's noise, or the cloth on the
    // shelf." A key with no visible consequence is a key the player can move
    // without the room noticing — which makes the rail a liar about the season.
    const base = JSON.stringify(dress());
    for (const key of WORLD_KEYS) {
      const others = WORLD_DOMAIN[key].filter((v) => v !== INITIAL_WORLD[key]);
      const changed = others.some(
        (v) => JSON.stringify(dress({ [key]: v } as Partial<MaisonWorld>)) !== base,
      );
      expect(changed, `nothing in the room shows '${key}'`).toBe(true);
    }
  });

  it("shows the whole of §12 somewhere, not the rail four times over", () => {
    // Each key has to reach a DIFFERENT part of the room, or "the room reacts"
    // collapses into "the rail reacts and nothing else does".
    const surface = (d: RoomDressing) => ({
      rail: JSON.stringify(d.garments),
      press: d.clippings,
      shelf: `${d.bolts}${d.boltsPremium}`,
      column: d.chalk,
      desk: `${d.printoutStrong}${d.paperwork}`,
      door: d.boxes,
      atelier: `${d.machinesRunning}${d.humming}`,
    });
    const base = surface(dress());
    const touched = new Set<string>();
    for (const key of WORLD_KEYS) {
      for (const v of WORLD_DOMAIN[key]) {
        const next = surface(dress({ [key]: v } as Partial<MaisonWorld>));
        for (const part of Object.keys(base) as (keyof typeof base)[]) {
          if (next[part] !== base[part]) touched.add(part);
        }
      }
    }
    expect([...touched].sort()).toEqual([
      "atelier",
      "column",
      "desk",
      "door",
      "press",
      "rail",
      "shelf",
    ]);
  });
});

describe("MAISON dressing — the rail", () => {
  it("hangs exactly what the readable list says, garment for garment (§15)", () => {
    for (const rail of WORLD_DOMAIN.rail) {
      const world = { ...INITIAL_WORLD, rail } as MaisonWorld;
      expect(roomDressing(world).garments).toHaveLength(railContents(world).length);
    }
  });

  it("uses the house colour for vermilion and nothing else", () => {
    const bold = dress({ rail: "bold" });
    expect(bold.garments.every((g) => g.color === MAISON_PALETTE.vermilion)).toBe(true);

    const neutral = dress({ rail: "neutral" });
    const vermilion = neutral.garments.filter((g) => g.color === MAISON_PALETTE.vermilion);
    expect(vermilion).toHaveLength(2); // §3.3: two left as accents
    for (const g of neutral.garments) {
      if (g.color === MAISON_PALETTE.vermilion) continue;
      expect(GARMENT_NEUTRALS).toContain(g.color);
    }
  });

  it("puts the price band on every tag and the second name on every neck", () => {
    for (const price_tags of WORLD_DOMAIN.price_tags) {
      const d = dress({ price_tags } as Partial<MaisonWorld>);
      expect(new Set(d.garments.map((g) => g.tag)).size, price_tags).toBe(1);
    }
    expect(dress({ house_mark: "collab_logo" }).garments.every((g) => g.collabMark)).toBe(true);
    expect(dress({ house_mark: "clean" }).garments.some((g) => g.collabMark)).toBe(false);
  });
});

describe("MAISON dressing — the rest of the house", () => {
  it("fills the press wall from coverage, and calls nothing good or bad (§11)", () => {
    expect(dress({ press: "empty" }).clippings).toBe(0);
    expect(dress({ press: "one" }).clippings).toBe(1);
    // A cold wall and a mixed one hold the same number of clippings: the wall
    // reports coverage, not quality, so being panned is not fewer frames.
    expect(dress({ press: "cold" }).clippings).toBe(dress({ press: "mixed" }).clippings);
    expect(dress({ press: "warm" }).clippings).toBeGreaterThan(dress({ press: "one" }).clippings);
  });

  it("reads the money off the shelf — funded is better cloth, not more of it", () => {
    expect(dress({ cash: "season" }).bolts).toBeGreaterThan(dress({ cash: "tight" }).bolts);
    expect(dress({ cash: "funded" }).boltsPremium).toBe(true);
    expect(dress({ cash: "season" }).boltsPremium).toBe(false);
    expect(dress({ cash: "funded" }).bolts).toBeLessThan(dress({ cash: "season" }).bolts);
  });

  it("silences two of the three machines when the atelier fractures (§6)", () => {
    expect(dress({ atelier_mood: "steady" }).machinesRunning).toBe(3);
    expect(dress({ atelier_mood: "fractured" }).machinesRunning).toBe(1);
    expect(dress({ atelier_mood: "trusting" }).humming).toBe(true);
    expect(dress({ atelier_mood: "strained" }).humming).toBe(false);
  });

  it("stacks the buyer's boxes only once she has signed", () => {
    expect(dress({ buyer: "circling" }).boxes).toBe(0);
    expect(dress({ buyer: "signed" }).boxes).toBeGreaterThan(0);
    expect(dress({ buyer: "walked" }).boxes).toBe(0);
  });

  it("puts a second name on the paperwork when the equity goes", () => {
    expect(dress({ equity: "whole" }).paperwork).toBe(1);
    expect(dress({ equity: "sold" }).paperwork).toBe(2);
  });

  it("chalks the countdown the season is actually on", () => {
    for (const countdown of WORLD_DOMAIN.countdown) {
      expect(dress({ countdown } as Partial<MaisonWorld>).chalk).toBe(countdown);
    }
  });
});
