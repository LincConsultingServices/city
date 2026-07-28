# CAFEDEV — building the Café interior

_Engineering plan · The City · building 01 · companion to [cafe.md](cafe.md) (the product PRD) and [docs/PRD_City_Frontend.md](docs/PRD_City_Frontend.md) (the platform PRD)._

---

## 0. What this builds

A **walkable isometric room**. You press `E` at the Café on Market Street, the street goes away, and you are standing inside a warm little coffee shop rendered at the same camera angle as the city outside. You walk with click-to-move or WASD. You bump into the tables. You lift the counter flap to get behind the bar. You leave through the door and land back on the exact street tile you came from.

Reference for what the room looks like: [`cafe.jpg`](cafe.jpg).

### What exists today

The Café is already **outside**. It has a footprint, an entrance tile, an exterior sprite and a steam emitter:

| What                                    | Where                                                             |
| --------------------------------------- | ----------------------------------------------------------------- |
| Venue placement, entrance tile `(24,8)` | `src/world/cityMap.ts:121`                                        |
| `VenueKind` includes `"cafe"`           | `src/world/cityMap.ts:44`                                         |
| Exterior sprite `g_awn_orange`          | `src/world/assets.ts:361`                                         |
| Steam particle emitter                  | `src/world/CityCanvas.tsx:184-190`                                |
| **Current "interior": a text modal**    | `src/ui/CityScreen.tsx:102-104` → `InfoPanel`, copy at `:227-230` |

### What does not exist

- **`src/buildings/` — the directory itself.** `src/framework/building/manifest.ts` defines `BuildingManifest` and `InteriorProps`, but nothing imports it except its own test. There is no registry, no `React.lazy`, no `Suspense`, no dynamic `import()` anywhere in `src/`. **The plug-in seam has to be built before any building can plug in.**
- Any indoor art. All 132 PNGs in `public/assets/city/` are exterior city dressing — no table, chair, counter, rug, or interior wall among them.

---

## 1. Two decisions, made up front

### 1.1 Isometric projection, `cafe.jpg` art direction

`cafe.jpg` is drawn top-down (Stardew style). The city is 2:1 isometric. **We render the café isometric and take everything else from the reference.**

Why:

|                      | Isometric                                                                     | Top-down                                                                          |
| -------------------- | ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Player sprite        | `src/world/characterArt.ts` bakes it procedurally today, 4 facings, zero PNGs | Would need a whole new set — an iso person viewed from directly above reads wrong |
| Furniture art        | 6 Kenney _Isometric_ Miniature CC0 sprites already sit on `origin/cafe`       | None exists, anywhere in the repo or on any branch                                |
| Tile math            | `src/lib/iso.ts`, done and tested                                             | New file                                                                          |
| Walking out the door | Angle never changes                                                           | Room flips overhead, street snaps back to iso — a hard visual cut                 |

One happy accident: **`cafe.jpg`'s black-and-white checkered floor is already drawn as diamonds**, so the floor translates to an iso grid one-for-one — just alternate the tint on `(x + y) % 2`.

Note this **supersedes `cafe.md` §4 (art direction) and §7 (player presence)**, which specify a first-person R3F room. Every other section of that PRD — §3.1 the room, §5 the cast, §6 ambient life, §12 world state, §15 accessibility, §16 performance — still applies.

### 1.2 Static fit-to-viewport camera

A 10×8 room spans `(10+8) × 66 = 1188` world px wide by `594` tall. **The whole café fits on one screen at 1280×720**, so there is no follow camera — the room is framed once and stays framed. That is the top-down-restaurant-game feel the reference implies.

```ts
fitScale = Math.min(1, (screenW - PAD) / ROOM_PX_W, (screenH - PAD) / ROOM_PX_H);
```

