import { describe, it, expect } from "vitest";
import { STAGES, stageById } from "./journey";
import {
  SERVE_AT,
  TILL_STATION,
  planFor,
  servesAtTill,
  stillFor,
  unitsFor,
  walkInCast,
  walkInFor,
  walkInNow,
} from "./counterShift";
import { GATES, NO_GATES_OPEN, STATIONS, makeRoomGrid } from "./room";
import { findPath } from "@/lib/pathfinding";
import { DOOR } from "./customers";

const l1 = stageById("cafe.l1")!;
const l2 = stageById("cafe.l2")!;
const l3 = stageById("cafe.l3")!;
const all = (stage: typeof l1) => unitsFor(stage).map((u, i) => walkInFor(stage, u, i));

describe("people come to you", () => {
  it("at the till, the pass and the table — and nowhere else", () => {
    expect(STAGES.filter((s) => planFor(s)).map((s) => s.id)).toEqual([
      "cafe.l1",
      "cafe.l2",
      "cafe.l3",
    ]);
    expect(STAGES.filter(servesAtTill).map((s) => s.id)).toEqual(["cafe.l1"]);
    expect(STATIONS.some((s) => s.id === TILL_STATION)).toBe(true);
  });

  it("has somebody walk up for every unit of those stages, each their own", () => {
    for (const stage of [l1, l2, l3]) {
      const ins = all(stage);
      expect(ins.length).toBeGreaterThan(0);
      expect(ins.every(Boolean), `${stage.id} has a unit nobody comes for`).toBe(true);
      expect(new Set(ins.map((w) => w!.key)).size).toBe(ins.length);
    }
  });

  it("brings regulars in as themselves, and strangers to the till as 'Customer'", () => {
    const [oatMilk, wrongOrder] = all(l1);
    expect(oatMilk!.who).toBe("nadia");
    expect(oatMilk!.speaker.name).toBe("Nadia");
    expect(wrongOrder!.who).toBeNull();
    expect(wrongOrder!.speaker.name).toBe("Customer");
    expect(walkInCast(l1)).toEqual(new Set(["nadia", "marcus"]));
  });

  it("sends your team to the pass from where they work, through the flap", () => {
    const ins = all(l2);
    expect(ins.map((w) => w!.who)).toEqual(["crew_till", "tomas", "crew_till", "tomas"]);
    expect(ins[0]!.speaker.name).toBe("Sam");
    // Staff set off from their own spot, not the door, and nobody is hidden for the stage.
    expect(ins.every((w) => w!.from.x !== DOOR.x || w!.from.y !== DOOR.y)).toBe(true);
    expect(walkInCast(l2).size).toBe(0);
    // Tomas and Sam wait at their spots; the cook stays off the pass you stand at.
    expect(stillFor(l2)).toEqual(new Set(["crew_till", "tomas", "crew_kitchen"]));
  });

  it("brings each business decision to your table, by whoever owns it", () => {
    const ins = all(l3);
    expect(ins.map((w) => w!.who)).toEqual(["priya", "ray", "tomas", "ellery"]);
    // Ray and Ellery come in off the street; Priya and Tomas from behind the counter.
    expect(walkInCast(l3)).toEqual(new Set(["ray", "ellery"]));
    expect(ins[1]!.from).toEqual(DOOR);
    expect(walkInNow(l3, { unitId: "cafe.l3.s2" })!.speaker.name).toBe("Ray");
  });

  it("can walk everyone to where they stop", () => {
    const street = makeRoomGrid(NO_GATES_OPEN);
    const staffSide = makeRoomGrid(new Set(GATES.map((g) => g.id)));
    for (const stage of [l1, l2, l3]) {
      for (const w of all(stage)) {
        const fromDoor = w!.from.x === DOOR.x && w!.from.y === DOOR.y;
        const path = findPath(fromDoor ? street : staffSide, w!.from, w!.serveAt);
        expect(path.length, `${w!.key} cannot reach ${stage.id}'s spot`).toBeGreaterThan(0);
      }
    }
    expect(findPath(street, DOOR, SERVE_AT).length).toBeGreaterThan(0);
  });

  it("walks nobody in for a stage without a plan", () => {
    const review = stageById("cafe.review1")!;
    expect(walkInNow(review, { unitId: "cafe.review1.q1" })).toBeNull();
    expect(walkInCast(review).size).toBe(0);
  });
});
