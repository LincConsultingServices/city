// MAISON's building manifest — the only place the framework learns this venue
// has a room to walk into (PRD §7.1). Everything else lives behind the lazy
// `interior` loader, so registering costs the bundle the manifest and nothing
// more until someone opens the door.
//
// `exterior` is documentary: the world's actual tile placement is owned by
// world/cityMap.ts (`venue("fashion_brand", …)`), which the venue loader reads.
// The footprint and entrance below mirror that entry — keep the two in step.
import type { BuildingManifest } from "@/framework/building/manifest";
import { MAISON_ACTIVITY_IDS } from "./season";

export const maisonManifest: BuildingManifest = {
  id: "fashion_brand",
  displayName: "MAISON",
  district: "market",
  exterior: {
    sprite: "g_red_windows",
    footprintTiles: [
      [36, 3],
      [37, 3],
      [38, 3],
      [36, 4],
      [37, 4],
      [38, 4],
    ],
    entranceTile: [37, 5],
  },
  // Nine beats × two tracks. None of them are seeded in the live registry yet
  // (docs/maison.md §0.4); the room is walkable without them, and the dev
  // fixture opens them locally.
  hostedActivities: MAISON_ACTIVITY_IDS,
  owner: "maison-team",
  enabled: true,
  interior: () => import("./Interior"),
};
