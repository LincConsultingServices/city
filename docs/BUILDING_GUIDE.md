# Building Guide — the plug-in contract

> **Status: draft, evolving toward the F3 freeze (PRD §19).** The framework API
> is not frozen until F3; treat signatures here as stabilizing, not final. The
> F3 gate is the *handoff test*: a dev adds a dummy building end-to-end touching
> only `buildings/<id>/`.

A building is a **plug-in**: a manifest + an owned folder. The framework
guarantees the world around it; you own everything inside it. Two building teams
never edit the same file (PRD §7, §17).

## 1. What you ship

One folder `buildings/<building_id>/` containing:

### `building.json` (the only registration point)
```jsonc
{
  "id": "ice_cream_cart",                 // unique; matches the folder name
  "displayName": "Ice Cream Cart",
  "district": "market_street",
  "exterior": {
    "sprite": "res://buildings/ice_cream_cart/exterior.png",  // or null → gray-box
    "footprintTiles": [[10, 8], [11, 8]], // cells the building occupies
    "entranceTile": [11, 9]               // where the player stands to enter
  },
  "interiorScene": "res://buildings/ice_cream_cart/interior.tscn", // OR null → framework overlay
  "hostedActivities": ["C4-BEG-09", "C9-BEG-07"],  // canonical registry IDs — the venue model
  "owner": "your-handle",
  "enabled": true                          // false → renders Locked, door refuses politely
}
```
`BuildingManifest.validate()` rejects malformed manifests with a clear message
(never a crash). `interiorScene: null` is valid — small venues run their activity
list in the framework overlay with zero scene work.

### `interior.tscn` + assets (optional)
Your building's world — layout, props, NPC placement — entirely yours. Omit it
to use overlay mode.

## 2. What the framework provides (never reimplement)
- Exterior placement + Open/New/Locked state from the manifest.
- Enter/exit transitions and spawn-back position.
- The activity-list UI (bound to `hostedActivities` × live progress) — F1.
- The activity player + all 13 renderers (PRD §8) — F1. You may *theme* them
  (palette/backdrop via theme hooks), never fork them.
- API access (`ApiClient`), auth/session, error UX. **Buildings never call HTTP.**
- Coin/badge celebration, HUD, audio buses, save/resume.
- The interior NPC dialogue *component* (you supply the content).

## 3. The hard rule
A building PR touches only `buildings/<its-id>/` + its manifest (CI warns
otherwise, PRD §17). Need something shared? File a framework issue → maintainer
PR → everyone benefits. Buildings never add backend endpoints directly
(framework/maintainer path only, PRD §11.3).

## 4. Content vs scoring (PRD §8.2)
Rich content (question text, sim tuning, art) lives in the game's own content
files keyed by activity ID — the backend serves scoring metadata only (answer
keys never leave the server). **Content IDs must match registry IDs exactly**; a
startup dev-mode check will cross-reference `hostedActivities` against
`GET /api/v1/registry/modules`.
