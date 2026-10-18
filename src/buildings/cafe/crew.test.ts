import { describe, it, expect } from "vitest";
import { findPath, type Cell } from "@/lib/pathfinding";
import { GATES, STAFF_CELLS, makeRoomGrid, type GateId } from "./room";
import { CAST } from "./cast";
import { CREW } from "./crew";

const open = makeRoomGrid(new Set<GateId>(GATES.map((g) => g.id)));
const at = (c: Cell) => `(${c.x},${c.y})`;
const staffSide = new Set(STAFF_CELLS.map(at));

describe("the crew", () => {
  it("works behind the counter and nowhere else", () => {
    for (const c of CREW) {
      expect(staffSide.has(at(c.anchor)), `${c.id} stands at ${at(c.anchor)}`).toBe(true);
      for (const p of c.patrol) {
        expect(staffSide.has(at(p)), `${c.id} walks to ${at(p)}`).toBe(true);
      }
    }
  });

  it("walks loops it can actually walk, starting where it stands", () => {
    for (const c of CREW) {
      if (c.patrol.length === 0) continue;
      expect(c.patrol[0]).toEqual(c.anchor);
      for (let i = 1; i < c.patrol.length; i++) {
        expect(
          findPath(open, c.patrol[i - 1], c.patrol[i]).length,
          `${c.id} cannot get from ${at(c.patrol[i - 1])} to ${at(c.patrol[i])}`,
        ).toBeGreaterThan(0);
      }
    }
  });

  it("wears the house uniform, like the staff in the cast", () => {
    for (const c of CREW) {
      expect(["uniform", "chef"]).toContain(c.palette.outfit);
    }
    for (const id of ["priya", "tomas"]) {
      expect(CAST.find((m) => m.id === id)!.palette.outfit).toBe("uniform");
    }
    expect(CAST.find((m) => m.id === "owen")!.palette.outfit).toBe("suit");
  });

  it("never shares a starting spot with the cast", () => {
    const cast = new Set(CAST.map((m) => at(m.anchor)));
    for (const c of CREW) {
      expect(cast.has(at(c.anchor)), `${c.id} starts on somebody's cell`).toBe(false);
    }
  });
});
