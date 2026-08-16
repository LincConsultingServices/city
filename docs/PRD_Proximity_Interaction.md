# PRD — Proximity & Interaction Loop

_The City · Framework · v1.0 · 2026-08-16 · **Status: Draft for sign-off** · Owner: framework maintainer_

_Parent: [PRD_City_Frontend.md](PRD_City_Frontend.md) (§7 the plug-in contract, §12.2 the Pixi↔React seam) · Reference implementation: [PRD_Building_Cafe.md](../PRD_Building_Cafe.md) and the code under `src/buildings/cafe/`._

**Status of the code this specifies.** The loop ships in the Café and nowhere else. Every rule below is written as a framework contract for all interiors, and every rule is cited to the Café line that implements it. One piece is specified but **not built**: the Go state/validation surface (§4.2), which is why the season lives in `localStorage` written in the server's shape. The callout's art seam (§3.2.3) is declared and guarded but carries nothing — the cloud is drawn, not sprited, which costs no asset and no licence row.

**Closed since v1.0 of this document.** The two defects it recorded are fixed: the auto-repeat guard (§3.3, PI-28) and cast-proximity hysteresis (§3.1, PI-6). Both are unit-tested.

---

## 1. Feature Overview & Objective

The interaction loop is the only way a player acts on anything inside a building. Each tick the player's **grid cell** is compared against the room's exit, gates, hotspots and cast; the nearest eligible target inside its own radius becomes the single live proximity target, published to the store as four nullable fields. The DOM renders **one** prompt for whichever target wins a fixed precedence ladder, and Pixi renders **one** callout cloud over the NPC the live mission objective points at. `E` acts on the winner; the action emits a typed `RoomEvent`; a pure reducer decides whether that event advanced the mission, and the season is persisted on a debounce.

**Objective:** one contract, so building 02 gets identical behaviour without copying building 01's code, and so the loop remains fully playable with the backend absent.

Two invariants hold everywhere:

1. **One prompt slot, one cloud.** Not one per target. Competing targets resolve by precedence (§3.3), never by stacking.
2. **Nothing exists only on the canvas.** Every line a cloud carries is also in the DOM or announced to the live region — the objective marker repeats the tracker verbatim ([`accessibility.test.ts:148`](../src/buildings/cafe/accessibility.test.ts)), and a spoken line is announced with its narration. A consequence that exists only in the picture is a consequence half the audience never receives.

---

## 2. User Flow & State Machine

### 2.1 The flow

| #   | Step                    | What happens                                                                                                                                                                                                                                                                                                 |
| --- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | **Enter from the city** | `E` at the venue: `interactable && manhattan(cell, entranceTile) <= 1` ([`cityMap.ts:402`](../src/world/cityMap.ts)), key bound at [`CityScreen.tsx:79`](../src/ui/CityScreen.tsx). `BuildingGate` lazy-mounts the manifest's `interior` ([`BuildingGate.tsx`](../src/framework/building/BuildingGate.tsx)). |
| 2   | **Borrow the renderer** | The interior awaits `whenInteriorHost()`, calls `hideWorld()`, adds its own container and ticker callback ([`interiorStage.ts`](../src/framework/building/interiorStage.ts)). The city ticker early-returns while `interiorOpen`. **No second `PIXI.Application`** (§4.1).                                   |
| 3   | **Scene ready**         | Player at `SPAWN`; all four proximity fields computed once **before the first frame** ([`CafeCanvas.tsx:547-550`](../src/buildings/cafe/CafeCanvas.tsx)); season loaded from the store; the current light announced.                                                                                         |
| 4   | **Proximity, per tick** | Exit / gate / hotspot recomputed **only on a cell change** (`CafeCanvas.tsx:419-421`). Cast recomputed **every frame** (`:435`) — NPCs walk up to a stationary player.                                                                                                                                       |
| 5   | **Indicator**           | DOM prompt from the precedence ladder (`Interior.tsx:223-233`). Pixi cloud from `calloutFor(progress)` (`CafeCanvas.tsx:499-501`). Both gated on `missionWoken`.                                                                                                                                             |
| 6   | **Keypress**            | One `window` `keydown` listener (`Interior.tsx:203-220`): `e` / `E` / `Enter`, early-return when `inputLocked`.                                                                                                                                                                                              |
| 7   | **Validation**          | `act()` re-reads live state via `getState()` — never a closure — and walks the ladder: exit → gate → cast → letter → hotspot → no-op (`Interior.tsx:158-184`).                                                                                                                                               |
| 8   | **Overlay**             | `setSpeaking` / `setOpenHotspot` set `inputLocked`, which suspends WASD, click-to-move and further `E`. `Escape` unwinds innermost-first: dialogue → panel → leave.                                                                                                                                          |
| 9   | **Progression**         | The action emits a `RoomEvent`; `advance()` returns the **same `Progress` object** on a no-op, or moves one objective. On the last objective the mission closes: `visitors` cleared, `closeWorldState` applied, the week announced.                                                                          |
| 10  | **Persist**             | `saveSoon()` — 800 ms debounce, coalescing. `saveNow()` on exit, `pagehide`, `visibilitychange → hidden`, and unmount.                                                                                                                                                                                       |

