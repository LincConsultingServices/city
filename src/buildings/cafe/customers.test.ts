import { describe, it, expect } from "vitest";
import {
  BELL_S,
  DOOR,
  INSIDE,
  ORDER_AT,
  PICKUP_AT,
  QUEUE,
  SEATS,
  WAIT,
  everyRouteCell,
  goalFor,
  nextBell,
  nextPhase,
  prepFor,
  sitFor,
  staysIn,
  type Phase,
} from "./customers";
import { FURNITURE, NO_GATES_OPEN, makeRoomGrid } from "./room";
import { CAST } from "./cast";
import { OPENING_WORLD, type World } from "./world";
import { findPath, type Cell } from "@/lib/pathfinding";

const grid = makeRoomGrid(NO_GATES_OPEN);
const worldWith = (regulars: World["regulars"]): World => ({ ...OPENING_WORLD, regulars });
const at = (c: Cell) => `(${c.x},${c.y})`;
const manhattan = (a: Cell, b: Cell) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
const propAt = (c: Cell) =>
  FURNITURE.find((p) => !p.overlay && p.cell.x === c.x && p.cell.y === c.y);
const overlayAt = (c: Cell) =>
  FURNITURE.find((p) => p.overlay && p.cell.x === c.x && p.cell.y === c.y);

describe("where the loop puts people", () => {
  it("never routes anybody into a wall or a chair", () => {
    // The whole reason this file has no Pixi in it: "is that cell walkable" is a
    // layout question, and layout questions should fail in CI rather than as a
    // customer standing inside the four-top.
    for (const cell of everyRouteCell()) {
      expect(grid.isWalkable(cell.x, cell.y), `${at(cell)} is blocked`).toBe(true);
    }
  });

  it("routes the whole visit with the flap down, because customers never go behind the bar", () => {
    const legs: [string, Cell, Cell][] = [
      ["door → inside", INSIDE, QUEUE[QUEUE.length - 1]],
      ["queue → till", QUEUE[0], ORDER_AT],
      ...WAIT.map((w, i): [string, Cell, Cell] => [`till → wait ${i}`, ORDER_AT, w]),
      ...WAIT.map((w, i): [string, Cell, Cell] => [`wait ${i} → pickup`, w, PICKUP_AT]),
      ["pickup → door", PICKUP_AT, DOOR],
      ...SEATS.map((s, i): [string, Cell, Cell] => [`pickup → seat ${i}`, PICKUP_AT, s.approach]),
      ...SEATS.map((s, i): [string, Cell, Cell] => [`seat ${i} → door`, s.approach, DOOR]),
    ];
    for (const [where, from, to] of legs) {
      expect(findPath(grid, from, to).length, `${where} has no route`).toBeGreaterThan(0);
    }
  });

  it("orders at the till and collects at the pickup", () => {
    // The two stations the counter's signs name. Standing anywhere else to
    // order would be a customer miming at a bare stretch of counter.
    expect(overlayAt({ x: ORDER_AT.x, y: ORDER_AT.y - 1 })?.kind).toBe("till");
    expect(overlayAt({ x: PICKUP_AT.x, y: PICKUP_AT.y - 1 })?.kind).toBe("pickup");
  });

  it("queues toward the till, nearest slot first", () => {
    for (let i = 1; i < QUEUE.length; i++) {
      expect(
        manhattan(QUEUE[i - 1], ORDER_AT),
        `slot ${i} is not behind slot ${i - 1}`,
      ).toBeLessThan(manhattan(QUEUE[i], ORDER_AT));
    }
  });

  it("waits along the counter, not in the way of the till or the pickup", () => {
    for (const w of WAIT) {
      expect(w.y, `${at(w)} is not along the counter`).toBe(PICKUP_AT.y);
      expect(at(w)).not.toBe(at(PICKUP_AT));
      expect(at(w)).not.toBe(at(ORDER_AT));
    }
  });

  it("sits people on real chairs, facing real tables, stepped onto from the floor", () => {
    for (const [i, s] of SEATS.entries()) {
      expect(propAt(s.chair)?.kind, `seat ${i}'s chair ${at(s.chair)} is not a chair`).toBe(
        "chair",
      );
      expect(propAt(s.table)?.kind, `seat ${i}'s table ${at(s.table)} is not a table`).toBe(
        "table",
      );
      expect(manhattan(s.chair, s.table), `seat ${i} is not at its table`).toBe(1);
      expect(manhattan(s.approach, s.chair), `seat ${i} is stepped onto from afar`).toBe(1);
    }
  });

  it("gives every seat its own chair", () => {
    const chairs = SEATS.map((s) => at(s.chair));
    expect(new Set(chairs).size, `two seats share a chair: ${chairs.join(", ")}`).toBe(
      chairs.length,
    );
  });

  it("keeps its seats off the cast's chairs and out of the cast's way", () => {
    // Owen's chair at (7,6) is the interview, and Marcus's at (9,6) is his. A
    // customer in either would wreck the one table in the room that matters.
    const taken = new Set(CAST.map((m) => at(m.anchor)));
    for (const seat of SEATS) {
      expect(taken.has(at(seat.chair)), `seat ${at(seat.chair)} is somebody's`).toBe(false);
      expect(taken.has(at(seat.approach)), `seat ${at(seat.approach)} is somebody's spot`).toBe(
        false,
      );
    }
  });

  it("comes in and goes out through the player's own door", () => {
    expect(goalFor("leaving", 0, null)).toEqual(DOOR);
    expect(goalFor("entering", 0, null)).toEqual(INSIDE);
  });

  it("walks to the stations in order: till, counter, pickup, chair", () => {
    expect(goalFor("ordering", 0, null)).toEqual(ORDER_AT);
    expect(goalFor("waiting", 1, null)).toEqual(WAIT[1]);
    expect(goalFor("collecting", 0, null)).toEqual(PICKUP_AT);
    expect(goalFor("seating", 0, SEATS[0])).toEqual(SEATS[0].approach);
  });

  it("stands still when it is standing still", () => {
    expect(goalFor("away", 0, SEATS[0])).toBeNull();
    expect(goalFor("seated", 0, SEATS[0])).toBeNull();
  });

  it("clamps an over-long line onto its last slot rather than off the end", () => {
    expect(goalFor("queueing", 99, null)).toEqual(QUEUE[QUEUE.length - 1]);
    expect(goalFor("waiting", 99, null)).toEqual(WAIT[WAIT.length - 1]);
  });
});

