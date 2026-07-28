// Café building manifest — the first tenant of the plug-in contract (PRD §7.1).
// This is the only place the framework learns the Café exists; everything else
// about the building lives behind the lazy `interior` loader.
//
// `exterior` is documentary for now: the world's actual tile placement is still
// owned by world/cityMap.ts (`venue("cafe", …)`), which the venue loader reads.
// Keep the two in step — the footprint and entrance below mirror that entry.
import type { BuildingManifest } from "@/framework/building/manifest";

export const cafeManifest: BuildingManifest = {
  id: "cafe",
  displayName: "Café",
  district: "market",
  exterior: {
    sprite: "g_awn_orange",
    footprintTiles: [
      [23, 6],
      [24, 6],
      [23, 7],
      [24, 7],
    ],
    entranceTile: [24, 8],
  },
  // Nothing yet: the Café's own C1–C9 decision trees need registry content that
  // isn't seeded (PRD §21.4 BE-12). The room is walkable without them.
  hostedActivities: [],
  owner: "cafe-team",
  enabled: true,
  interior: () => import("./Interior"),
};