### 2.2 The machine

Interior state is one Zustand store. The ticker writes through `getState()`; React reads through selectors; the two never converge on the same field from both sides.

| Field                                                                          | Written by        | Read by             | Meaning                                                                |
| ------------------------------------------------------------------------------ | ----------------- | ------------------- | ---------------------------------------------------------------------- |
| `charCell`                                                                     | ticker            | DOM (zone label)    | Integer grid cell. **The only position proximity reads.**              |
| `zoneId`                                                                       | ticker            | DOM, live region    | Derived from `charCell`, first-match-wins zone list                    |
| `nearExit`                                                                     | ticker            | DOM, `act()`        | `manhattan(cell, EXIT) <= 1`                                           |
| `nearGateId`                                                                   | ticker            | DOM, `act()`        | Nearest gate within 1                                                  |
| `nearHotspotId`                                                                | ticker            | DOM, `act()`        | Nearest hotspot within 1                                               |
| `nearCastId`                                                                   | ticker            | DOM, `act()`        | Nearest present cast member within their own `talkRadius`              |
| `openHotspotId` / `speakingToId` / `dialogue` / `reportOpen` / `thresholdOpen` | `act()`, dialogue | DOM overlay         | Which overlay is up                                                    |
| `inputLocked`                                                                  | overlay setters   | ticker, key handler | True while any panel is up. Suspends the room's input                  |
| `missionWoken`                                                                 | `wakeMission()`   | ticker, DOM         | Per-visit. Mission surfaces stay down until the player works something |
| `progress`                                                                     | `noteEvent()`     | ticker, tracker     | `{ missionOrder, objectiveIndex }` — exactly one objective live        |
| `walkTo`                                                                       | DOM (guided nav)  | ticker              | A request from the keyboard list; the canvas paths there and clears it |

Transitions, as a table. "live target" = the result of the precedence ladder.

| From             | Event                                | To                 | Side effects                                                     |
| ---------------- | ------------------------------------ | ------------------ | ---------------------------------------------------------------- |
| free             | cell change / cast moves             | free               | four proximity fields recomputed; `moved` event to the runner    |
| free             | `E`, live target = exit              | exiting            | `saveNow()`, `onExit()`, `showWorld()`                           |
| free             | `E`, live target = gate              | free               | grid rebuilt, path discarded, sound, announcement, `wakeMission` |
| free             | `E`, live target = cast              | speaking           | `inputLocked = true`, `spoke_to` event                           |
| free             | `E`, live target = hotspot / letter  | panel              | `inputLocked = true`, `inspected` event                          |
| free             | `E`, nothing in range                | free               | **no-op** — must not wake the mission surfaces                   |
| speaking / panel | `Escape` or close                    | free               | `inputLocked = false`                                            |
| free             | `decide` objective goes live         | dialogue           | beat opened after `BEAT_MS`; `inputLocked = true`                |
| dialogue         | option taken                         | consequence → free | `decided` event, world patch, immediate save                     |
| any              | last objective of the mission closes | free               | `visitors = []`, `closeWorldState` applied, week announced       |

---

## 3. Functional Requirements

Requirements are numbered `PI-n` so tests, reviews and building PRDs can cite them.

### 3.1 Proximity detection

**PI-1.** Distance is **Manhattan distance over integer grid cells**: `manhattan(a, b) = |a.x − b.x| + |a.y − b.y|`. Not Euclidean, not pixels, **not bounding boxes**. Two reasons, both binding: the 2:1 isometric projection makes screen-space boxes lie about adjacency (a box that looks adjacent overlaps a cell two rows away), and every interactable already owns exactly one cell, so a box would be a second, drift-prone source of truth.

