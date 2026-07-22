# Building Guide — the plug-in contract

> **Status: draft, evolving toward the F3 freeze (PRD §19).** The framework API is
> not frozen until F3; treat signatures as stabilizing, not final. The F3 gate is
> the _handoff test_: a dev (or Claude, against the CLAUDE.md recipes) adds a dummy
> building end-to-end touching only `src/buildings/<id>/`.

A building is a **plug-in**: a typed manifest + an owned folder. The framework
guarantees the world around it; you own everything inside it. Two building teams
never edit the same file (PRD §7, §17).

## 1. What you ship

One folder `src/buildings/<building_id>/` containing:

### `manifest.ts` (the only registration point)

```ts
import type { BuildingManifest } from '@/framework/building';

export const manifest: BuildingManifest = {
  id: 'ice_cream_cart', // unique; matches the folder name
  displayName: 'Ice Cream Cart',
  district: 'market_street',
  exterior: {
    atlas: null, // or a texture-atlas key; null → gray-box
    footprintTiles: [
      [10, 8],
      [11, 8],
    ], // cells the building occupies
    entranceTile: [11, 9], // where the player stands to enter
  },
  interior: null, // OR () => import('./Interior') → lazy module
  hostedActivities: ['C4-BEG-01', 'C4-BEG-09'], // canonical registry IDs
  owner: 'your-handle',
  enabled: true, // false → renders Locked, door refuses politely
};
```

`validateManifest()` rejects a malformed manifest with a clear message (never a
crash). `interior: null` is valid — small venues run their activity list in the
framework overlay with zero interior work. The city discovers the manifest via
`import.meta.glob('/src/buildings/*/manifest.ts')` — no central registry to edit.

### `Interior.tsx` + assets (optional)

Your building's world — a React component that may host its own Pixi sub-scene, or
a React-Three-Fiber sub-scene for a 3D venue (PRD §12.6). Omit it for overlay mode.

## 2. What the framework provides (never reimplement)

- Exterior placement + Open / New / Locked state from the manifest.
- Enter/exit transitions and the spawn-back position (exit → same spot).
- The activity-list UI (bound to `hostedActivities` × live progress) — F1.
- The activity player + all 13 renderers (PRD §8) — F1. You may _theme_ them
  (palette/backdrop via tokens), never fork them.
- API access (`api.*` / hooks), auth/session, error UX. **Buildings never call HTTP.**
- Coin/badge celebration, HUD, audio buses (register ambience on `audioManager`),
  save/resume.

## 3. The hard rule

A building PR touches only `src/buildings/<its-id>/` (CI warns otherwise, PRD §17).
Need something shared? File a framework issue → maintainer PR → everyone benefits.
Buildings never add backend endpoints directly (framework/maintainer path only).

## 4. Content vs scoring (PRD §8.2)

Rich content (question text, sim tuning, art) lives in the game's own content
files keyed by activity ID — the backend serves scoring metadata only (answer keys
never leave the server). **Content IDs must match registry IDs exactly**; a
dev-mode startup check cross-references `hostedActivities` against
`GET /api/v1/registry/modules`.
