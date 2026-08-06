import { describe, it, expect } from "vitest";
import { findPath, type Cell } from "@/lib/pathfinding";
import { GATES, ROOM_H, ROOM_W, SPAWN, makeRoomGrid, type GateId } from "./room";
import { CAST, OPENING_CAST, castById, castNear, castPresent, facingFrom } from "./cast";

const ALL_OPEN: ReadonlySet<GateId> = new Set(GATES.map((g) => g.id));
const open = makeRoomGrid(ALL_OPEN);

const at = (c: Cell) => `(${c.x},${c.y})`;
const inBounds = (c: Cell) => c.x >= 0 && c.y >= 0 && c.x < ROOM_W && c.y < ROOM_H;
const manhattan = (a: Cell, b: Cell) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

/** Every cell in the room, walkable or not. */
function everyCell(): Cell[] {
  const out: Cell[] = [];
  for (let y = 0; y < ROOM_H; y++) for (let x = 0; x < ROOM_W; x++) out.push({ x, y });
  return out;
}

describe("the Café cast", () => {
  it("keeps everybody inside the room", () => {
    for (const m of CAST) {
      expect(inBounds(m.anchor), `${m.id} is anchored at ${at(m.anchor)}, outside the room`).toBe(
        true,
      );
      for (const p of m.patrol) {
        expect(inBounds(p), `${m.id} patrols through ${at(p)}, outside the room`).toBe(true);
      }
    }
  });

  it("stands the standing ones on floor and sits the seated ones on furniture", () => {
    for (const m of CAST) {
      const walkable = open.isWalkable(m.anchor.x, m.anchor.y);
      if (m.seated) {
        // Nothing to sit on is the bug this catches: a seated character on a
        // free cell reads as squatting in the middle of the room.
        expect(walkable, `${m.id} is seated at ${at(m.anchor)} with no furniture under them`).toBe(
          false,
        );
      } else {
        expect(walkable, `${m.id} stands at ${at(m.anchor)}, which is blocked`).toBe(true);
      }
    }
  });

  it("gives nobody a patrol they cannot walk", () => {
    for (const m of CAST) {
      if (m.seated) {
        expect(m.patrol, `${m.id} is seated but patrols`).toHaveLength(0);
        continue;
      }
      for (const p of m.patrol) {
        expect(open.isWalkable(p.x, p.y), `${m.id} patrols to ${at(p)}, which is blocked`).toBe(
          true,
        );
      }
      for (let i = 1; i < m.patrol.length; i++) {
        expect(
          findPath(open, m.patrol[i - 1], m.patrol[i]).length,
          `${m.id} cannot get from ${at(m.patrol[i - 1])} to ${at(m.patrol[i])}`,
        ).toBeGreaterThan(0);
      }
      if (m.patrol.length > 0) {
        expect(m.patrol[0], `${m.id}'s patrol should start where they stand`).toEqual(m.anchor);
      }
    }
  });

  it("lets you get within speaking distance of everyone", () => {
    for (const m of CAST) {
      const spots = everyCell().filter(
        (c) => open.isWalkable(c.x, c.y) && manhattan(c, m.anchor) <= m.talkRadius,
      );
      expect(spots.length, `there is nowhere to stand to talk to ${m.id}`).toBeGreaterThan(0);
      const reachable = spots.some((c) => findPath(open, SPAWN, c).length > 0);
      expect(reachable, `${m.id} cannot be reached from the door`).toBe(true);
    }
  });

  it("gives everyone a distinct id, name and place to be", () => {
    expect(new Set(CAST.map((m) => m.id)).size).toBe(CAST.length);
    expect(new Set(CAST.map((m) => m.name)).size).toBe(CAST.length);
    const anchors = CAST.map((m) => at(m.anchor));
    expect(new Set(anchors).size, `two people share a cell: ${anchors.join(", ")}`).toBe(
      CAST.length,
    );
  });

  it("notices you from at least as far away as it lets you speak", () => {
    // A character you can talk to but who has not looked up yet is the uncanny
    // one — the prompt appears and the person is still facing the wall.
    for (const m of CAST) {
      expect(
        m.noticesAt,
        `${m.id} can be spoken to at ${m.talkRadius} but only notices at ${m.noticesAt}`,
      ).toBeGreaterThanOrEqual(m.talkRadius);
    }
  });

  it("opens the season with Priya and Marcus, and Priya is never absent", () => {
    // Priya is the anchor: every mission whose host is missing falls back to her,
    // so a room without her is a room where a beat has no speaker.
    expect(OPENING_CAST).toContain("priya");
    expect(OPENING_CAST).toContain("marcus");
    for (const id of OPENING_CAST) {
      expect(castById(id), `${id} is in the opening cast but not in CAST`).toBeTruthy();
    }
    expect(castPresent(OPENING_CAST).map((m) => m.id)).toEqual(["priya", "marcus"]);
  });
});

describe("standing near the cast", () => {
  it("finds the person you are standing next to", () => {
    const priya = castById("priya")!;
    expect(castNear(priya.anchor, ["priya"])?.id).toBe("priya");
  });

  it("finds nobody when you are on the other side of the room", () => {
    expect(castNear({ x: 4, y: 8 }, OPENING_CAST)).toBeNull();
  });

  it("ignores people who are not in the room", () => {
    const ray = castById("ray")!;
    expect(castNear(ray.anchor, [])).toBeNull();
    expect(castNear(ray.anchor, ["ray"])?.id).toBe("ray");
  });

  it("lets you speak to Priya across the counter", () => {
    // The counter is a cell deep and she works behind it. If this fails, the
    // only way to talk to your own head barista is to lift the flap first.
    const acrossTheCounter = { x: 4, y: 3 };
    expect(open.isWalkable(acrossTheCounter.x, acrossTheCounter.y)).toBe(true);
    expect(castNear(acrossTheCounter, ["priya"])?.id).toBe("priya");
  });

  it("picks the nearer of two people rather than the first one declared", () => {
    // Standing at the four-top with both Ellery and Marcus at it.
    const marcus = castById("marcus")!;
    expect(castNear(marcus.anchor, ["marcus", "ellery"])?.id).toBe("marcus");
  });
});

describe("which way someone turns to look at you", () => {
  const here = { x: 5, y: 5 };

  it("turns on the dominant map axis", () => {
    expect(facingFrom(here, { x: 8, y: 5 })).toBe("E");
    expect(facingFrom(here, { x: 1, y: 5 })).toBe("W");
    expect(facingFrom(here, { x: 5, y: 9 })).toBe("S");
    expect(facingFrom(here, { x: 5, y: 1 })).toBe("N");
  });

  it("prefers the x axis when the two are equal, matching the player's own rule", () => {
    expect(facingFrom(here, { x: 7, y: 7 })).toBe("E");
  });

  it("faces the camera when there is nowhere to turn", () => {
    expect(facingFrom(here, here)).toBe("S");
  });
});