**PI-2.** Radii, by target class:

| Target            | Radius                          | Source                                                        |
| ----------------- | ------------------------------- | ------------------------------------------------------------- |
| Venue door (city) | `<= 1` of `entranceTile`        | [`cityMap.ts:402`](../src/world/cityMap.ts)                   |
| Exit              | `<= 1` of `EXIT`                | [`room.ts:347-349`](../src/buildings/cafe/room.ts) `exitNear` |
| Gate              | `<= 1` of the gate cell         | `room.ts:352-354` `gateNear`                                  |
| Hotspot           | `<= 1` of the hotspot cell      | `room.ts:357-359` `hotspotNear`                               |
| Cast member       | `<= member.talkRadius` (1 or 2) | [`cast.ts:242-253`](../src/buildings/cafe/cast.ts) `castNear` |

Interior radii **must** equal the city's venue radius. A player who has spent five minutes reading "press E within one tile" outdoors must not have to learn a second rule indoors.

**PI-3.** `talkRadius` is per-character and is a fiction decision, not a tuning knob: Nadia's is 2 because you serve her across the counter; Marcus's is 1 because you walk to his table. Buildings declare it in their cast data.

**PI-4.** When several cast members are in range, **nearest wins**, first-declared breaking a tie (`cast.ts:245-251`). Only members whose sprite is actually visible are candidates (`castView.ts:215-216` `positions()`) — somebody hidden by world state must not answer a prompt from behind the scenery.

**PI-5.** Recompute cadence: exit / gate / hotspot on **cell change only**; cast **every frame**. The asymmetry is required, not an optimisation gap — an NPC walks to a standing player (Nadia arrives at 8:05 while you are already at the counter) and a movement-gated recompute leaves her un-speakable-to.

**PI-6.** Cast proximity is **hysteretic**: acquire at `talkRadius`, release at `talkRadius + 1` (`cast.ts:254` — pass the held id, omit it for the plain nearest-in-range answer). The player's own movement is cell-quantised and cannot oscillate, but a patrolling NPC standing exactly at the radius edge flips `nearCastId` on and off several times a second, which flickers both the prompt and the cloud. Somebody who walks genuinely closer than the held person still takes over, or you are stuck talking to whoever you met first while a second person stands in front of you.

**PI-7.** Every proximity setter is **identity-guarded** — returns the previous state object when the value is unchanged ([`cafeStore.ts:172-176`](../src/buildings/cafe/cafeStore.ts)). Non-negotiable: the ticker calls all four setters at 60 Hz, and an unguarded `set` re-renders the DOM shell every frame.

**PI-8.** Proximity reads `charCell` (integer), never the sub-cell walk position. The pixel position stays canvas-local and never enters the store.

### 3.2 Visual indicator

#### 3.2.1 The prompt (DOM)

**PI-9.** Exactly one prompt is rendered, resolved by the same ladder `act()` uses, so the pill always names the thing `E` will actually do (`Interior.tsx:223-233`). Text is the room's own words — `"leave the café"`, `"read the board"`, a person's name — never `"Press E to interact with object_04"`.

**PI-10.** The prompt is suppressed while any overlay is open (`Interior.tsx:278`).

#### 3.2.2 The callout cloud (Pixi)

**PI-11.** `calloutFor(progress)` returns `{ id, line }` for exactly the three objective kinds that name a person — `wait_for`, `talk_to`, `report` ([`missionRunner.ts:163-168`](../src/buildings/cafe/missionRunner.ts)) — and `null` otherwise. `go_to` and `inspect` name places the guided-navigation list already reaches by name; `decide` names a beat that is about to open as a dialogue. A cloud over any of those points at something the player cannot walk up to.

**PI-12.** A cloud carries one of three things, and never invents a fourth:

| Kind             | Source                          | Over                        |
| ---------------- | ------------------------------- | --------------------------- |
| Objective marker | the tracker's line **verbatim** | the NPC the objective names |
| Spoken line      | the beat's `says`               | whoever is speaking         |
| Your reply       | the option's own text, verbatim | the player                  |

The marker must stay a verbatim copy of the tracker — it answers "who do I approach" and is not a second place to put content. The other two are echoes of DOM that is on screen anyway: the panel holds the narration and the options, the live region gets the spoken line, and the reply is text the player just clicked. **A reply is quoted, never summarised** — a summary would be somebody's reading of what the player meant, and the options are held to a word-count band precisely so none of them can be marked out (§9.2).

