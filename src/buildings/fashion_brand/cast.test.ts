import { describe, it, expect } from "vitest";
import { ALL_CAST, MAX_ON_SCREEN, STAGED_CAST, castAt, castById, type CastId } from "./cast";
import { beatActivityId } from "./beats";
import { BEATS } from "./season";
import { INITIAL_WORLD, type MaisonWorld } from "./world";
import { makeRoomGrid, stationById } from "./room";
import { MAISON_PALETTE } from "./props";
import type { Decision } from "./maisonStore";

const played = (n: number, track: "A" | "B" = "A"): Decision[] =>
  BEATS.slice(0, n).map((b) => ({ id: beatActivityId(b, track), path: ["a", "a"] }));

const world = (over: Partial<MaisonWorld> = {}): MaisonWorld => ({ ...INITIAL_WORLD, ...over });
const ids = (n: number, track: "A" | "B" = "A", w = world()) =>
  castAt(track, played(n, track), w)
    .named.map((c) => c.id)
    .sort();

describe("MAISON cast — the cap (§5)", () => {
  it("never puts more than five people in the room, on any beat, on either track", () => {
    for (const track of ["A", "B"] as const) {
      for (let n = 0; n <= BEATS.length; n++) {
        for (const mood of ["steady", "strained", "fractured", "trusting"] as const) {
          const c = castAt(track, played(n, track), world({ atelier_mood: mood, equity: "sold" }));
          const total = c.named.length + c.workers + (c.client ? 1 : 0);
          expect(total, `${track} beat ${n} ${mood}`).toBeLessThanOrEqual(MAX_ON_SCREEN);
        }
      }
    }
  });

  it("thins the ambient workers rather than the people who bring the beat", () => {
    // §5: "the atelier's ambient workers are the swing capacity — they thin out
    // when a named character is downstairs." A beat with nobody to bring it is
    // not a beat, so the loop gives way and the cast never does.
    const quiet = castAt("A", [], world());
    const crowded = castAt("B", played(3, "B"), world({ equity: "sold" }));
    expect(crowded.named.length).toBeGreaterThan(quiet.named.length);
    expect(crowded.workers).toBeLessThan(quiet.workers);
  });
});

describe("MAISON cast — who is actually here", () => {
  it("always has Élise, because she works here", () => {
    for (let n = 0; n <= BEATS.length; n++) expect(ids(n)).toContain("elise");
  });

  it("puts whoever brings the beat at its station", () => {
    expect(ids(0)).toContain("ines"); // C1 — Ines at the rail
    expect(ids(2)).toContain("helene"); // C3 — Hélène at the rail
    expect(ids(3)).toContain("dov"); // C4 — Dov at the desk
    expect(ids(4)).toContain("rio"); // C5 — Rio on the floor
  });

  it("keeps Véra out of the building except at C2 — she is a phone call (§5.3, §9.6)", () => {
    expect(ids(1)).toContain("vera"); // C2 is her beat
    expect(ids(0)).not.toContain("vera");
    expect(ids(4)).not.toContain("vera");
    expect(ids(8)).not.toContain("vera");
  });

  it("has the favouritism problem in the room from beat one on Level B (§14)", () => {
    expect(ids(0, "B")).toContain("kobby");
    expect(ids(0, "A")).not.toContain("kobby");
    // On Level A he arrives with the beat that is about him.
    expect(ids(6, "A")).toContain("kobby");
  });

  it("leaves Dov in the building once he owns part of it (§12 `equity`)", () => {
    expect(ids(6, "A", world({ equity: "whole" }))).not.toContain("dov");
    expect(ids(6, "A", world({ equity: "sold" }))).toContain("dov");
  });

  it("empties out after the show — nobody is staged at the ninth beat", () => {
    expect(BEATS[8].hosts).toEqual([]);
    expect(ids(8)).toEqual(["elise"]); // upstairs, and saying nothing about either
  });
});

describe("MAISON cast — where they stand", () => {
  it("gives everyone a walkable anchor inside the room", () => {
    const grid = makeRoomGrid();
    for (const c of ALL_CAST) {
      expect(grid.isWalkable(c.anchor.x, c.anchor.y), `${c.id} stands on a prop`).toBe(true);
    }
  });

  it("does not stack two people on one cell", () => {
    const cells = ALL_CAST.map((c) => `${c.anchor.x},${c.anchor.y}`);
    expect(new Set(cells).size).toBe(cells.length);
  });

  it("keeps Ines downstairs — she never goes up (§5.4)", () => {
    expect(castById("ines").anchor.y).toBeGreaterThan(5);
  });

  it("lets only Élise stand still (§5.1)", () => {
    const still = ALL_CAST.filter((c) => c.standsStill).map((c) => c.id);
    expect(still).toContain("elise");
    // Rio never sits and Kobby keeps drifting down to look at his own pieces.
    expect(still).not.toContain("rio");
    expect(still).not.toContain("kobby");
  });

  it("dresses nobody in the house colour — §4 spends it on the rail alone", () => {
    for (const c of ALL_CAST) {
      expect(Object.values(c.palette), c.id).not.toContain(MAISON_PALETTE.vermilion);
    }
  });

  it("stages every character the season names, and authors none it does not", () => {
    const authored = new Set(ALL_CAST.map((c) => c.id));
    for (const id of STAGED_CAST) expect(authored.has(id as CastId), id).toBe(true);
    // Véra and Kobby are staged by rule rather than by a beat's host list, so
    // the authored set is allowed to be the larger one — but only by those two.
    const unstaged = [...authored].filter((id) => !STAGED_CAST.includes(id));
    expect(unstaged.sort()).toEqual([]);
  });

  it("stands the host of the live beat at the station the beat is staged at", () => {
    // The room said this out loud long before it was true: the HUD reads
    // "Ines is at the rail" and guided navigation walks you there, while Ines
    // stayed at her §5 anchor by the door for the whole beat.
    const grid = makeRoomGrid();
    for (const track of ["A", "B"] as const) {
      for (let n = 0; n < BEATS.length; n++) {
        const beat = BEATS[n];
        const station = stationById(beat.station)!;
        const cast = castAt(track, played(n, track), world());
        for (const hostId of beat.hosts) {
          const member = cast.named.find((m) => m.id === hostId);
          if (!member) continue; // not every host is in the room every beat
          const d =
            Math.abs(member.anchor.x - station.cell.x) + Math.abs(member.anchor.y - station.cell.y);
          expect(d, `${member.name} is ${d} cells from ${station.label} at beat ${n + 1}`).toBe(1);
          expect(grid.isWalkable(member.anchor.x, member.anchor.y)).toBe(true);
        }
      }
    }
  });

  it("never stands two people on the same cell", () => {
    for (const track of ["A", "B"] as const) {
      for (let n = 0; n < BEATS.length; n++) {
        const cast = castAt(track, played(n, track), world());
        const cells = cast.named.map((m) => `${m.anchor.x},${m.anchor.y}`);
        expect(new Set(cells).size, `beat ${n + 1} on ${track} stacks people`).toBe(cells.length);
      }
    }
  });
});
