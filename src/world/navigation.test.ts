import { describe, it, expect } from "vitest";
import { VENUES, cityGrid, SPAWN } from "./cityMap";
import {
  ARRIVE_CELLS,
  destinationAt,
  guideTarget,
  hasArrived,
  nearestWalkable,
  placesToGo,
  routeTo,
} from "./navigation";

const cafe = VENUES.find((v) => v.id === "cafe")!;

describe("marking a place on the map", () => {
  it("marks a venue's door when you click the building", () => {
    const d = destinationAt(cafe.footprintTiles[0])!;
    expect(d.venueId).toBe("cafe");
    expect(d.label).toBe("Café");
    expect(d.cell).toEqual(cafe.entranceTile);
  });

  it("marks the venue when you click right beside its door", () => {
    const beside = { x: cafe.entranceTile.x + 1, y: cafe.entranceTile.y };
    expect(destinationAt(beside)?.venueId).toBe("cafe");
  });

  it("always marks somewhere you can stand", () => {
    for (let y = 0; y < 45; y += 3) {
      for (let x = 0; x < 45; x += 3) {
        const d = destinationAt({ x, y });
        expect(d, `(${x},${y}) marked nothing`).toBeTruthy();
        expect(cityGrid.isWalkable(d!.cell.x, d!.cell.y), `(${x},${y}) → unwalkable`).toBe(true);
      }
    }
  });

  it("names an ordinary spot by the district it is in", () => {
    const d = destinationAt(SPAWN)!;
    expect(d.venueId).toBeUndefined();
    expect(d.label).toMatch(/Civic Center/);
  });

  it("marks nothing off the edge of the city", () => {
    expect(destinationAt({ x: -3, y: 4 })).toBeNull();
    expect(destinationAt({ x: 4, y: 99 })).toBeNull();
  });

  it("snaps a click on a building to the nearest open ground", () => {
    const roof = cafe.footprintTiles[0];
    const spot = nearestWalkable(roof)!;
    expect(cityGrid.isWalkable(spot.x, spot.y)).toBe(true);
    expect(Math.abs(spot.x - roof.x) + Math.abs(spot.y - roof.y)).toBeLessThanOrEqual(3);
  });
});

describe("the list of places", () => {
  it("offers every venue you can go into, once, by name", () => {
    const places = placesToGo();
    const ids = places.map((p) => p.venueId);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain("cafe");
    expect(ids).not.toContain(undefined);
    // A locked placeholder is a building, not somewhere to go.
    expect(ids).not.toContain("custom");
  });

  it("can walk to every one of them from the plaza", () => {
    for (const p of placesToGo()) {
      expect(routeTo(SPAWN, p).length, `${p.label} unreachable`).toBeGreaterThan(0);
    }
  });
});

describe("the guide arrow", () => {
  it("looks a few steps along the route rather than straight at the goal", () => {
    const dest = destinationAt(cafe.entranceTile)!;
    const route = routeTo(SPAWN, dest);
    const target = guideTarget(route, dest);
    expect(route).toContainEqual(target);
    expect(target).not.toEqual(dest.cell);
  });

  it("points at the goal itself when the route is all but done", () => {
    const dest = destinationAt(cafe.entranceTile)!;
    expect(guideTarget([dest.cell], dest)).toEqual(dest.cell);
    expect(guideTarget([], dest)).toEqual(dest.cell);
  });

  it("calls it arrived at the door, not before", () => {
    const dest = destinationAt(cafe.entranceTile)!;
    expect(hasArrived(dest.cell, dest)).toBe(true);
    expect(hasArrived({ x: dest.cell.x, y: dest.cell.y + ARRIVE_CELLS }, dest)).toBe(true);
    expect(hasArrived({ x: dest.cell.x, y: dest.cell.y + ARRIVE_CELLS + 1 }, dest)).toBe(false);
  });
});