**PI-13.** One cloud per room, not one per character — only one objective is live, so only one cloud can be up. Built lazily on the first callout, never up front (`castView.ts:210`): every mission opens on something that is not a person.

**PI-14.** The cloud is **added as a child of the actor's own holder** (`castView.ts:218`), not positioned in screen space. It then tracks the NPC as they walk with no world→screen transform, and hides when the holder hides. There is no projection helper in this repo and the canvas transform is a closure local; a DOM cloud would mean writing per-frame screen coordinates into the store.

**PI-15.** Placement: origin at the tail point; `baseY = actor.body.position.y − actor.body.height − CLOUD_LIFT` (`CLOUD_LIFT = 8`), which resolves to the top of the head including any sitting offset, because `body` is anchored `(0.5, 1)`.

**PI-16.** Idle motion: `y = baseY + sin(elapsed × 1.6) × CLOUD_FLOAT` (`CLOUD_FLOAT = 1.5`). A drift, not a bounce. **Dropped entirely under reduced motion** (`castView.ts:238`); the cloud still appears, it just does not move.

**PI-17.** Hide when any of: no live objective · objective kind outside the three · the actor is not present · `missionWoken` is false · the season is over · the speaker is `"room"`. `callOut(null, "")` is the single entry point for all of them. **The room narrating is a real case, not an edge one** — mission 4 is alone in the room by design (`standIn: "room"`), so its beats carry no `says` at all and the narration lives in the panel. A content test asserts that both ways round.

**PI-18.** Teardown: the cloud is destroyed `{ children: true, texture: true }` (`castView.ts:324`) because its `Text` texture is **generated** by us. A texture that came from Pixi's `Assets` cache must **not** be destroyed — the cache owns it, and the next mount would find a destroyed texture. A sprite-served callout is therefore destroyed first, with `texture: false` (`castView.ts:323`), so the container teardown never reaches it. This distinction is the whole rule for interior asset disposal.

#### 3.2.3 The shape, and the art seam

The cloud is **drawn**, as one closed path in `Graphics` (`cloudOutline`, `castView.ts:461`), from a layout computed in a pure module with no Pixi in it ([`cloud.ts`](../src/buildings/cafe/cloud.ts)).

**PI-19.** **One closed path**, not a plate plus a tail. The fill is 0.9 alpha, so two overlapping shapes show their overlap as a darker patch and two abutting shapes leave the base's stroke drawn straight across the tail's mouth. Walking the whole silhouette once — scalloped top, straight sides, flat base, tail cut into the base at the origin — gives one fill and one continuous outline. The base is **flat on purpose**: it puts the tail on solid edge wherever the line length lands, instead of in a valley between two bottom lobes, and it keeps the tail point exactly at the origin so PI-15's placement arithmetic is untouched.

**PI-20.** The top is a run of equal circles spaced closer than their diameter, so neighbours intersect; the outline takes each circle's arc between its two intersections. For radius `r` and centre spacing `d`, that intersection is at ±`acos(d / 2r)` from the line joining the centres. **The radius is derived from the lobe count, not the other way round** — `r = w / (2 + LOBE_GAP × (count − 1))` — so the spacing is exactly `LOBE_GAP × r` for every line length. Choosing the count first and letting the spacing be the remainder is the obvious way round and it is wrong: on a short line the remainder collapses to about a fifth of the radius and the cloud renders as a rectangle with a rippled top.

**PI-21.** Valley depth — `r − √(r² − (d/2)²)`, about 0.69 r at `LOBE_GAP = 1.9` — **must stay under `CLOUD_PAD_Y`**, or the line pokes out through the top of the cloud. The two numbers are held against each other in `cloud.test.ts` across every label size the building can produce, because they are set in different places and nothing else would catch the pair drifting.

**PI-22.** Long lines grow **more** lobes, never bigger ones (`LOBE_MAX`), so a three-word tracker line and a nine-word one read as the same object over two different people's heads. Never fewer than three: two is a pill with a dent in it.

**PI-23.** The art seam. `UI_SPRITE.callout` in [`assets.ts`](../src/buildings/cafe/assets.ts) declares a cloud PNG and its nine-slice insets; when it is present `buildCloud` builds a **`NineSliceSprite`** instead (`castView.ts:382`) and the path is not drawn. Nine-slice rather than a plain sprite because the cloud is re-cut to its line every time it changes — only the flat middle bands may stretch, or the lobes pull out of shape. The table is **empty today**; a real cloud PNG, tail baked into its bottom band so the origin is unchanged, drops in with one line.