Clamped to `≤ 1` so nothing is ever upscaled — `src/world/spriteDensity.test.ts` guards `MAX_UPSCALE = 2.3` and a past bug shipped 12px trees blown up 2.1× that "read as pills". Click-to-move still works under scale because `world.toLocal()` accounts for it.

---

## 2. Art direction, read off `cafe.jpg`

_Warm, dark, wood-and-oxblood. A lit room floating in a black surround._

| Element                | From the reference                                                                                                                                                  |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Palette**            | Oxblood counter and rug red, warm mid-brown wood, cream plaster, near-black floor diamonds, a dark void beyond the walls. 8–10 tints, named constants in `props.ts` |
| **Floor**              | Black + cream checkered diamonds on `(x + y)` parity                                                                                                                |
| **Back wall**          | Horizontal wood planking hung with two blind-slatted windows, a framed menu board, a botanical print, a small blue chalkboard sign, two small frames                |
| **Counter**            | Long oxblood body, lighter worn-wood top, running the width of the room. Stool line in front                                                                        |
| **Behind the counter** | Pale pastry case, dark espresso machine, potted plant                                                                                                               |
| **Centre feature**     | The tall arched jukebox against the wall, small plant beside it                                                                                                     |
| **Floor dressing**     | One large rectangular patterned Persian rug, one oval braided rug                                                                                                   |
| **Furniture**          | Two dark-wood dining tables with chairs on the near side, one more by the window wall                                                                               |
| **Right wall**         | Oxblood dresser with drawers, wood cabinets, a radiator                                                                                                             |
| **Stairs**             | Dark wooden flight in the far corner — decorative, blocked, never climbed                                                                                           |
| **Door**               | A gap in the front wall with a doormat                                                                                                                              |

All of it is enumerated as data in `room.ts`. Nothing is hardcoded in the renderer.

---

## 3. The room

`10 cols (x) × 8 rows (y)`, defined once in `src/buildings/cafe/room.ts`.

```
       x0    x1    x2    x3    x4    x5    x6    x7    x8    x9
 y0    ▓W    ▓W    ▓M    ▓W    ▓A    ▓A    ▓W    ▓A    ▓T    ▓T    back wall
 y1    ·p    ·p    ·     ·     ·     ·     ▓P    ·     ·     ·     STAFF ZONE
 y2    ▓C    ▓C    ▓C    ╪F    ▓C    ▓C    ·     ·     ▓X    ▓X    counter run
 y3    ▓s    ▓s    ·     ·     ▓s    ·     ·     ▓J    ·     ▓X
 y4    ·     ·     ·     ▒r    ▒r    ·     ▒o    ·     ·     ▓R    open lane
 y5    ▓1    ▓c    ·     ▒r    ▒r    ▓2    ·     ·     ·     ·
 y6    ▓c    ·     ·     ·     ·     ▓c    ·     ▓3    ▓c    ·
 y7    ▓w    ▓w    ▓w    ▒D    ▓w    ▓w    ▓w    ▓w    ▓w    ▓w    front wall
```

`▓` blocked · `·` walkable · `▒` walkable decoration · `╪` dynamic gate

|                               |                        |                                  |                         |
| ----------------------------- | ---------------------- | -------------------------------- | ----------------------- |
| `W` plank wall + blind window | `M` framed menu board  | `A` framed art / chalkboard sign | `T` stairs              |
| `C` counter (oxblood)         | `F` **the flap**       | `s` bar stool                    | `P` potted plant        |
| `J` jukebox                   | `X` dresser + cabinets | `R` radiator                     | `p` pass-through corner |
| `1` `2` `3` tables            | `c` chairs             | `r` Persian rug · `o` oval rug   | `D` door + mat          |

- **Spawn** `(3,6)` facing `N` — you walk in through the door.
- **Exit** `(3,7)`, the door threshold. Prompt at manhattan ≤ 1.
- **Flap** `(3,2)`, the only break in the counter run.

Two invariants that are **load-bearing**, not decorative — both locked by `room.test.ts`:

1. **The staff zone `y1, x0..x5` is sealed.** `y0` is wall, `y2` is counter, and the plant at `(6,1)` closes the right-hand approach. The only route in is the flap. This is the whole mechanic.
2. **`y4` is a fully open lane** and every walkable cell reaches it. The chair beside table 3 sits at `(8,6)` rather than `(6,5)` precisely so the `(6,6)` corner does not seal itself off — a layout tweak could silently break that, so a test catches it.

Counter-top and wall props — pastry case, espresso machine, till, hanging frames — are **drawn on** their host cell and never block, which is what keeps the staff zone navigable.

**Zones** (ordered, first match wins), for announcements and audio:

| id         | cells           | label              |
| ---------- | --------------- | ------------------ |
| `z_pass`   | `(0..1, 1)`     | the pass-through   |
| `z_behind` | `(0..5, 1)`     | behind the counter |
| `z_window` | `(8..9, *)`     | by the window      |
| `z_floor`  | everything else | the floor          |

---

## 4. The lift-up flap

The grid is a **pure function of which gates are open**:

```ts
export function makeRoomGrid(openGates: ReadonlySet<GateId>): Grid;
```

`Grid` is just `{ width, height, isWalkable }` (`src/lib/pathfinding.ts:9-14`), so this stays pure and unit-testable with zero Pixi and zero React.

**State** — `flapOpen: boolean` in the building's own `cafeStore`.

**Trigger, two ways:**

- Click the flap sprite. Pixi `eventMode = "static"`, `cursor = "pointer"`, `e.stopPropagation()` so the click does not fall through to click-to-move — the exact pattern already used for city props at `src/world/CityCanvas.tsx:276-339`.
- Press `E` standing within manhattan ≤ 1 of `(3,2)`.

**On toggle:**

1. Rebuild the grid from the new gate set.
2. **Discard `pathTargets` and clear `pathLine`** — a queued path may be stale in either direction.
3. Animate the flap's `rotation` about a hinge `pivot` over ~250 ms.
4. `audio.play("ui_open" | "ui_close")`.
5. Push an announcement to the live region.

**Guards:**

- **Closing while standing on `(3,2)` is refused** — the prompt reads "step off the flap first". Otherwise you seal yourself inside a wall.
- **No auto-close.** It stays as you left it, which is what a real counter flap does and what makes it read as state rather than a button.
- **Reduced motion** — snap the rotation, keep the sound and the announcement.

---

## 5. Module layout

Everything the Café owns lives in one folder. Data, pure logic, Pixi and React are kept apart so the interesting parts are testable without a renderer.

```
src/buildings/cafe/
  manifest.ts      the only registration point (PRD §7.1)
  Interior.tsx     default export, ComponentType<InteriorProps> — the React shell
  CafeCanvas.tsx   owns the PIXI.Application — the single Pixi↔React seam
  room.ts          PURE. dimensions, furniture, blocked set, gates, spawn, exit, zones
  room.test.ts     the invariants
  cafeStore.ts     building-owned Zustand store
  scene.ts         pure Pixi builders — floor, walls, furniture, the flap
  props.ts         palette + procedural Graphics → RenderTexture furniture
  assets.ts        (phase 3) building-owned Pixi bundle from /assets/cafe
  index.ts         re-export the manifest
```

