import { describe, it, expect } from "vitest";
import { findPath } from "@/lib/pathfinding";
import {
  EXIT,
  FURNITURE,
  PLATFORM_EDGE_Y,
  RAMP_CELLS,
  ROOM_H,
  ROOM_W,
  SPAWN,
  STATIONS,
  STEP_CELLS,
  ZONES,
  exitNear,
  levelAt,
  makeRoomGrid,
  stationNear,
  zoneAt,
} from "./room";
import type { Cell } from "@/lib/pathfinding";

const grid = makeRoomGrid();
const reachable = (from: Cell, to: Cell, g = grid) =>
  (from.x === to.x && from.y === to.y) || findPath(g, from, to).length > 0;

describe("MAISON room — the shell", () => {
  it("is one volume, twelve by fourteen, with the platform across the back", () => {
    expect(ROOM_W).toBe(12);
    expect(ROOM_H).toBe(14);
    expect(PLATFORM_EDGE_Y).toBeLessThan(ROOM_H / 2); // the atelier is the back third
  });

  it("puts every prop inside the room", () => {
    for (const p of FURNITURE) {
      expect(p.cell.x, `${p.kind} x`).toBeGreaterThanOrEqual(0);
      expect(p.cell.y, `${p.kind} y`).toBeGreaterThanOrEqual(0);
      expect(p.cell.x, `${p.kind} x`).toBeLessThan(ROOM_W);
      expect(p.cell.y, `${p.kind} y`).toBeLessThan(ROOM_H);
    }
  });

  it("never puts two blocking props on the same cell", () => {
    const seen = new Set<string>();
    for (const p of FURNITURE.filter((q) => q.blocking)) {
      const k = `${p.cell.x},${p.cell.y}`;
      expect(seen.has(k), `two props on ${k}`).toBe(false);
      seen.add(k);
    }
  });

  it("spawns you at the desk on the boutique floor, facing the room", () => {
    expect(grid.isWalkable(SPAWN.x, SPAWN.y)).toBe(true);
    expect(levelAt(SPAWN)).toBe("boutique");
    // §3.2: the rail, and the atelier beyond it, are both ahead of you.
    expect(SPAWN.y).toBeGreaterThan(PLATFORM_EDGE_Y);
  });

  it("keeps the door walkable and always available (§7)", () => {
    expect(grid.isWalkable(EXIT.x, EXIT.y)).toBe(true);
    expect(exitNear(EXIT)).toBe(true);
    expect(exitNear({ x: EXIT.x, y: EXIT.y - 1 })).toBe(true);
    expect(exitNear(SPAWN)).toBe(false);
    expect(reachable(SPAWN, EXIT)).toBe(true);
  });
});

describe("MAISON room — getting about", () => {
  it("reaches every station from the spawn", () => {
    for (const s of STATIONS) {
      expect(grid.isWalkable(s.cell.x, s.cell.y), `${s.id} stands on a prop`).toBe(true);
      expect(reachable(SPAWN, s.cell), `${s.id} unreachable`).toBe(true);
    }
  });

  it("reaches both levels — the platform is open, not a separate room", () => {
    const atelier = STATIONS.filter((s) => levelAt(s.cell) === "atelier");
    const boutique = STATIONS.filter((s) => levelAt(s.cell) === "boutique");
    expect(atelier.length).toBeGreaterThan(2);
    expect(boutique.length).toBeGreaterThan(2);
  });

  it("holds RAMP PARITY — every station reachable with the steps sealed (§18.2.6)", () => {
    // The blocking acceptance criterion: no content is ever gated behind the
    // steps. Walk the whole room using only the ramp and it still works.
    const rampOnly = makeRoomGrid(STEP_CELLS);
    for (const c of STEP_CELLS) expect(rampOnly.isWalkable(c.x, c.y)).toBe(false);
    for (const s of STATIONS) {
      expect(reachable(SPAWN, s.cell, rampOnly), `${s.id} needs the steps`).toBe(true);
    }
  });

  it("has a working set of steps too — the ramp is default, not the only way", () => {
    const stepsOnly = makeRoomGrid(RAMP_CELLS);
    for (const s of STATIONS) {
      expect(reachable(SPAWN, s.cell, stepsOnly), `${s.id} needs the ramp`).toBe(true);
    }
  });

  it("seals the platform everywhere except the steps and the ramp", () => {
    const openings = new Set([...STEP_CELLS, ...RAMP_CELLS].map((c) => `${c.x},${c.y}`));
    for (let x = 0; x < ROOM_W; x++) {
      const walkable = grid.isWalkable(x, PLATFORM_EDGE_Y);
      expect(walkable, `balustrade at x=${x}`).toBe(openings.has(`${x},${PLATFORM_EDGE_Y}`));
    }
  });
});