It is kept apart from `PROP_SPRITE` because that table is keyed by `PropKind` and a label is not a prop. Every layout number the swap depends on — `CLOUD_PAD_X`, `CLOUD_PAD_Y`, `TAIL_W`, `TAIL_H`, `LOBE_MAX`, `LOBE_GAP` — is a named constant in `cloud.ts`, so adopting a sprite changes which drawing calls run and nothing about the layout arithmetic.

**PI-24.** [`assets.test.ts`](../src/buildings/cafe/assets.test.ts) guards the new table the way it guards the old one: the PNG exists, the source is at least **20 px** wide, every inset is positive, and the insets leave a middle band to take the stretch. The city's `spriteDensity.test.ts` cannot cover this — it hard-codes `public/assets/city` and iterates the city's own `PropKind`. A licence row in [`ASSETS_LICENSES.md`](../public/assets/ASSETS_LICENSES.md) lands **before** any art is used (PRD_City_Frontend §14.1).

### 3.3 Input handling

**PI-25.** Exactly one `keydown` listener per interior, on `window`, owned by the DOM shell — never by the canvas. Registered in an effect, removed in its cleanup (`Interior.tsx:219-220`).

**PI-26.** Accepted keys: `e`, `E`, `Enter` — `INTERACT_KEYS` in [`input.ts`](../src/buildings/cafe/input.ts). Everything else returns immediately. The decision is a pure function so the guards below are testable without mounting a canvas.

**PI-27.** `E` is inert unless a proximity target is live. There is no separate "is the key bound" state: `act()` reads the four proximity fields and returns without effect when all are empty (`Interior.tsx:175-177`). Pressing `E` in the middle of the floor is not work and **must not** wake the mission surfaces.

**PI-28.** Guards, both in `wantsInteract` (`input.ts:33`):

1. `inputLocked` → return. One overlay at a time.
2. **`repeat` → return.** One physical press is one action. A gate is the only action in the room that opens no panel and therefore sets no lock, so nothing downstream would have stopped an auto-repeat: holding `E` beside the counter flap lifted and lowered it several times a second.

`Escape` takes the same repeat guard (`wantsCancel`, `input.ts:43`) for the same reason — held down, it would close the dialogue, then the panel, then walk the player out of the building, inside a second and without a second decision. It is **not** gated on `inputLocked`: a panel being up is the usual reason to press it.

**PI-29.** `act()` reads live state through `getState()`, never through a closed-over prop, so the key handler and the on-screen button share one implementation and cannot disagree (`Interior.tsx:158-159`).

**PI-30.** **Precedence is fixed and normative:**

```
exit → gate → cast → letter → hotspot → no-op
```

- **Exit first**, always. Leaving must never be harder than anything else in the room.
- **Gate above cast**, because staff work one cell from the hinge; if a person won there, the gate could never be worked from the staff side.
- **Cast above readables**, because somebody standing in front of you outranks a noticeboard.

**PI-31.** `Escape` unwinds **innermost-first**: dialogue → open panel → leave the building (`Interior.tsx:204-211`). Escape never skips a level.

**PI-32.** Any successful action calls `wakeMission()`. Actions reachable without the key handler — a gate is also clickable in the room — call it themselves (`cafeStore.ts:218`), so waking is a property of the action rather than of the input path.

**PI-33.** `inputLocked` suspends WASD and click-to-move in the ticker as well as the key handler (read at `CafeCanvas.tsx:295`, gating direct drive at `:348` and path following at `:364`). One flag, three consumers.

### 3.4 Mission progression

**PI-34.** The runner is a **pure reducer**, not a store subscriber: `advance(progress, event, cellOf) → { next, completed, missionClosed }` ([`missionRunner.ts`](../src/buildings/cafe/missionRunner.ts)). It imports no Pixi, no React and no store. The room reports facts; the runner decides whether they mattered.

**PI-35.** It returns the **same `Progress` object** on a no-op, so callers detect a real advance by identity (`noteEvent` at `cafeStore.ts:373-375`). Movement events fire on every cell change and almost none of them are objectives; an allocation per step would be noise on the hot path.

**PI-36.** Event vocabulary is closed: `moved` · `spoke_to` · `inspected` · `decided` · `arrived`. Facts, never judgements. There is no event that carries a quality.