| File             | Responsibility                                                                                                                                                        | Key exports                                                                             |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `manifest.ts`    | Registration                                                                                                                                                          | `cafeManifest` with `interior: () => import("./Interior")`                              |
| `Interior.tsx`   | Full-bleed React shell: mounts the canvas, exit/flap prompts, `aria-live` region, keyboard station list, Esc                                                          | `default function CafeInterior({ manifest, onExit })`                                   |
| `CafeCanvas.tsx` | One `useEffect([])`, `destroyed` guard, closure-scoped mutable state, `bakedTextures[]` + `destroyTextures()` on teardown — mirrors `CityCanvas`'s discipline exactly | `CafeCanvas`                                                                            |
| `room.ts`        | No Pixi, no React                                                                                                                                                     | `ROOM_W`, `ROOM_H`, `FURNITURE`, `SPAWN`, `EXIT`, `GATES`, `makeRoomGrid()`, `zoneAt()` |
| `cafeStore.ts`   | Pixi writes via `getState()`, React reads via selectors — the split proven in `worldStore.ts`                                                                         | `useCafeStore`                                                                          |
| `scene.ts`       | No React                                                                                                                                                              | `buildFloor()`, `buildWalls()`, `buildFurniture()`, `buildFlap()`                       |
| `props.ts`       | Appearance, one place to swap procedural → sprite                                                                                                                     | `CAFE_PALETTE`, `bakePropTextures()`, `propTexture()`                                   |

**Reused as-is, never modified:** `@/lib/iso`, `@/lib/pathfinding`, `@/lib/motion`, `@/world/characterArt` (`bakePersonTextures`, `bakeShadowTexture`, `destroyTextures`, `PLAYER_PALETTE` — the same character walks indoors and out), `@/framework/audio/audioManager`, `@/ui/Icon`.

---

## 6. Shared-code diff — one framework PR, then never again

