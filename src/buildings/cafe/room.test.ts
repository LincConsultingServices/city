import { describe, it, expect } from "vitest";
import { findPath, type Cell } from "@/lib/pathfinding";
import {
  EXIT,
  FURNITURE,
  GATES,
  NO_GATES_OPEN,
  ROOM_H,
  ROOM_W,
  SPAWN,
  STAFF_CELLS,
  STATIONS,
  ZONES,
  makeRoomGrid,
  zoneAt,
  type GateId,
} from "./room";

const ALL_OPEN: ReadonlySet<GateId> = new Set(GATES.map((g) => g.id));
const closed = makeRoomGrid(NO_GATES_OPEN);
const open = makeRoomGrid(ALL_OPEN);

const at = (c: Cell) => `(${c.x},${c.y})`;
const inBounds = (c: Cell) => c.x >= 0 && c.y >= 0 && c.x < ROOM_W && c.y < ROOM_H;

function everyCell(): Cell[] {
  const out: Cell[] = [];
  for (let y = 0; y < ROOM_H; y++) for (let x = 0; x < ROOM_W; x++) out.push({ x, y });
  return out;
}

describe("the Café room", () => {
  it("reports its own dimensions", () => {
    expect(open.width).toBe(ROOM_W);
    expect(open.height).toBe(ROOM_H);
  });

  it("spawns you on a walkable cell, next to a walkable door", () => {
    expect(closed.isWalkable(SPAWN.x, SPAWN.y), `spawn ${at(SPAWN)} blocked`).toBe(true);
    expect(closed.isWalkable(EXIT.x, EXIT.y), `exit ${at(EXIT)} blocked`).toBe(true);
    expect(
      findPath(closed, SPAWN, EXIT).length,
      "cannot reach the door from spawn",
    ).toBeGreaterThan(0);
  });

  it("keeps every cell, gate and station inside the room", () => {
    for (const p of FURNITURE) {
      expect(inBounds(p.cell), `${p.kind} at ${at(p.cell)} is outside the room`).toBe(true);
    }
    for (const g of GATES) {
      expect(inBounds(g.cell), `gate ${g.id} at ${at(g.cell)} is outside the room`).toBe(true);
    }
    for (const s of STATIONS) {
      expect(inBounds(s.cell), `station ${s.id} at ${at(s.cell)} is outside the room`).toBe(true);
    }
    expect(inBounds(SPAWN)).toBe(true);
    expect(inBounds(EXIT)).toBe(true);
  });

  it("never puts two solid props on the same cell", () => {
    const seen = new Set<string>();
    for (const p of FURNITURE.filter((q) => !q.overlay)) {
      const k = `${p.cell.x},${p.cell.y}`;
      expect(seen.has(k), `two props claim ${at(p.cell)} (second is ${p.kind})`).toBe(false);
      seen.add(k);
    }
  });

  it("hosts every overlay on a cell that exists", () => {
    const hosts = new Set(
      FURNITURE.filter((p) => !p.overlay).map((p) => `${p.cell.x},${p.cell.y}`),
    );
    for (const p of FURNITURE.filter((q) => q.overlay)) {
      expect(
        hosts.has(`${p.cell.x},${p.cell.y}`),
        `overlay ${p.kind} at ${at(p.cell)} has no host`,
      ).toBe(true);
    }
  });

  it("leaves no walkable cell stranded once the flap is up", () => {
    for (const c of everyCell()) {
      if (!open.isWalkable(c.x, c.y)) continue;
      expect(
        findPath(open, SPAWN, c).length,
        `${at(c)} is walkable but unreachable`,
      ).toBeGreaterThan(0);
    }
  });

  it("seals the staff zone while the flap is down", () => {
    for (const c of STAFF_CELLS) {
      expect(closed.isWalkable(c.x, c.y), `staff cell ${at(c)} should be floor`).toBe(true);
      expect(findPath(closed, SPAWN, c).length, `${at(c)} reachable with the flap down`).toBe(0);
    }
  });

  it("opens the staff zone the moment the flap goes up", () => {
    for (const c of STAFF_CELLS) {
      expect(
        findPath(open, SPAWN, c).length,
        `${at(c)} unreachable with the flap up`,
      ).toBeGreaterThan(0);
    }
  });

  it("changes exactly one cell when a gate toggles", () => {
    const changed = everyCell().filter(
      (c) => closed.isWalkable(c.x, c.y) !== open.isWalkable(c.x, c.y),
    );
    expect(changed.map(at)).toEqual([at(GATES[0].cell)]);
  });

  it("puts every station somewhere you can stand and walk to", () => {
    for (const s of STATIONS) {
      expect(
        open.isWalkable(s.cell.x, s.cell.y),
        `station ${s.id} at ${at(s.cell)} is blocked`,
      ).toBe(true);
      expect(findPath(open, SPAWN, s.cell).length, `station ${s.id} unreachable`).toBeGreaterThan(
        0,
      );
    }
  });

  it("names a zone for every cell, most specific first", () => {
    for (const c of everyCell()) {
      expect(zoneAt(c).label, `no zone for ${at(c)}`).toBeTruthy();
    }
    expect(zoneAt({ x: 0, y: 1 }).id).toBe("z_pass");
    expect(zoneAt({ x: 4, y: 1 }).id).toBe("z_behind");
    expect(zoneAt({ x: 8, y: 4 }).id).toBe("z_window");
    expect(zoneAt(SPAWN).id).toBe("z_floor");
    expect(ZONES[ZONES.length - 1].contains(SPAWN), "the last zone must be a catch-all").toBe(true);
  });
});