**PI-37.** `go_to` is satisfied within **`<= 1` cell** of the target, matching PI-2 — the prompt to read a board fires from beside it, so standing beside it has to count as being there.

**PI-38.** Exactly one objective is live at a time, and mission _n+1_ does not exist until _n_ closes. Both are unit-tested invariants, not conventions.

**PI-39.** On mission close: `visitors` cleared, `closeWorldState` applied, the week announced to the live region. `closeWorldState` is non-empty for every mission by construction — that is what guarantees every mission leaves behind something the player can point at.

**PI-40.** The tracker may show the objective line, the ordinal (`mission 4 of 9`) and the mission title, and **nothing else** — no count, no tick, no strike-through, no completed-mission list, identical pips for all three beats. Enforced by component test. It is the most tempting surface in the building to put a score on.

**PI-41.** Save triggers:

| Trigger                                                   | Timing                      |
| --------------------------------------------------------- | --------------------------- |
| Mission opens                                             | immediate                   |
| Objective completes · world write · zone change           | debounced 800 ms, coalesced |
| **Any decision beat commits**                             | **immediate**               |
| Panel opened/closed, tracker collapsed                    | debounced 800 ms            |
| Exit · `pagehide` · `visibilitychange → hidden` · unmount | immediate, flushed          |

Five objectives completed inside one second produce one write (`cafeStore.ts:302-311`). A committed decision that vanishes is the worst bug this loop can have, which is why it is the one trigger that never debounces.

---

## 4. Technical Implementation Constraints

### 4.1 React + TypeScript frontend

**One renderer.** The city owns the only `PIXI.Application`. An interior calls `whenInteriorHost()`, hides the city's layers, adds its container and ticker callback, and gives all of it back on exit. **An interior that constructs its own `Application` permanently breaks the city's renderer** — the second renderer corrupts the first's batcher, the first throws out of its own ticker listener, and its `requestAnimationFrame` loop never reschedules. Verified with an empty second Application drawing nothing: it is the second renderer itself, not anything drawn into it.

**Two consequences of borrowing.** The interior's canvas component renders `null` — the room draws into the city's existing canvas, so any element it mounts sits on top of it. The DOM shell is `pointer-events-none` with **no background**: an opaque overlay hides the canvas, and a solid hit area swallows every click meant for it. Interactive children opt back in with `pointer-events-auto`.

**The store seam.** Ticker writes through `useStore.getState()`; React reads through selectors. Guided-navigation requests are **polled in the ticker** (`walkTo`), not handled in a store subscriber — the ticker already reads the store every frame, and a re-entrant `setState` inside a subscriber is a puzzle for no gain.

**Coordinates.** Three spaces, one direction of travel:

| Space         | Type            | Owner                    | Rule                                                            |
| ------------- | --------------- | ------------------------ | --------------------------------------------------------------- |
| Grid cell     | `{ x, y }` ints | store (`charCell`)       | The only space proximity, pathfinding and objectives read       |
| World pixels  | float           | canvas closure           | 2:1 iso, 132×66 native tile ([`lib/iso.ts`](../src/lib/iso.ts)) |
| Screen pixels | float           | Pixi container transform | Never computed by hand; never written into the store            |

Conversions are `@/lib/iso` (`mapToWorld` / `worldToMap`) and pathfinding is `@/lib/pathfinding` (A\* over `{ width, height, isWalkable }`). Both are shared, unit-tested, and **reused rather than reimplemented per building**. A dynamic gate rebuilds the grid as a pure function of which gates are open, and rebuilding **must** discard any queued path — a path computed against the old grid is stale in both directions.

**Camera.** A room that fits the viewport is framed once and stays framed: `fitScale = min(1, (screenW − PAD) / roomW, (screenH − PAD) / roomH)`, clamped to `<= 1` so nothing is ever upscaled. Click-to-move still resolves correctly under scale because hit-testing goes through `container.toLocal()`.

**Overlays are DOM.** Prompts, panels, dialogue and the tracker are React, not canvas text: real focus order, visible focus rings, `aria-live` announcements, and text that scales with the user's font settings. Every state change the cloud or the room expresses visually is also pushed to the live region.

**Ownership.** A building PR touches only `src/buildings/<id>/`. Promoting the callout to a framework contract therefore means the cloud's implementation moves under `src/framework/building/`, while the sprite entry and the licence row stay building-owned. Anything a building needs that the framework does not provide is a framework issue, never a local fork.

