import { describe, it, expect } from "vitest";
import { GARMENT_NEUTRALS, MAISON_PALETTE } from "./props";
import { riseAt } from "./scene";
import { PLATFORM_RISE_PX, levelAt } from "./room";
import { INITIAL_WORLD, RAIL_SHAPE, RAIL_STATES, railContents } from "./world";

/** Saturation of a hex colour, 0 (grey) to 1 (pure hue). */
function saturation(hex: number): number {
  const r = (hex >> 16) & 0xff;
  const g = (hex >> 8) & 0xff;
  const b = hex & 0xff;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return max === 0 ? 0 : (max - min) / max;
}

describe("MAISON palette — §4's one rule", () => {
  it("holds exactly ONE saturated colour, and it is vermilion", () => {
    // "Bone, ash, raw plaster, pale oak, brushed brass, black steel. One
    // saturated colour: vermilion, and it appears only on the rail." When the
    // rail goes neutral the building loses its only warm hue — which is the
    // emotional content of the C2 decision, delivered without a word. If a
    // second saturated colour ever lands in this palette, that stops working.
    const saturated = Object.entries(MAISON_PALETTE).filter(([, hex]) => saturation(hex) > 0.7);
    expect(saturated.map(([name]) => name)).toEqual(["vermilion"]);
  });

  it("keeps every other colour cool or muted, as the room is meant to be", () => {
    for (const [name, hex] of Object.entries(MAISON_PALETTE)) {
      if (name === "vermilion") continue;
      expect(saturation(hex), `${name} is too loud for this room`).toBeLessThan(0.6);
    }
  });

  it("gives the garments a vermilion and three neutrals, and no fourth hue", () => {
    expect(GARMENT_NEUTRALS).toHaveLength(3); // bone, ash, sand
    for (const n of GARMENT_NEUTRALS) {
      expect(n).not.toBe(MAISON_PALETTE.vermilion);
      expect(saturation(n), "a neutral that is not neutral").toBeLessThan(0.35);
    }
  });
});

describe("MAISON scene — the two levels", () => {
  it("lifts the atelier and leaves the boutique on the floor (§3.1)", () => {
    expect(riseAt({ x: 5, y: 2 })).toBe(-PLATFORM_RISE_PX);
    expect(levelAt({ x: 5, y: 2 })).toBe("atelier");
    expect(riseAt({ x: 5, y: 11 })).toBe(0);
    expect(levelAt({ x: 5, y: 11 })).toBe("boutique");
  });

  it("lifts by enough to read as a step up, not so much it reads as a floor", () => {
    expect(PLATFORM_RISE_PX).toBeGreaterThan(12);
    expect(PLATFORM_RISE_PX).toBeLessThan(40);
  });
});

describe("MAISON rail — the thing that must not drift (§18.3)", () => {
  it("hangs exactly as many garments as the readable list says it does", () => {
    // §18.3 asks for a snapshot test "because these will drift": the garments on
    // the brass and the DOM list a player reads are the same season or the
    // building is lying to somebody. They are built from one source, and this
    // is the check that keeps it that way.
    for (const rail of RAIL_STATES) {
      const hung = RAIL_SHAPE[rail].pieces.reduce((n, [count]) => n + count, 0);
      const listed = railContents({ ...INITIAL_WORLD, rail }).length;
      expect(listed, `${rail}: ${hung} on the rail, ${listed} in the list`).toBe(hung);
    }
  });

  it("labels every garment with something the list can print", () => {
    for (const rail of RAIL_STATES) {
      for (const [count, label] of RAIL_SHAPE[rail].pieces) {
        expect(count, rail).toBeGreaterThan(0);
        expect(label.length, rail).toBeGreaterThan(2);
      }
    }
  });
});
