import { describe, it, expect } from "vitest";
import {
  beatActivityId,
  beatPrompt,
  beatsDecided,
  countdownFor,
  liveBeatAt,
  nextBeat,
  seasonComplete,
} from "./beats";
import { BEATS } from "./season";
import { veraQuestion, VERA_COVERAGE } from "./vera";
import type { Decision } from "./maisonStore";

const played = (n: number, track: "A" | "B" = "A"): Decision[] =>
  BEATS.slice(0, n).map((b) => ({ id: beatActivityId(b, track), path: ["a", "a"] }));

describe("MAISON beats — one collection, in order (§8)", () => {
  it("opens on C1 and walks the season a beat at a time", () => {
    expect(nextBeat("A", [])?.competency).toBe("C1");
    expect(nextBeat("A", played(1))?.competency).toBe("C2");
    expect(nextBeat("A", played(8))?.competency).toBe("C9");
    expect(nextBeat("A", played(9))).toBeNull();
  });

  it("counts the season on the track you are actually on", () => {
    expect(beatsDecided("A", played(4))).toBe(4);
    // The same beats decided on the other track are a different season.
    expect(beatsDecided("B", played(4, "A"))).toBe(0);
    expect(nextBeat("B", played(4, "A"))?.competency).toBe("C1");
  });

  it("is finished at nine of nine and not before", () => {
    expect(seasonComplete("A", played(8))).toBe(false);
    expect(seasonComplete("A", played(9))).toBe(true);
  });

  it("chalks the beat you are ON, and 'after' once the show has happened (§3.5)", () => {
    expect(countdownFor("A", [])).toBe("11w");
    expect(countdownFor("A", played(1))).toBe("9w");
    expect(countdownFor("A", played(7))).toBe("1w");
    expect(countdownFor("A", played(8))).toBe("after");
    expect(countdownFor("A", played(9))).toBe("after");
  });

  it("counts down and never back up", () => {
    const weeks = Array.from({ length: 9 }, (_, i) => countdownFor("A", played(i)));
    expect(weeks).toEqual(["11w", "9w", "8w", "7w", "5w", "4w", "2w", "1w", "after"]);
  });
});

describe("MAISON beats — waiting at their own station", () => {
  it("goes live only at the station the beat is staged at", () => {
    // C1 is Ines at the rail. Standing at the desk should offer you nothing.
    expect(liveBeatAt("A", [], "st_rail")?.competency).toBe("C1");
    expect(liveBeatAt("A", [], "st_desk")).toBeNull();
    expect(liveBeatAt("A", [], null)).toBeNull();
  });

  it("moves to the next beat's station once this one is decided", () => {
    // C2 is Élise at her bench — the rail goes quiet the moment C1 is done.
    expect(liveBeatAt("A", played(1), "st_rail")).toBeNull();
    expect(liveBeatAt("A", played(1), "st_bench")?.competency).toBe("C2");
  });

  it("has exactly one beat live at a time — MAISON is not a menu of nine", () => {
    const stations = [...new Set(BEATS.map((b) => b.station))];
    for (let done = 0; done < BEATS.length; done++) {
      const hits = stations.filter((s) => liveBeatAt("A", played(done), s) !== null);
      expect(hits, `${done} decided`).toHaveLength(1);
    }
    // And nothing is live once the collection is finished.
    for (const s of new Set(BEATS.map((b) => b.station))) {
      expect(liveBeatAt("A", played(9), s)).toBeNull();
    }
  });

  it("names who is waiting, rather than naming the activity", () => {
    // §8: a beat is somebody standing somewhere, not a row in a list.
    expect(beatPrompt(BEATS[0])).toBe("talk to Ines");
    expect(beatPrompt(BEATS[1])).toBe("talk to Élise");
    // The ninth beat has no host — the wall brings it.
    expect(beatPrompt(BEATS[8])).toBe("read the reviews");
  });
});

describe("MAISON — the desk phone (§9.6)", () => {
  it("has a question for every beat of the season", () => {
    expect(VERA_COVERAGE).toHaveLength(9);
    for (const c of VERA_COVERAGE) {
      expect(veraQuestion(c).length, c).toBeGreaterThan(40);
    }
  });

  it("answers a call made for no reason at all — she is never gated", () => {
    expect(veraQuestion(null).length).toBeGreaterThan(40);
    expect(veraQuestion("C99").length).toBeGreaterThan(40);
  });

  it("only ever asks — she never tells you what to do", () => {
    for (const c of [...VERA_COVERAGE, null]) {
      const line = veraQuestion(c);
      expect(line.trim().endsWith("?"), `${c}: "${line}"`).toBe(true);
      // No instruction, and no verdict on what you have already done.
      expect(line, `${c}`).not.toMatch(
        /\byou should\b|\bI would\b|\bmy advice\b|\bthe answer is\b/i,
      );
    }
  });
});