describe("the visit itself", () => {
  it("always comes back round to away, from anywhere", () => {
    const all: Phase[] = [
      "away",
      "entering",
      "queueing",
      "ordering",
      "waiting",
      "collecting",
      "seating",
      "seated",
      "leaving",
    ];
    for (const start of all) {
      for (const stays of [true, false]) {
        let phase: Phase = start;
        let steps = 0;
        while (phase !== "away" && steps < 12) {
          phase = nextPhase(phase, stays);
          steps++;
        }
        expect(phase, `${start} never finishes`).toBe("away");
      }
    }
  });

  it("pays before it waits, and collects before it sits or leaves", () => {
    expect(nextPhase("queueing", true)).toBe("ordering");
    expect(nextPhase("ordering", true)).toBe("waiting");
    expect(nextPhase("waiting", true)).toBe("collecting");
  });

  it("sends a takeaway order straight back out of the door", () => {
    expect(nextPhase("collecting", false)).toBe("leaving");
    expect(nextPhase("collecting", true)).toBe("seating");
  });

  it("never sits somebody down when there is nowhere to sit", () => {
    expect(staysIn(0, 0)).toBe(false);
    expect(staysIn(0.99, 4)).toBe(false);
    expect(staysIn(0.1, 4)).toBe(true);
  });
});

describe("the schedule", () => {
  it("rings sooner in a busy room than in a thin one", () => {
    expect(nextBell(worldWith("full"), false, 0.5)).toBeLessThan(
      nextBell(worldWith("thin"), false, 0.5),
    );
  });

  it("stretches the gaps out under reduced motion", () => {
    expect(nextBell(OPENING_WORLD, true, 0.5)).toBeGreaterThan(nextBell(OPENING_WORLD, false, 0.5));
  });

  it("stays inside its own bounds however bad the random number is", () => {
    for (const rand of [-3, 0, 0.5, 1, 9]) {
      expect(nextBell(OPENING_WORLD, false, rand)).toBeGreaterThanOrEqual(BELL_S[0] * 0.75);
      expect(nextBell(OPENING_WORLD, false, rand)).toBeLessThanOrEqual(BELL_S[1]);
      expect(sitFor(rand)).toBeGreaterThanOrEqual(30);
      expect(sitFor(rand)).toBeLessThanOrEqual(70);
      expect(prepFor(rand)).toBeGreaterThanOrEqual(5);
      expect(prepFor(rand)).toBeLessThanOrEqual(10);
    }
  });
});
