// Pixel-density guard (PRD §14.2: "one pixel density project-wide; imports
// rescaled to spec, never mixed").
//
// This exists because of a real regression: trees were sourced from a pack drawn
// at a much smaller scale (11-19px wide) and then blown up 2.1x against a 132px
// tile — roughly 10x under-dense, and they rendered as featureless green pills.
// Reading PROP_TARGET_W alone can't catch that; you have to compare the target
// against the real file. So this test measures the actual PNGs on disk.
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { PROP_TARGET_W, PROP_TEXTURE } from "./assets";
import type { PropKind } from "./cityMap";

const ASSETS = resolve(__dirname, "../../public/assets/city");

/** Width/height straight from the PNG IHDR chunk — no image decoder needed. */
function pngSize(file: string): { w: number; h: number } {
  const b = readFileSync(file);
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
}

/** Upscaling beyond this makes Kenney's flat art visibly soft. */
const MAX_UPSCALE = 2.3;

describe("sprite density", () => {
  const entries = Object.entries(PROP_TARGET_W) as Array<[PropKind, number]>;

  it("has a target width for every upright prop", () => {
    expect(entries.length).toBeGreaterThan(0);
  });

  it.each(entries)("%s is not upscaled past %s×", (kind, targetW) => {
    const key = PROP_TEXTURE[kind];
    expect(key, `${kind} has no texture`).toBeTruthy();
    const file = `${ASSETS}/${key}.png`;
    expect(existsSync(file), `${key}.png missing`).toBe(true);

    const { w } = pngSize(file);
    const upscale = targetW / w;
    expect(
      upscale,
      `${kind} draws ${key}.png (${w}px) at ${targetW}px = ${upscale.toFixed(2)}× — ` +
        `source art too small; use a denser sprite rather than scaling this one up`,
    ).toBeLessThanOrEqual(MAX_UPSCALE);
  });

  it("keeps every prop sprite in the same density band as the 132px tile grid", () => {
    // A prop whose art is under ~20px wide cannot hold detail at city scale,
    // whatever it's scaled to — that's the pack-mixing trap, so reject it here.
    for (const [kind] of entries) {
      const key = PROP_TEXTURE[kind];
      if (!key) continue;
      const { w } = pngSize(`${ASSETS}/${key}.png`);
      expect(w, `${kind} → ${key}.png is only ${w}px wide`).toBeGreaterThanOrEqual(20);
    }
  });
});
