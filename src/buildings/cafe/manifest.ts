// Café building manifest — first real tenant of the plug-in contract (PRD §7.1;
// PRD_Cafe_Interior.md §7). `exterior` here is placeholder/documentary only: the
// world's actual tile placement is still owned by `world/cityMap.ts` (the venue
// loader doesn't consume per-building manifests yet — cityMap.ts's own header
// notes building INTERIORS are the part meant to be scaffolded first). Only
// `hostedActivities` and `interior` are live and consumed today.
import type { BuildingManifest } from "@/framework/building/manifest";
import { CAFE_ACTIVITY_IDS } from "@/activities/content/cafe";

export const cafeManifest: BuildingManifest = {
  id: "cafe",
  displayName: "Café",
  district: "market",
  exterior: {
    footprintTiles: [
      [0, 0],
      [1, 0],
    ],
    entranceTile: [0, 1],
  },
  hostedActivities: Object.values(CAFE_ACTIVITY_IDS).flatMap((ids) => [ids.A, ids.B]),
  owner: "cafe-team",
  enabled: true,
  interior: () => import("./Interior"),
};