**Teardown.** Arm the detach **before** the async bake and `.catch` the build. A bake that throws after the world is hidden leaves the city hidden and frozen — the worst possible failure, because the player cannot even walk away. On exit: destroy generated textures, leave `Assets`-cached textures alone (PI-18), unwind the ticker callback, `showWorld()`.

### 4.2 Go backend

None of this exists yet; the interior runs on `localStorage` written **in the server's shape** so the swap is two functions and no player migration.

**Endpoints.**

| Route                                       | Method | Purpose                                         |
| ------------------------------------------- | ------ | ----------------------------------------------- |
| `/api/v1/city/buildings/{buildingId}/state` | `GET`  | `{ rev, track, blob }` — the season             |
| `/api/v1/city/buildings/{buildingId}/state` | `PUT`  | Normal writes                                   |
| `/api/v1/city/buildings/{buildingId}/state` | `POST` | The `sendBeacon` exit flush                     |
| `/api/v1/city/beacon-token?buildingId=`     | `GET`  | Short-TTL, single-building token for the beacon |
| `/api/v1/progress/{activityId}/submit`      | `POST` | The trace; the server is the sole scorer        |

```jsonc
// PUT /api/v1/city/buildings/cafe/state
{
  "rev": 22,
  "track": "HARD",
  "blob": {
    "missionOrder": 3,
    "objectiveIndex": 4,
    "partialPath": [],
    "pendingFollowupId": null,
    "world": { "chalkboard": "oat_asked", "regulars": "steady", "...": "…" },
    "playerCell": [9, 4],
  },
}
```

**Concurrency.** `rev` is server-owned and monotonic. A write carrying a stale `rev` is rejected `409` with the current row in the body; the client re-reads, re-applies its local blob and retries. It never clobbers. The blob is capped at **16 KB**; a real season is roughly 500 bytes, so the cap is a guard against an unbounded key, not a budget to manage.

**The beacon.** `navigator.sendBeacon` cannot set an `Authorization` header, which is why the token is a separate short-lived, single-building grant fetched on entry. The `POST` route accepts it as the body's `beaconToken`. If `sendBeacon` returns `false`, the client falls back to `fetch(..., { keepalive: true })`, and writes the `localStorage` mirror either way. **The flush never blocks the exit fade.**

**Progression validation.** The server is the authority on whether a submitted season is structurally possible:

1. `missionOrder` is monotonically non-decreasing per user per building, and never advances by more than one.
2. `objectiveIndex` is within the declared objective count of that mission.
3. Every `world` key is one of the building's declared keys and every value is one of that key's declared enum values. An unknown key is a rejection, not a silent merge.
4. `partialPath` letters are legal edges of that activity's tree.
5. Rejections use the structured envelope `{"error":{"code","message"}}` with a documented code vocabulary — never the legacy flat `{"error":"msg"}`.

**Scoring stays where it is.** Progression state and scoring are different rows and different endpoints. `submit` carries the trace path plus the generated beat's `followupId` / `followupChoice`; the server computes proficiency and coins from its own rubric, and is idempotent per `(user, activityId)` so a retried submit credits once. Answer keys and tier maps never leave the server.

**The room advances on the trace, never on the score.** The client receives `proficiency` and discards it until the end-of-season report. A failed `submit` parks the decision in an `unsent` list and retries on the next successful call; it must never block an objective, a mission close, or the exit.

**Degradation.** Every failure costs cross-device continuity and scoring, and nothing else:

| Failure                      | Behaviour                                               | Player sees                            |
| ---------------------------- | ------------------------------------------------------- | -------------------------------------- |
| `GET .../state` fails        | `localStorage` season; else a fresh season              | Nothing, unless genuinely a new device |
| `PUT .../state` fails or 409 | `localStorage` mirror; re-read `rev` and re-apply       | Nothing                                |
| Beacon rejected              | `keepalive` fetch, then the mirror                      | Nothing, on the same device            |
| Registry rows missing        | That mission reads as not yet open; the rest still play | A mission that will not start          |
| `POST /submit` fails         | Trace kept in `unsent`, retried                         | Nothing — the room still moves         |

---

## 5. Edge Cases

