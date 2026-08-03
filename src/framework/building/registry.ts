// The building registry — the framework's index of plug-in buildings (PRD §7.1).
// A building registers by adding one line here; everything else about it lives
// behind its own lazy `interior` loader, so registering costs the bundle only
// the manifest object, not the room.
//
// Buildings whose id has no entry (or whose `interior` is null) fall through to
// the framework's overlay panel — the pre-existing behaviour for every venue.
import { cafeManifest } from "@/buildings/cafe/manifest";
import { maisonManifest } from "@/buildings/fashion_brand/manifest";
import type { BuildingManifest } from "./manifest";

export const BUILDINGS: Readonly<Record<string, BuildingManifest>> = {
  [cafeManifest.id]: cafeManifest,
  [maisonManifest.id]: maisonManifest,
};

/** The manifest for a venue id, if a building is registered and enabled for it. */
export function getBuildingManifest(id: string): BuildingManifest | null {
  const m = BUILDINGS[id];
  return m && m.enabled ? m : null;
}

/** True when this venue has a real interior to walk into, not just a panel. */
export function hasInterior(id: string): boolean {
  return getBuildingManifest(id)?.interior != null;
}