describe("MAISON room — the house in its own words (§15)", () => {
  it("names five zones, and the rail beats the floor it stands on", () => {
    expect(ZONES.map((z) => z.id)).toEqual([
      "z_atelier",
      "z_stair",
      "z_fitting",
      "z_rail",
      "z_boutique",
    ]);
    expect(zoneAt({ x: 5, y: 8 }).id).toBe("z_rail");
    expect(zoneAt({ x: 6, y: 12 }).id).toBe("z_boutique");
    expect(zoneAt({ x: 5, y: 2 }).id).toBe("z_atelier");
    expect(zoneAt({ x: 0, y: 7 }).id).toBe("z_stair");
    expect(zoneAt({ x: 10, y: 8 }).id).toBe("z_fitting");
  });

  it("labels every zone and station in the house's words, never an object id", () => {
    for (const z of ZONES) {
      expect(z.label, z.id).toMatch(/^[a-zÉ]/); // lower-case prose, not a code
      expect(z.label).not.toMatch(/_|\d/);
    }
    for (const s of STATIONS) {
      expect(s.label, s.id).not.toMatch(/_|\d/);
      expect(s.label.length, s.id).toBeGreaterThan(3);
    }
  });

  it("stages every beat of the season at a station that exists (§8)", () => {
    const staged = [
      "st_rail",
      "st_bench",
      "st_desk",
      "st_boutique_floor",
      "st_atelier",
      "st_press_wall",
    ];
    const ids = new Set(STATIONS.map((s) => s.id));
    for (const id of staged) expect(ids.has(id), `${id} has nowhere to happen`).toBe(true);
  });

  it("keeps the desk phone reachable, because asking is never gated (§9.6)", () => {
    const phone = STATIONS.find((s) => s.id === "st_phone");
    expect(phone?.prompt).toBe("call Véra");
    expect(reachable(SPAWN, phone!.cell)).toBe(true);
  });

  it("finds the nearest station, and nothing out in the open floor", () => {
    expect(stationNear({ x: 5, y: 9 })?.id).toBe("st_rail");
    expect(stationNear({ x: 2, y: 10 })?.id).toBe("st_desk");
    // §4's negative space: four metres of empty polished floor is a real place
    // you can stand with nothing to do, and the room should say nothing there.
    expect(stationNear({ x: 7, y: 12 })).toBeNull();
  });

  it("separates places you can act from places a beat is merely staged", () => {
    // A station with a prompt is an interactable (§7). A station without one is
    // a guided-navigation target and a beat anchor (§8) — standing on the floor
    // where Rio will walk should not offer you a verb.
    const actionable = STATIONS.filter((s) => s.prompt).map((s) => s.id);
    const staged = STATIONS.filter((s) => !s.prompt).map((s) => s.id);
    expect(actionable).toContain("st_rail");
    expect(actionable).toContain("st_phone");
    expect(staged).toContain("st_boutique_floor");
    expect(stationNear({ x: 6, y: 11 })?.prompt).toBeUndefined();
  });

  it("gives the things you can act on a diegetic prompt, not a verb menu", () => {
    const prompts = STATIONS.filter((s) => s.prompt).map((s) => s.prompt!);
    expect(prompts).toContain("look at the collection");
    expect(prompts).toContain("call Véra");
    for (const p of prompts) expect(p, p).toMatch(/^[a-z]/); // "read the press wall", not "Read"
  });
});
