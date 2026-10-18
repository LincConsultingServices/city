import { describe, it, expect } from "vitest";
import { BAR_S, PROGRESSION, composeBar, midiToHz } from "./music";
import { shouldPlay } from "./musicController";

describe("the score", () => {
  it("cycles through its four chords, one a bar", () => {
    const chords = Array.from({ length: 8 }, (_, n) => composeBar(n).chord);
    expect(chords).toEqual([...PROGRESSION, ...PROGRESSION].map((c) => c.name));
  });

  it("keeps every note inside its bar", () => {
    for (let n = 0; n < 64; n++) {
      const bar = composeBar(n);
      for (const note of [...bar.pad, ...bar.bass, ...bar.melody]) {
        expect(note.at).toBeGreaterThanOrEqual(0);
        expect(note.at).toBeLessThan(BAR_S);
        expect(note.vel).toBeGreaterThan(0);
        expect(note.vel).toBeLessThanOrEqual(1);
      }
    }
  });

  it("plays the melody from the chord, in a gentle range", () => {
    for (let n = 0; n < 64; n++) {
      const bar = composeBar(n);
      const chord = PROGRESSION[n % PROGRESSION.length].notes.map((m) => m % 12);
      for (const note of bar.melody) {
        expect(chord, `bar ${n}: ${note.midi} is not in ${bar.chord}`).toContain(note.midi % 12);
        // Middle C up to the A above the treble staff: never shrill.
        expect(note.midi).toBeGreaterThanOrEqual(60);
        expect(note.midi).toBeLessThanOrEqual(84);
      }
    }
  });

  it("leaves room to breathe: sparse, with a silent bar in every phrase", () => {
    let notes = 0;
    for (let n = 0; n < 64; n++) {
      const bar = composeBar(n);
      notes += bar.melody.length;
      if (n % 4 === 3) expect(bar.melody, `bar ${n} should rest`).toHaveLength(0);
    }
    // Fewer than half the eighth-note slots, on average.
    expect(notes / 64).toBeLessThan(4);
  });

  it("does not repeat one melody forever", () => {
    const lines = new Set(
      Array.from({ length: 16 }, (_, n) =>
        composeBar(n)
          .melody.map((m) => m.midi)
          .join(","),
      ),
    );
    expect(lines.size).toBeGreaterThan(6);
  });

  it("is the same score every time, bar for bar", () => {
    expect(composeBar(5)).toEqual(composeBar(5));
  });

  it("tunes A4 to 440", () => {
    expect(midiToHz(69)).toBeCloseTo(440, 6);
    expect(midiToHz(81)).toBeCloseTo(880, 6);
  });
});

describe("when the music plays", () => {
  it("only with sound on, music on, and the tab in view", () => {
    expect(shouldPlay({ enabled: true, music: true }, true)).toBe(true);
    expect(shouldPlay({ enabled: false, music: true }, true)).toBe(false);
    expect(shouldPlay({ enabled: true, music: false }, true)).toBe(false);
    expect(shouldPlay({ enabled: true, music: true }, false)).toBe(false);
  });
});
