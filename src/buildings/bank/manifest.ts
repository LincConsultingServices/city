// Meridian Bank's building manifest — the only place the framework learns this
// venue has a room to walk into. Everything else lives behind the lazy
// `interior` loader.
//
// `exterior` is documentary: the world's tile placement is owned by
// world/cityMap.ts (`venue("bank", …)`): block (0,0), offset (2,2), 3×2 tiles.
// The footprint and entrance below mirror that entry — keep the two in step.
import type { BuildingManifest } from "@/framework/building/manifest";

export const bankManifest: BuildingManifest = {
  id: "bank",
  displayName: "Meridian Bank",
  district: "downtown",
  exterior: {
    footprintTiles: [
      [3, 3],
      [4, 3],
      [5, 3],
      [3, 4],
      [4, 4],
      [5, 4],
    ],
    entranceTile: [4, 5],
  },
  hostedActivities: [],
  owner: "bank-team",
  enabled: true,
  interior: () => import("./Interior"),
};
