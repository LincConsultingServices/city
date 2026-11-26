import { describe, it, expect } from "vitest";
import { findPath } from "@/lib/pathfinding";
import {
  EXIT,
  FURNITURE,
  ROOM_H,
  ROOM_W,
  SPAWN,
  STATIONS,
  isBackOffice,
  makeRoomGrid,
  stationForProp,
  stationNear,
} from "./room";
import { STAFF, STILL_CUSTOMERS, WALKING_CUSTOMERS } from "./cast";
import { BAKED_KINDS } from "./props";

const grid = makeRoomGrid();
const reachable = (to: { x: number; y: number }) =>
  findPath(grid, SPAWN, to).length > 0 || (to.x === SPAWN.x && to.y === SPAWN.y);

describe("Meridian Bank — the room", () => {
  it("has the door and the spawn on walkable cells, next to each other", () => {
    expect(grid.isWalkable(SPAWN.x, SPAWN.y)).toBe(true);
    expect(grid.isWalkable(EXIT.x, EXIT.y)).toBe(true);
    expect(reachable(EXIT)).toBe(true);
  });

  it("lets you walk to every station from the door", () => {
    for (const s of STATIONS) {
      expect(grid.isWalkable(s.cell.x, s.cell.y), `${s.id} stands on furniture`).toBe(true);
      expect(reachable(s.cell), `${s.id} cannot be reached`).toBe(true);
    }
  });

  it("finds each station when you stand on it", () => {
    for (const s of STATIONS) expect(stationNear(s.cell)?.id).toBe(s.id);
  });

  it("keeps the back office behind the counter, with no way in", () => {
    for (let y = 0; y < ROOM_H; y++) {
      for (let x = 0; x < ROOM_W; x++) {
        if (isBackOffice({ x, y }) && grid.isWalkable(x, y)) {
          expect(reachable({ x, y }), `back-office cell ${x},${y} is reachable`).toBe(false);
        }
      }
    }
  });

  it("puts every member of staff and every customer on the floor, not in the furniture", () => {
    for (const m of STAFF) expect(grid.isWalkable(m.anchor.x, m.anchor.y), m.id).toBe(true);
    for (const c of STILL_CUSTOMERS) expect(grid.isWalkable(c.cell.x, c.cell.y), c.key).toBe(true);
    for (const w of WALKING_CUSTOMERS) {
      for (const stop of w.stops) {
        expect(reachable(stop), `${w.key} stop ${stop.x},${stop.y}`).toBe(true);
      }
    }
  });

  it("gives every member of staff a station that exists", () => {
    const ids = new Set(STATIONS.map((s) => s.id));
    for (const m of STAFF) expect(ids.has(m.stationId), m.id).toBe(true);
  });

  it("draws every kind of prop it places", () => {
    const kinds = new Set(BAKED_KINDS);
    for (const p of FURNITURE) expect(kinds.has(p.kind), p.kind).toBe(true);
  });

  it("maps a click on each teller window to that window", () => {
    expect(stationForProp("counter_window", { x: 8, y: 4 })?.id).toBe("st_window1");
    expect(stationForProp("counter_window", { x: 10, y: 4 })?.id).toBe("st_window2");
    expect(stationForProp("counter_window", { x: 12, y: 4 })?.id).toBe("st_window3");
    expect(stationForProp("atm", { x: 0, y: 9 })?.id).toBe("st_atm");
  });
});

describe("Meridian Bank — the staff explain, they never advise", () => {
  // The rule in docs/PRD_Building_Bank.md §1: nothing in the building tells the
  // player what they personally should do with their money.
  const ADVICE = [
    /you should (invest|save|put|open|borrow|take)/i,
    /we recommend you/i,
    /best (option|choice) for you/i,
  ];

  it("has no line that reads as financial advice", () => {
    for (const m of STAFF) {
      for (const line of m.lines) {
        for (const pattern of ADVICE) expect(line, `${m.id}: ${line}`).not.toMatch(pattern);
      }
    }
  });
});
