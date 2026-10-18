// Finding your way around the city — the map's marker and the guide arrow.
//
// Pure: where a click on the map lands, which way the arrow points, and when you
// have arrived. The minimap (ui/Minimap.tsx) and the world renderer
// (CityCanvas.tsx) both read these, so the map and the arrow can never disagree
// about where you are going.
import { findPath, type Cell } from "@/lib/pathfinding";
import {
  DISTRICT_NAME,
  GRID_H,
  GRID_W,
  VENUES,
  cityGrid,
  districtAt,
  type CityBuilding,
} from "./cityMap";

/** Somewhere the player has asked to go. */
export interface Destination {
  /** A walkable cell — always somewhere you can actually stand. */
  cell: Cell;
  /** How it is named back to the player: a venue's name, or the district. */
  label: string;
  /** Set when the destination is a venue's door. */
  venueId?: string;
}

/** How close counts as there. One cell: you are at the door, not inside it. */
export const ARRIVE_CELLS = 1;

/** How far along the route the arrow looks, in cells. Far enough to round a corner smoothly. */
export const LOOK_AHEAD = 3;

const manhattan = (a: Cell, b: Cell) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

/**
 * Venues worth sending somebody to: the ones you can go into. A locked
 * placeholder is a building on the map, not a place on the list.
 */
export function isPlace(v: CityBuilding): boolean {
  return v.interactable && v.kind !== "locked";
}

/** A venue as a destination: its entrance, by name. */
export function venueDestination(v: CityBuilding): Destination {
  return { cell: { ...v.entranceTile }, label: v.displayName, venueId: v.id };
}

/**
 * Where a click on the map at `cell` should send the player.
 *
 * On a venue, or right beside its door, it means that venue — so clicking the
 * Café on the map marks the Café's entrance, not the roof. Anywhere else it is
 * the nearest cell you can stand on, named for the district it is in.
 */
export function destinationAt(cell: Cell): Destination | null {
  const c = { x: Math.round(cell.x), y: Math.round(cell.y) };
  if (c.x < 0 || c.y < 0 || c.x >= GRID_W || c.y >= GRID_H) return null;

  const venue = VENUES.find(
    (v) =>
      isPlace(v) &&
      (v.footprintTiles.some((t) => t.x === c.x && t.y === c.y) ||
        manhattan(v.entranceTile, c) <= 1),
  );
  if (venue) return venueDestination(venue);

  const spot = nearestWalkable(c);
  if (!spot) return null;
  return { cell: spot, label: DISTRICT_NAME[districtAt(spot.x, spot.y)] };
}

/** The walkable cell closest to `from`, searching outward ring by ring. */
export function nearestWalkable(from: Cell): Cell | null {
  if (cityGrid.isWalkable(from.x, from.y)) return { ...from };
  for (let r = 1; r < Math.max(GRID_W, GRID_H); r++) {
    let best: Cell | null = null;
    let bestD = Infinity;
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const x = from.x + dx;
        const y = from.y + dy;
        if (!cityGrid.isWalkable(x, y)) continue;
        const d = Math.hypot(dx, dy);
        if (d < bestD) {
          best = { x, y };
          bestD = d;
        }
      }
    }
    if (best) return best;
  }
  return null;
}

/** True once the player is close enough to the destination to call it reached. */
export function hasArrived(at: Cell, dest: Destination): boolean {
  return manhattan(at, dest.cell) <= ARRIVE_CELLS;
}

/** The walking route from `from` to the destination, start cell included. Empty if none. */
export function routeTo(from: Cell, dest: Destination): Cell[] {
  return findPath(cityGrid, from, dest.cell);
}

/**
 * The cell the guide arrow should point at: a few steps along the route rather
 * than the destination itself, so it leads round buildings instead of pointing
 * through them. Falls back to the destination when there is no route.
 */
export function guideTarget(route: readonly Cell[], dest: Destination): Cell {
  if (route.length < 2) return dest.cell;
  return route[Math.min(LOOK_AHEAD, route.length - 1)];
}

/** Every interactable venue, in a stable order for the map's list of places. */
export function placesToGo(): Destination[] {
  return VENUES.filter(isPlace)
    .map(venueDestination)
    .sort((a, b) => a.label.localeCompare(b.label));
}
