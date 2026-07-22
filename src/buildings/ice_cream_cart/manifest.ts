// F0 placeholder venue (PRD §19), named for F1's real starter venue (PRD §7.4).
// interior: null → the framework runs it in overlay mode (no bespoke interior).
// hostedActivities use REAL seeded C4-BEGINNER ids so F1 binds to live data.
// This manifest is the ONLY registration point — the city discovers it via glob.

import type { BuildingManifest } from '@/framework/building';

export const manifest: BuildingManifest = {
  id: 'ice_cream_cart',
  displayName: 'Ice Cream Cart',
  district: 'market_street',
  exterior: {
    atlas: null, // gray-box exterior until the §14 art pass
    footprintTiles: [
      [10, 8],
      [11, 8],
    ],
    entranceTile: [11, 9],
  },
  interior: null,
  // Real seeded C4-BEGINNER ids the frontend has authored content for — one of
  // each renderer type (DRAG_MATCH, MCQ_FEEDBACK, SORT_ORDER, MINI_SIM).
  hostedActivities: ['C4-BEG-01', 'C4-BEG-02', 'C4-BEG-05', 'C4-BEG-07'],
  owner: 'framework-f0',
  enabled: true,
};
