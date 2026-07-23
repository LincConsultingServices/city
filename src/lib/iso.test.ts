import { describe, it, expect } from "vitest";
import { mapToWorld, worldToMap, tilePolygon, roundCell } from "./iso";

describe("iso", () => {
  it("map→world→map round-trips for an integer cell", () => {
    const rt = worldToMap(mapToWorld(3, 5).x, mapToWorld(3, 5).y);
    expect(roundCell(rt)).toEqual({ x: 3, y: 5 });
  });

  it("origin cell maps to origin", () => {
    expect(mapToWorld(0, 0)).toEqual({ x: 0, y: 0 });
  });

  it("tilePolygon returns a 4-point diamond", () => {
    expect(tilePolygon(0, 0)).toHaveLength(4);
  });
});
