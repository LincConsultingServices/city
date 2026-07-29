// §18.2.5 is blocking: the season must be completable on a keyboard alone. That
// is a property of this list, not of the nav that renders it — if the next beat
// is not on the list, no amount of tabbing through the buttons gets you there.
import { describe, it, expect } from "vitest";
import { findPath } from "@/lib/pathfinding";
import { SPAWN, makeRoomGrid, stationById } from "./room";
import { BEATS, type Track } from "./season";
import { beatActivityId } from "./beats";
import { guideTargets, GUIDE_NAMED_IDS } from "./guide";
import type { Decision } from "./maisonStore";

const grid = makeRoomGrid();
const decide = (n: number, track: Track): Decision[] =>
  BEATS.slice(0, n).map((b) => ({ id: beatActivityId(b, track), path: ["a"] }));

describe("MAISON guided navigation", () => {
  it("lists §7's stations, in §7's order", () => {
    const named = guideTargets(null, [])
      .map((t) => t.stationId)
      .filter((id) => id && GUIDE_NAMED_IDS.includes(id));
    expect(named).toEqual([...GUIDE_NAMED_IDS]);
  });

  it("always ends on the door, whatever the season is doing", () => {
    for (const decided of [[], decide(4, "A"), decide(9, "A")]) {
      const list = guideTargets("A", decided);
      expect(list[list.length - 1].stationId).toBe(null);
      expect(list[list.length - 1].label).toMatch(/door/);
    }
  });

  it("puts the waiting beat first, named by whoever is holding it", () => {
    const list = guideTargets("A", []);
    // C1 is Ines at the rail. The head of the list says so — where somebody is
    // standing, not what to say to them.
    expect(list[0].stationId).toBe(BEATS[0].station);
    expect(list[0].label).toContain(BEATS[0].host);
  });

  it("moves the head of the list on as the season moves", () => {
    for (const track of ["A", "B"] as Track[]) {
      for (let n = 0; n < BEATS.length; n++) {
        const head = guideTargets(track, decide(n, track))[0];
        expect(head.stationId, `after ${n} beats on track ${track}`).toBe(BEATS[n].station);
      }
    }
  });

  it("reaches every beat in the season by keyboard alone", () => {
    // The blocking criterion, stated as a property: for every beat of every
    // track, the station it is staged at is on the list you can Tab to, and you
    // can walk there from where the previous beat left you.
    for (const track of ["A", "B"] as Track[]) {
      for (let n = 0; n < BEATS.length; n++) {
        const list = guideTargets(track, decide(n, track));
        const target = list.find((t) => t.stationId === BEATS[n].station);
        expect(target, `beat ${n + 1} on track ${track} is off the guide`).toBeDefined();
        const from = n === 0 ? SPAWN : (stationById(BEATS[n - 1].station)?.cell ?? SPAWN);
        const walk = findPath(grid, from, target!.cell);
        const arrived = walk.length > 0 || (from.x === target!.cell.x && from.y === target!.cell.y);
        expect(arrived, `beat ${n + 1} on track ${track} is unwalkable`).toBe(true);
      }
    }
  });

  it("names every stop in the house's own words", () => {
    for (const t of guideTargets("A", [])) {
      expect(t.label, t.label).not.toMatch(/_|\d/); // never "st_rail", never "station 2"
      expect(t.label.length).toBeGreaterThan(3);
    }
  });

  it("lists nothing twice, even when the beat is at a named station", () => {
    // C1 is at the rail, and the rail is also one of §7's seven.
    const list = guideTargets("A", []);
    const ids = list.map((t) => t.stationId);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
