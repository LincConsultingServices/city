import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PROP_SPRITE, UI_SPRITE, type UiSprite } from "./assets";

// The city's spriteDensity.test.ts cannot cover these: it hard-codes
// public/assets/city and iterates the city's own PROP_TARGET_W, keyed by a
// PropKind the Café doesn't share. Without this file café sprites would ship
// with no density guard at all.
//
// PROP_SPRITE is empty today — the room is entirely procedural — so these cases
// simply don't run. That is the point: the guard is already in place for
// whatever the first real sprite turns out to be.
const ASSETS = resolve(__dirname, "../../../public/assets/cafe");

/** Same trick the city's test uses — read the IHDR, no image decoder needed. */
function pngSize(file: string): { w: number; h: number } {
  const b = readFileSync(file);
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
}

const MAX_UPSCALE = 2.3; // beyond this, flat art goes visibly soft
const MIN_SOURCE_W = 20; // under this, a sprite cannot hold detail at city scale

const entries = Object.entries(PROP_SPRITE) as Array<[string, { key: string; width: number }]>;

describe("Café sprites", () => {
  it("declares a draw width for every sprite-backed prop", () => {
    for (const [kind, spec] of entries) {
      expect(spec.width, `${kind} has no draw width`).toBeGreaterThan(0);
      expect(spec.key, `${kind} has no source key`).toBeTruthy();
    }
  });

  it.runIf(entries.length > 0).each(entries)("%s ships a PNG that exists", (_kind, spec) => {
    expect(existsSync(`${ASSETS}/${spec.key}.png`), `${spec.key}.png is missing`).toBe(true);
  });

  it.runIf(entries.length > 0).each(entries)("%s is never upscaled past 2.3×", (_kind, spec) => {
    const { w } = pngSize(`${ASSETS}/${spec.key}.png`);
    expect(spec.width / w, `${spec.key} drawn at ${spec.width}px from ${w}px`).toBeLessThanOrEqual(
      MAX_UPSCALE,
    );
  });

  it.runIf(entries.length > 0).each(entries)(
    "%s has enough source pixels to hold detail",
    (_kind, spec) => {
      const { w } = pngSize(`${ASSETS}/${spec.key}.png`);
      expect(w, `${spec.key} source is only ${w}px wide`).toBeGreaterThanOrEqual(MIN_SOURCE_W);
    },
  );
});

// The same guard for UI art, which is nine-sliced rather than drawn at a fixed
// width: the thing that goes soft here is a corner or a round end stretched by
// insets that do not leave a middle band to take the stretch. Empty today, like
// the table above — the callout balloon is a path (calloutView.ts).
const uiEntries = Object.entries(UI_SPRITE) as Array<[string, UiSprite]>;

describe("Café UI sprites", () => {
  // Always runs — an empty table is an empty loop, and this keeps the suite from
  // being one that declares nothing when nothing is declared.
  it("declares a source and four insets for every sprite-backed element", () => {
    for (const [id, spec] of uiEntries) {
      expect(spec.key, `${id} has no source key`).toBeTruthy();
      expect(spec.slice, `${id} has no nine-slice insets`).toBeTruthy();
    }
  });

  it.runIf(uiEntries.length > 0).each(uiEntries)("%s ships a PNG that exists", (_id, spec) => {
    expect(existsSync(`${ASSETS}/${spec.key}.png`), `${spec.key}.png is missing`).toBe(true);
  });

  it.runIf(uiEntries.length > 0).each(uiEntries)("%s leaves a band to stretch", (_id, spec) => {
    const { w, h } = pngSize(`${ASSETS}/${spec.key}.png`);
    const { left, right, top, bottom } = spec.slice;
    for (const [side, inset] of Object.entries(spec.slice)) {
      expect(inset, `${spec.key} has a ${side} inset of ${inset}`).toBeGreaterThan(0);
    }
    expect(left + right, `${spec.key} insets fill its ${w}px width`).toBeLessThan(w);
    expect(top + bottom, `${spec.key} insets fill its ${h}px height`).toBeLessThan(h);
  });

  it.runIf(uiEntries.length > 0).each(uiEntries)(
    "%s has enough source pixels to hold detail",
    (_id, spec) => {
      const { w } = pngSize(`${ASSETS}/${spec.key}.png`);
      expect(w, `${spec.key} source is only ${w}px wide`).toBeGreaterThanOrEqual(MIN_SOURCE_W);
    },
  );
});