| File                                      | Change                                                                                                                                               |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/framework/building/registry.ts`      | **new** — `BUILDINGS` + `getBuildingManifest(id)`. Static-imports the manifest; the _interior_ is what stays lazy                                    |
| `src/framework/building/BuildingGate.tsx` | **new** — `lazy()` + `<Suspense>` mount passing `{ manifest, onExit }`; returns `null` when `interior` is null                                       |
| `src/ui/CityScreen.tsx:102-104`           | **edit** — a venue with a registered non-null `interior` mounts the gate; otherwise `InfoPanel` as before. The dead `cafe` entry in `INFO_COPY` goes |
| `src/world/worldStore.ts`                 | **edit** — add `interiorOpen` + `setInteriorOpen`                                                                                                    |
| `src/world/CityCanvas.tsx`                | **edit** — ticker early-returns while `interiorOpen`                                                                                                 |

That last one is the perf mitigation: two live `PIXI.Application`s on the 2019 i5 iGPU reference laptop is a real risk against the 30 fps floor. The city is fully occluded while the interior is open, so freezing its last frame costs nothing visually.

`scripts/check_building_boundary.sh` is informational (`exit 0`), but the split is still worth respecting — land the framework change first, then the Café work touches only `src/buildings/cafe/`.

---

## 7. Phases

### Phase 0 · Framework seam

The shared diff above, plus this document.
**Gate:** pressing `E` at the Café opens a blank full-bleed layer; Esc and the exit button return to the street; the city ticker pauses while it is open; `npm run ci` green.

### Phase 1 · Walkable room, procedural art

`room.ts` + `room.test.ts` + `props.ts` + `scene.ts` + `CafeCanvas.tsx` + `Interior.tsx` + `manifest.ts`. Checkered floor, plank walls, blocking furniture in the reference palette, the player from `bakePersonTextures`, click-to-move via `findPath`, WASD with per-axis slide, footsteps, y-sort (`zIndex = x + y`, player `+0.6`), fit-to-viewport camera.

Procedural is not a throwaway gray-box. Flat-shaded iso volumes in the right palette are exactly the reference's register, and it is this repo's own habit — `characterArt.ts`, `makePlaque`, `bakeSkyTexture` are all procedural. Counter, tables, stools, dresser, radiator, wall planks, floor, rugs and the doormat should ship this way.

**Gate:** walk every reachable cell; you cannot pass through a table, chair, counter or wall; the whole room is visible without scrolling at 1280×720.

### Phase 2 · Door and flap

Exit proximity + prompt + `onExit()`. The flap gate: click and `E` triggers, rotation animation, dynamic walkability, path invalidation, step-off guard. Zone tracking.

**Gate:** the staff zone is unreachable until you lift the flap and reachable the moment you do; leaving by the door puts you back on Market Street on the tile you left from.

### Phase 3 · Hero-prop sprites

The props procedural geometry cannot sell: **jukebox, espresso machine, pastry case, potted plant, stairs**, plus the framed art and blind windows.

Start with the 6 CC0 Kenney _Isometric Miniature Library_ sprites already sitting on the `origin/cafe` branch:

```sh
git show origin/cafe:public/assets/cafe/cafe_counter.png > public/assets/cafe/cafe_counter.png
```

| File               | Size    |
| ------------------ | ------- |
| `cafe_counter.png` | 234×148 |
| `cafe_shelf.png`   | 256×275 |
| `cafe_table.png`   | 226×168 |
| `cafe_chair.png`   | 68×92   |
| `cafe_rug.png`     | 256×101 |
| `cafe_lamp.png`    | 112×128 |

That covers roughly a third of the reference's prop list. Add a building-owned `assets.ts` bundle from `/assets/cafe`, flip those kinds in `props.ts`, log the pack in `public/assets/ASSETS_LICENSES.md` (the mandatory 6-column table). The remaining hero props are a sourcing or kitbash task — `origin/cafe`'s own note records that **no dedicated Kenney isometric café pack exists**, which is why that branch kitbashed a library pack.

**Gate:** the room reads like `cafe.jpg`; every sprite is downscaled, never upscaled; `spriteDensity.test.ts` still green.

### Phase 4 · Life and accessibility

Hotspots (chalkboard, community board, window, pass-through) as prompt + panel. Steam over the espresso machine using the existing greyscale `fx_smoke` / `fx_dust` textures, tinted in code. An `aria-live="polite"` region for zone changes, flap toggles and exit proximity — **the repo has no live region anywhere today**, so the Café introduces its own using Tailwind's built-in `sr-only`. A keyboard station list that paths the player to _the counter · the flap · the window · the tables · the door_. Full `prefersReducedMotion()` respect.

**Gate:** a keyboard-only player tours every station and hears every state change announced.

### Phase 5 · Activity binding _(stretch)_

Populate `hostedActivities`, extract `DecisionTreeRenderer.tsx` and `src/activities/content/cafe.ts` from `origin/cafe`, wire station → activity through the existing `PlayerShell`.

**Blocked by** backend BE-12 (PRD §21.4): only `C4-BEGINNER` is seeded today, so the Café's `C1..C9` ids will not resolve against `/registry`.

---

## 8. Tests

`src/buildings/cafe/room.test.ts` — vitest, colocated under `src/` (the include glob in `vite.config.ts:20` never sees `tests/`), explicit `import { describe, it, expect } from "vitest"`, loop assertions carrying a 3rd-arg message, matching the style of `src/world/cityMap.test.ts`.

| #   | Invariant                                                                                |
| --- | ---------------------------------------------------------------------------------------- |
| 1   | Spawn and exit are both walkable                                                         |
| 2   | Flap **open** → every non-blocked cell is reachable from spawn                           |
| 3   | Flap **closed** → no staff-zone cell is reachable from spawn — _the mechanic's contract_ |
| 4   | Flap **open** → every staff-zone cell is reachable                                       |
| 5   | No two furniture entries claim the same cell                                             |
| 6   | Every furniture, gate, zone, spawn and exit cell is inside `ROOM_W × ROOM_H`             |
| 7   | `makeRoomGrid()` reports `width` / `height` matching `ROOM_W` / `ROOM_H`                 |
| 8   | Toggling the gate flips exactly one cell's walkability and nothing else                  |

**Manual:** `npm run dev`, sign in or use `VITE_DEV_WORLD=1`, walk to `(24,8)` on Market Street, press `E`. Check movement by both click and WASD; collision on every furniture kind; the flap by click _and_ `E`; staff zone gated; the step-off guard; the door prompt; the return position; window resize keeps the room framed; `prefers-reduced-motion` in devtools kills the tween but keeps the state change; five enter/exit cycles with no memory growth in the Chrome profiler.

**CI:** `npm run ci` = `typecheck && lint && format:check && test && build`. There is no e2e job in CI; a Playwright spec would go in `tests/e2e/` and run manually with `DEV_WORLD=1 VITE_DEV_WORLD=1 npm run e2e`.

---

## 9. Why an interior may not create its own Application

**The bug.** After leaving the Café, the city never came back. It rendered nothing but its
green clear colour, forever, and the console carried one uncaught
`TypeError: Cannot read properties of null (reading 'geometry' | 'clear')` from
`DefaultBatcher.break` / `BatcherPipe`.

**Root cause.** Two Pixi v8 `Application`s alive in one page. The second renderer's mere
existence corrupts the first one's batcher; the first then throws _out of its own ticker
listener_, so its `requestAnimationFrame` loop never reschedules and the world is dead for
the rest of the session. It only looked transient because the exception fires once — the
freeze it leaves behind is permanent.

Everything plausible was eliminated first, in this order:

| Tried                                                                 | Result                                                       |
| --------------------------------------------------------------------- | ------------------------------------------------------------ |
| `autoStart: false`, render only once the scene is built               | no change                                                    |
| Idempotent `teardown()` closing the StrictMode/Suspense race          | no change                                                    |
| Disposing baked textures before vs. after `app.destroy()`             | no change (the stack shifts, the error remains)              |
| Skipping `destroyTextures()` entirely                                 | no change                                                    |
| Skipping `app.destroy()` entirely — nothing torn down at all          | no change — so it is not teardown                            |
| `application.stop()` on the city while the interior is open           | **worse** — fires on entry, and on two visits instead of one |
| **An empty second Application: no textures, no scene, nothing drawn** | **still killed the city — the second renderer _is_ the bug** |

**The fix.** Buildings borrow the city's renderer instead of making one.
`framework/building/interiorStage.ts` lets the world layer publish its `Application`; an
interior awaits it, hides the city's layers, adds its own container and ticker callback, and
gives all of it back on exit. The city's `Application` is never destroyed, because the
interior never made it.

Two consequences worth knowing when writing the next building:

- **Render no DOM of your own.** The room draws into the city's existing canvas, so any
  element you mount sits on top of it. `CafeCanvas` returns `null`.
- **The DOM shell must be `pointer-events-none` with no background.** An opaque overlay
  hides the canvas; a solid hit area swallows every click meant for it. Interactive children
  opt back in with `pointer-events-auto`.

## 10. Risks

| Risk                                       | Handling                                                                                                                                                                                                   |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A second Pixi Application**              | Never do it — it kills the city's renderer outright (§9). Interiors borrow the city's via `framework/building/interiorStage.ts`                                                                            |
| **StrictMode double-mount, texture leaks** | Copy `CityCanvas`'s `destroyed` flag and its exact teardown order: `app.destroy(true, { children: true })` → `destroyTextures(baked)`                                                                      |
| **Closed unions**                          | `SoundName` (`audioManager.ts:19-30`) and `EventMap` (`events.ts`) are closed. The Café uses existing sounds only — a door bell or espresso hiss is a separate framework request, not a Café-folder change |
| **`origin/cafe` is a trap**                | It forked before the graphics overhaul and **deletes** `ambient.ts`, `characterArt.ts`, `Modal`, `Icon`, `Toaster`, every `fx_*` asset. **Never merge it.** Extract files individually with `git show`     |
| **`cafe.md` disagrees**                    | It specifies first-person R3F. This document supersedes its §4 and §7 only; everything else there still stands                                                                                             |
