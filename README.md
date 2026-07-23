# The City — WarRoom Academy frontend

A 2.5D isometric, tycoon-style training city. Buildings are business **venues**;
entering one launches training activities scored by the live `academy-backend`.
Web-native stack per **ADR-004** (React + TypeScript + Vite + PixiJS) — see the
master PRD: [docs/PRD_City_Frontend.md](docs/PRD_City_Frontend.md).

> The prior Godot 4.x implementation is archived, reference-only, under
> [`reference/godot-f0/`](reference/godot-f0/) (superseded by ADR-004).

## Quick start

Requires **Node 20+** (built on Node 22).

```bash
cp .env.example .env       # set VITE_FIREBASE_API_KEY + VITE_API_BASE_URL
npm install
npm run dev                # http://localhost:5173
```

The main WarRoom frontend's `NEXT_PUBLIC_*` env names are accepted verbatim.

## Scripts

- `npm run dev` — Vite dev server (HMR)
- `npm run build` — typecheck (`tsc`) + production build
- `npm test` — Vitest unit suite
- `npm run typecheck` — `tsc --noEmit`

## How it works (PRD §10)

1. Sign in with a **WarRoom account** (Firebase, project `warroom-498513`). No
   in-game sign-up — an unknown account routes to `warroom.humanfirstbykk.com/register`.
2. Every backend call sends `Authorization: Bearer <idToken>`; the backend
   auto-provisions the academy user. Bootstrap is `GET /api/v1/registry/modules`
   (no `/me` route exists yet — see PRD §21).
3. The client never computes scores/coins/badges — it submits structured results
   and renders what the server returns.

## Layout (PRD §12.1)

```
src/
  framework/     shared runtime: api (client + Zod schemas + errors), auth,
                 economy, events, building, config
  world/         PixiJS: CityCanvas, iso city, camera, click-to-move (A*)
  activities/    PlayerShell, renderers/, content/
  ui/            Login, Hud, CityScreen, design system
  lib/           pure/testable: iso math, pathfinding
```

## Status

- **F0 (skeleton):** ✅ login → gray-box Pixi iso city, click-to-move, one venue
  with proximity prompt; typed ApiClient (auth + envelope + base-URL, ported and
  unit-tested from the Godot F0). 23 unit tests green.
- **F1 (vertical slice):** 🚧 activity-list bound to the live registry + player
  shell + MCQ renderer + submit loop are in; remaining renderers and real
  per-activity content are next.
