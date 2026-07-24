# PRD — The Café (venue scaffold: interior, quests, decision-tree activities)

_Companion to [PRD_City_Frontend.md](PRD_City_Frontend.md) (the framework this plugs into) · v1.0 · 2026-07-24 · Status: Draft, F1 implementation landing alongside this doc_

> **Scope note:** this is a **building scaffold** in the sense of the master PRD §7.4 ("each building's deep design happens in its own scaffold, separately planned"). It specifies one venue — the Café — end to end: its scenario, its 9 competency quests, its interior UX, and the one new framework-level renderer it needs (`DECISION_TREE`). It touches `src/buildings/cafe/` plus the one shared piece every future building will also need (a decision-tree renderer + a generic interior-mounting gate) — both framework additions, not café-specific logic.

## 1. Why this exists

The master PRD (§7.4) gives the Café only a one-line hint: _"tiny stand, big lessons — starter venue."_ This doc is that deep design. It also fixes a real gap: **DECISION_TREE** is one of the 13 activity types in the master PRD's renderer table (§8.1) and the repo has none of the 3 branching-choice renderers built yet (only MCQ, DRAG_MATCH, SORT_ORDER, BUDGET/metrics exist). The Café is the natural first venue to carry it — every one of the 9 competencies maps onto a real café-ownership decision, not an abstract question.

## 2. The ask, restated

The user wants a café **world** — walk in, look around, and _act_, not sit through a quiz. Concretely: no flat "question → 4 radio buttons" — the choice has to feel like something a café owner actually faces, staged as a scene (a customer's ask, a supplier's terms, a staff moment), with a consequence that plays out before moving on. Tiers (Developing/Strong/Advanced) exist for grading, and are **never shown to the player** — showing them would turn "make the call" into "pick the labeled right answer," which is exactly the Q&A feel being avoided.

## 3. Scenario framing (shown once, on first entry)

> _You're the new owner of a small neighborhood coffee shop — 4 staff, a loyal set of regulars, and a tight budget. It's cozy and well-loved, but sales have been flat for six weeks, and every dollar counts. From today, you're in charge: you make the calls on what to sell, how to spend, who to hire, and how to handle pressure. Each challenge ahead is a real decision a café owner faces. There's no single "right" answer — just choices, and the consequences that follow._

## 4. The 9 quests (competency → café decision)

| Competency                        | Café framing                               | Hotspot        |
| --------------------------------- | ------------------------------------------ | -------------- |
| C1 — Problem Sensing              | dairy-free requests, real demand vs. noise | Corkboard      |
| C2 — Learning Agility             | the underperforming iced drink             | Corkboard      |
| C3 — Courage to Commit            | the food-truck / bulk-order call           | Supplier crate |
| C4 — Financial Discipline         | what to do with a good month's cash        | Register       |
| C5 — Strategic Thinking           | the delivery-app trade-off                 | Register       |
| C6 — Power & Influence            | the corporate discount ask                 | Supplier crate |
| C7 — People Management            | the late, struggling barista               | Staff board    |
| C8 — Value Creation & Credibility | the cheaper-beans temptation               | Staff board    |
| C9 — Perseverance & Adaptability  | the rival café opening across the street   | Corkboard      |

Each has **two levels** (A = 16–21 tone, B = 35–50 tone — same competency, sharper stakes at B) — 18 playable quests total. Each is a single scene: seed prompt → 3 choices (tiers hidden) → consequence → done. **Follow-up branches** (the "a week later…" second beat in the source material) are documented but **not encoded yet** — their exact choice text/consequences weren't specified beyond the follow-up prompt itself, and inventing them isn't this pass's call to make. They're the natural next content PR once someone signs off on the branch text (§8).

## 5. Interior UX — hotspots, not a menu

Walking into the Café does **not** open a flat activity list (that's what `ActivityListPanel` does for the other venues, and it's exactly the Q&A-adjacent feel to avoid here). Instead:

