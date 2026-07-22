# Art Style Sheet — F0 deliverable (PRD §14.2)

The written contract every imported pack and every one of the 11 signature
buildings must conform to, so mixed free assets read as one city (the top risk,
PRD §20). Intentionally strict: **imports are rescaled/recolored to this spec,
never mixed in raw.** F0 ships gray-box only (procedural diamonds); this sheet
governs the §14 art pass.

## Projection

- Fixed isometric, **2:1 diamond**, no rotation (PRD §6.2).
- One tile size project-wide: **256 × 128 px** (`TILE_W` / `TILE_H` in `src/lib/iso.ts`).
- One pixel density. `roundPixels: true` on the renderer for crisp sprites.

## Camera-relative angles

- Sun / shadow direction: **from the upper-left**; shadows fall down-right.
- Building "front" faces are the two camera-facing faces (down-left + down-right).

## Palette (gray-box placeholders → replace with the normalized pack palette)

| Role                   | F0 placeholder                       | Notes                                     |
| ---------------------- | ------------------------------------ | ----------------------------------------- |
| Ground A / B (checker) | `#D1D9E3` / `#C4CEDB`                | district recolors later                   |
| Building floor         | `#B39E80`                            | warm base                                 |
| Building faces         | `#858FA8` (left) / `#9EA8C2` (right) | left face darker                          |
| Building roof          | `#D1B880`                            | lightest plane                            |
| Outline                | `#40424D` @ ~70%                     | 1.5px, all edges                          |
| Accent (coins, "new")  | `#F2C14E`                            | reward gold                               |
| Locked                 | desaturated grays                    | never color-only — pair with 🔒 (PRD §16) |

These live in `tailwind.config.ts` (`ground`, `bldg`, `ink`, `accent`) and in the
gray-box renderers (`src/world/tilemap.ts`, `buildingLayer.ts`).

## Naming & foldering (PRD §14.2)

- Exteriors: `bldg_<id>_ext.png`; tiles: `tile_<set>_<name>.png`.
- One folder per source pack under `public/assets/`; atlases built **per district**
  (packed → Pixi `Spritesheet` JSON) for draw-call batching.
- Every pack logged in `public/assets/ASSETS_LICENSES.md` **before** use.

## The 11 signature buildings

Kitbashed/recolored from CC0 parts **in one batch, by one person**, against this
sheet. Dedicated art per venue — generic boxes won't do for the 11.

## Character & cosmetics (PRD §14.3)

- Layered composition: base body (SKIN) + HAT overlay; **4-direction** walk cycles.
- BACKGROUND applies to the HUD portrait/profile card only, not the world.
- PET is a follower sprite with simple trailing logic.
- Every shop item ships a **sprite pair** (world + icon); the catalog (`shop.ts`)
  and the art checklist are maintained together.