| Case                                            | Behaviour today                                                                                                                                                                                                                                                                                                                  | Requirement                                                                                                                                                                 |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Player walks in and out of a radius rapidly** | `charCell` is discrete and only changes at cell boundaries, so the player's own movement cannot oscillate a target. Identity-guarded setters (PI-7) mean a stable target costs zero re-renders.                                                                                                                                  | No change needed for player-driven motion. Do **not** add a timer that delays acquisition — the prompt must be up the frame the player arrives.                             |
| **An NPC paces at the radius edge**             | Held through a one-cell release band (`cast.ts:254`), so a patrolling NPC standing at exactly `talkRadius` no longer flips it on and off. **PI-6**: acquire at `talkRadius`, release at `talkRadius + 1`, and hand over to anyone genuinely nearer. Covers the prompt and the cloud together, since both key off the same field. |
| **The NPC the cloud is over walks away**        | The cloud is parented to the actor's holder, so it hides with them and never strands over an empty tile (`castView.ts:189`).                                                                                                                                                                                                     | Keep the parenting. A cloud positioned in screen space would need explicit last-known-position handling and would drift under camera scale.                                 |
| **`E` held down**                               | Auto-repeat is dropped before the ladder runs (`input.ts:33`). Escape takes the same guard. **PI-28**: one physical press is one action, whichever key it is.                                                                                                                                                                    |
| **`E` mashed at an NPC**                        | `speakTo` sets `inputLocked` synchronously in the same handler, so the second press is swallowed by PI-28.1.                                                                                                                                                                                                                     | The lock **must** be set synchronously, before any `await`. An overlay that locks after a promise resolves has a window where a second press opens a second overlay.        |
| **`E` mashed at a gate**                        | Each press toggles; the animation restarts from its current rotation, so it degrades to a fast flap rather than a broken one.                                                                                                                                                                                                    | Acceptable with PI-28 in place. Rebuilding the grid **must** discard the queued path every time, in both directions.                                                        |
| **Closing a gate while standing on it**         | Refused: `ui_error`, an announcement, no state change (`cafeStore.ts:205-209`). The cell becomes solid the moment it shuts, and the player would be inside it.                                                                                                                                                                   | Any dynamic gate must implement the step-off guard, and must state the refusal in text — the sound alone is not a channel everybody has.                                    |
| **`E` during the enter or exit fade**           | The mission runner freezes when the exit flush is built; no objective can complete after it.                                                                                                                                                                                                                                     | No objective may complete between building the flush and unmounting. The overlay layer is not interactive until the canvas reports ready.                                   |
| **A `wait_for` target never arrives**           | The objective would stall with no way forward.                                                                                                                                                                                                                                                                                   | Every `wait_for` completes on a timeout-to-arrival, and the guided-navigation list's first row always points at the live objective, so the player is never steering blind.  |
| **Objective target absent from the guide list** | A `go_to` a keyboard player cannot reach is a blocked season.                                                                                                                                                                                                                                                                    | CI check: every mission's `go_to` target resolves to an entry in the building's guided-navigation list.                                                                     |
| **Generated beat is slow (> 2.5 s)**            | Fired in parallel with the previous beat's consequence; an in-character idle covers 2.5–4 s; hard abandon to the scripted bank at 4 s.                                                                                                                                                                                           | **Never a spinner, never a "personalised" badge, never different typography.** The player must not be able to tell which beat was generated. A latency tell is a tier leak. |
| **Network dies mid-mission**                    | Writes fall to the `localStorage` mirror and push on the next successful load.                                                                                                                                                                                                                                                   | The loop stays fully playable offline. A backend outage costs continuity and scoring, and costs nothing else.                                                               |
| **Tab killed mid-mission**                      | `pagehide`, `visibilitychange → hidden` and unmount all flush.                                                                                                                                                                                                                                                                   | Resume lands on the **same objective**, with the same world state and the **same pending question** — regenerating it would change the question a player already read.      |
| **Two devices, same season**                    | Not yet possible — `localStorage` only.                                                                                                                                                                                                                                                                                          | `rev` conflict → `409` → re-read and re-apply. Last write by `rev` wins; the loser re-applies rather than dropping its blob.                                                |
| **Interior unmounted by the framework**         | The cleanup effect flushes as if the player had walked out the door.                                                                                                                                                                                                                                                             | Leaving through the door and being taken away by the framework have identical consequences.                                                                                 |
| **A bake throws after `hideWorld()`**           | The city stays hidden and frozen: the player cannot even walk away.                                                                                                                                                                                                                                                              | Arm `detach` **before** the async build and `.catch` the build, returning to the street. Highest-severity failure mode in the loop.                                         |