- 4 hotspots rendered as the room itself: **Corkboard**, **Register**, **Supplier crate**, **Staff board** — each a themed card with its own icon and a one-line in-world hook ("A regular's been asking about oat milk…").
- Clicking a hotspot reveals its 1–3 competencies as a short pick, themed as "who do you talk to" rather than "pick a topic."
- Choosing a competency + level opens the scene: a speaker (the customer, the supplier, the barista) delivers the seed prompt via the framework's dialogue presentation, then the 3 choice cards appear styled as physical café objects (an order ticket, a sticky note, an invoice slip) — not a radio-button fieldset.
- Picking a choice plays its consequence as the next beat (text + a small state nudge — e.g., a cash-meter tick or a mood-icon flip on a staff sprite) before the scene ends and the standard framework result screen (coins/proficiency, §8.2) takes over.

This is DOM/React (matching the master PRD's accessibility-first stance, §16), not a new Pixi sub-scene — no new art pipeline dependency, keyboard/screen-reader reachable like every other panel in the app today.

## 6. New renderer: DECISION_TREE

Per master PRD §8.1, `DECISION_TREE` submits result kind **`trace`** — `{ path: string[] }`, already defined in `framework/api/schemas.ts` (`TraceResult`), just never consumed by a renderer until now. `path` = the sequence of **choice ids** picked, in order — enough for the server to grade against its rubric without the client ever computing a tier itself. Content shape:

```ts
interface DecisionChoice {
  id: string;
  text: string;
  tier: "developing" | "strong" | "advanced"; // never rendered
  consequence: string;
  next: string | null; // chain to a follow-up node later; null today
}
interface DecisionNode {
  id: string;
  speaker: string;
  prompt: string;
  choices: DecisionChoice[];
}
interface DecisionTreeContent {
  kind: "decision_tree";
  entryNodeId: string;
  nodes: DecisionNode[];
}
```

The renderer is a framework component (`src/activities/renderers/DecisionTreeRenderer.tsx`) like the other 4 — any future building can host a DECISION_TREE activity for free; the Café is just its first tenant.

## 7. Plug-in wiring (first real use of the building contract, master PRD §7.1)

`src/buildings/` doesn't exist yet in this repo — venues today are inline data in `world/cityMap.ts`. The Café becomes the **first plug-in folder**:

- `src/buildings/cafe/manifest.ts` — id, district, hosted activity ids (18), `interior: () => import("./Interior")`.
- `src/buildings/cafe/Interior.tsx` — the hotspot room described in §5; internally renders the framework's own `PlayerShell` when a quest is chosen (buildings consume the player shell, never reimplement it, §7.3).
- `src/framework/building/BuildingGate.tsx` — new, small, generic: given any `BuildingManifest`, lazy-mounts its interior in a `Suspense` boundary, or falls back to the existing overlay panel if `interior` is `null`. This is the one piece of shared plumbing every future building needs — not café-specific.
- `world/cityMap.ts`'s `cafe` venue entry gains its `hostedActivities` list (kept as the exterior/placement source of truth for now — the master PRD's fuller "manifest drives exterior too" end-state is a larger loader refactor, out of scope here per the repo's own note that "building INTERIORS are intentionally not scaffolded yet").
- `ui/CityScreen.tsx`'s `cafe`-kind branch swaps from the placeholder `InfoPanel` copy to `<BuildingGate manifest={cafeManifest} onExit={...} />`.

## 8. Known limits / next steps

- **Follow-up branches** (§4) aren't encoded — needs real choice/consequence text signed off before they're added as chained nodes.
- **Backend seeding**: only `C4-BEGINNER` is live-seeded on `academy-backend` today (master PRD §21 BE-12). Submitting a café quest's `trace` for any other competency will hit an unseeded-activity error until BE-12 progresses — the existing `ApiError` surface in `PlayerShell` already renders that gracefully; this doc doesn't add new error handling, it just inherits what's there.
- **Tier labels are a server-grading concept only** — never assert them client-side beyond picking which `tier` string rides along in content data for the rubric to read; the renderer must never display them.
