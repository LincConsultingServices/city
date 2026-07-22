# CLAUDE.md — working in `city-frontend`

Guidance for Claude (and humans) editing this repo. This stack is chosen so Claude
can author and maintain it natively (ADR-004): strict TypeScript + Zod-first
schemas mean generated code fails loudly at the boundary instead of silently
corrupting state.

## The one architectural rule — the Pixi↔React boundary

- One React component (`src/world/CityCanvas.tsx`) owns one `PIXI.Application`.
  **React never re-renders the world.**
- The Pixi ticker (`src/world/cityScene.ts`) reads Zustand stores via
  `getState()` / `subscribe` and writes back **only on change**. React DOM UI
  reads the same stores via selector hooks (`useWorldStore(s => …)`).
- World→UI: the typed event bus (`src/framework/events.ts`). UI→world: store
  actions only. Per-frame transforms live on Pixi objects + the `viewport`
  singleton — never in a store that React subscribes to at 60fps.

## Hard rules

- **Nobody calls `fetch` directly.** All HTTP goes through `src/framework/api/client.ts`
  (`api.*`) or the TanStack Query hooks (`src/framework/api/hooks.ts`). Every
  response is Zod-parsed.
- **Buildings touch only their own folder.** `src/buildings/<id>/` + its manifest.
  Need something shared? File a framework issue → maintainer PR. CI warns on
  boundary violations.
- **The client is not authoritative.** Never compute proficiency, grant a badge,
  or invent a coin. Submit a structured result; render the server's response.
- **Types come from Zod.** Add/adjust schemas in `src/framework/api/schemas.ts`;
  infer TS types from them. Don't hand-write a parallel interface.

## Recipe: add a building (venue)

1. Create `src/buildings/<id>/manifest.ts` exporting `const manifest: BuildingManifest`.
   `interior: null` runs it in the framework overlay; a `() => import('./Interior')`
   loads a bespoke interior lazily.
2. `hostedActivities` must be **canonical registry IDs** that exist in the backend
   (`GET /api/v1/registry/modules`). Only `C4-BEG-*` and `C9-*` are seeded today.
3. Place it: `exterior.footprintTiles` (cells it occupies) + `exterior.entranceTile`
   (where the player stands to enter). Keep within the world grid.
4. That's it — the city discovers it via `import.meta.glob`. A malformed manifest
   is reported and skipped by `validateManifest`, never a crash. Add a unit test if
   the placement matters.

## Recipe: add an activity renderer (F1)

1. Implement `Renderer<TContent>` from `src/activities/renderers/types.ts`: a
   `React.FC<RendererProps<TContent>>` that calls `onResultChange` with **exactly
   one** of the seven result kinds (or `null` while incomplete).
2. The result shape is enforced by `ResultSchema` — a malformed result cannot be
   submitted. Map the activity type → result kind via `RESULT_KIND_BY_ACTIVITY_TYPE`.
3. Register it in the renderer index (F1) and add an RTL test that it builds the
   correct result kind.

## Recipe: add activity content

Rich content (question text, sim tuning) lives in `src/activities/content/` keyed
by the **exact** registry activity ID (answer keys never leave the server). A
dev-mode check cross-references `hostedActivities` against the live registry.

## Before you commit

`npm run ci` (typecheck + lint + format:check + test + build). Keep pure logic in
`src/lib/` with an adjacent test.
