# The City — Web Frontend (`city-frontend`)

A 2.5D isometric, tycoon-style training city. React 18 + Vite + **PixiJS v8** +
TypeScript (strict). The backend (`warroom-academy-backend`, Cloud Run) is the
single source of truth — the client never computes proficiency, grants badges, or
credits coins; it submits structured results and renders what the server returns.

> **Status: F0 (Skeleton).** Walkable gray-box city, Firebase auth + register
> interstitial, typed ApiClient, the building plug-in framework with one
> placeholder venue (Ice Cream Cart), and the frozen framework contracts. The
> activity player + 13 renderers (F1), economy/shop/customization (F2), all 11
> venues (F3), and interiors/audio/FTUE (F4) come next. See
> [`docs/F0_STATUS`](#f0-status) and the master PRD.

## Quick start

```bash
npm install
cp .env.example .env          # fill VITE_FIREBASE_API_KEY + VITE_API_BASE_URL
npm run dev                   # http://localhost:5173
```

Without a Firebase key the login screen shows a clear "configuration missing"
message (never a crash). To run fully offline (no backend, no key), set
`VITE_CITY_MOCK_AUTH=1` in `.env` for a dev-mock session.

## Scripts

| Script                            | What                                           |
| --------------------------------- | ---------------------------------------------- |
| `npm run dev`                     | Vite dev server                                |
| `npm run build`                   | `tsc --noEmit` + `vite build`                  |
| `npm run typecheck`               | `tsc --noEmit`                                 |
| `npm run lint`                    | ESLint                                         |
| `npm run format` / `format:check` | Prettier write / check                         |
| `npm run test`                    | Vitest unit + component tests                  |
| `npm run e2e`                     | Playwright smoke (runs dev with mock auth)     |
| `npm run ci`                      | typecheck + lint + format:check + test + build |

## Architecture (the one rule)

**The Pixi↔React boundary** (`src/world/CityCanvas.tsx`): one React component owns
one `PIXI.Application`. **React never re-renders the world.** The Pixi ticker reads
Zustand stores each frame (`getState()`/`subscribe`); React DOM UI reads the same
stores via selector hooks. World→UI goes through the typed event bus
(`src/framework/events.ts`); UI→world through store actions. Per-frame transforms
live on Pixi objects + the `viewport` singleton, so 60fps never triggers a React
render.

```
src/
  config/        AppConfig (env resolution, base-url normalize)
  framework/     api/ (ApiClient, Zod schemas, hooks) · auth/ · economy/ · events ·
                 building (manifest contract) · router · audio · stores/
  world/         PixiJS: CityCanvas, cityScene, tilemap, camera, buildingLayer, viewport
  buildings/<id>/  one folder per venue — manifest.ts is the ONLY registration point
  activities/    PlayerShell + renderers/ (contract frozen; renderers land in F1)
  ui/            login, hud, venue overlay, world prompt, toasts, design-system
  lib/           pure, unit-tested: iso math, A* pathfinding
```

Adding a building, renderer, or activity content: see [`CLAUDE.md`](CLAUDE.md).
The plug-in contract: [`docs/BUILDING_GUIDE.md`](docs/BUILDING_GUIDE.md). Art spec:
[`docs/STYLE_SHEET.md`](docs/STYLE_SHEET.md).

## Backend contract notes (verified against the live service)

- Live: `/registry/*`, `/progress/*` (start/state/submit), `/progress`, `/badges`,
  `/profile`, `/hub/summary`, `/health`.
- **Not live** (seams only, no fake data): `/me`, `/wallet`, `/shop/*`,
  `/inventory`, `/avatar/*`, `/city/state`, `/ai/dialogue`. Bootstrap uses
  `/registry/modules`. `SubmitResponse` has **no coin fields yet** — the Economy
  module starts feeding the moment the backend adds them (backend BE-1).
- Error envelope: both `{"error":"msg"}` and `{"error":{code,message}}` normalize
  to one `ApiError`; **any 401 → one silent refresh → retry → else login**.
- Base URL: a trailing `/api` is stripped. Add the deployed origin to the
  backend's `CORS_ALLOWED_ORIGINS` (BE-7).

## <a id="f0-status"></a>F0 known shortcuts (tracked, not hidden)

- Gray-box only (procedural diamonds) — no art/audio assets yet.
- A* is 4-neighbour over a static walkable grid; buildings block their footprint.
- Map screen / fast travel / FTUE / day-night are later phases by design.
- The e2e smoke covers login→HUD→logout (DOM-observable); movement + venue-enter
  are covered by unit tests (nav/manifest) + the manual playtest gate (PRD §18).
