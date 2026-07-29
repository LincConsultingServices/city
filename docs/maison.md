# PRD — MAISON · an elite premium fashion label

_The City · Building 03 · Market Street · v1.0 · 2026-07-27 · **Status: Draft for sign-off** · Owner: TBD (one dev, per CODEOWNERS)_

_Parent: [PRD_City_Frontend.md](PRD_City_Frontend.md) (master). Siblings: the Café and MERIDIAN building PRDs. City venue id: `fashion_brand`._

> **Read §0 first.** This document was authored against **ADR-005 — Interior Framework**, a first-person 3D interior engine. That ADR, and the Café/MERIDIAN sibling PRDs it references, **do not exist in this repository**. §0 records exactly which parts of this PRD the current codebase can carry, which parts are deferred, and how the rest is delivered. Everything from §1 onward is the design as written; §0 and §19 are the only places that speak about the code.

---

## 0. Repo reality — what this codebase can carry today

`city-frontend` is `0.1.0-f1`: a **2.5D isometric PixiJS** city, mid-**F1** per master
PRD §19. Established facts that shape everything below:

- **There are no building interiors, anywhere.** `src/world/cityMap.ts:5` — _"Building
  INTERIORS are intentionally not scaffolded yet — main city UI only."_ Entering a venue
  opens a **DOM modal over the still-running Pixi city**; the player never leaves the
  street. Master PRD §19 puts interiors at F4.
- **No `three` / react-three-fiber, no GLB pipeline.** Master PRD §12.6 keeps R3F as a
  documented per-venue escape hatch, gated behind an ADR. The 3D interior in §3–§7 is
  therefore not buildable here without that ADR.
- **Venues are data in `src/world/cityMap.ts`**, not `src/buildings/<id>/manifest.ts`.
  `src/framework/building/manifest.ts` exists but is **unreferenced by any tracked
  source** — the plug-in registry it belongs to arrives at F3. `fashion_brand` is
  **already placed** on Market Street (block 3,0) with an empty activity list.
- **Renderer dispatch is an if-chain on `content.kind`** in `PlayerShell.tsx`, not a
  registry keyed by the server's `activityType`.
- **There is no dev mock backend.** Every call hits the real `academy-backend`.
  `VITE_DEV_WORLD=1` bypasses auth to look at the world; it serves no data.

### 0.1 The decision this PRD is built on

MAISON ships as a **scenario venue**: a bespoke DOM season board reached by walking to the
building and pressing E. No Pixi interior, no 3D. The nine beats, the countdown, the rail
and the press wall are all rendered as DOM — which §15 requires them to be anyway, and
which makes the interior, when it comes, a second view over the same state rather than a
rewrite.

### 0.2 The mapping

| PRD section                      | Status                    | How it lands                                                                                                      |
| -------------------------------- | ------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| §3 the world, §4 art, §6 ambient | **Deferred**              | Needs an interior. The venue is a Market Street exterior + the season board. §3.5's countdown survives as DOM.    |
| §5 the cast                      | **As voice, not sprites** | Élise, Rio, Hélène et al. exist in the stage directions and choice prose. No NPCs to render without an interior.  |
| §8 scenario spine                | **Shipped**               | The season board IS the spine: nine beats, station, host and countdown per beat.                                  |
| §9 decision content              | **Shipped, all 18**       | Both exemplars verbatim; the sixteen follow-up layers authored to §9.5 intent (see §19.3 on the audit that owes). |
| §10 registry binding             | **Blocked on backend**    | None of the eighteen IDs are seeded. See §0.4.                                                                    |
| §11 silent tier                  | **Shipped**               | No tier vocabulary in any shipped string, enforced in CI; scenario submits get a tier-free close.                 |
| §12 world state                  | **Shipped**               | Ten keys, pure reducer, rail state machine, persisted like `eggStore`.                                            |
| §13 the lookbook                 | **Shipped**               | The one place tier vocabulary appears. Unlocks on nine completed beats.                                           |
| §15 accessibility                | **Shipped for the rail**  | The rail's readout and the atelier's mood are text first; there is no 3D scene to caption.                        |
| §16 performance                  | **N/A**                   | No 3D scene, no GLB bundle. The season board is DOM.                                                              |

### 0.3 The one architectural deviation

**The rail cannot be seen, so it is read.** §3.3 makes the garment rail the building's
primary non-verbal channel and §15 requires it to be fully verbal as well. Only the verbal
half exists — `describeRail()` turns any world state into the plain-language line §15
specifies (_"the rail is now mostly neutrals; two vermilion pieces remain"_), and
`railContents()` produces the readable list with prices and neck labels. When an interior
lands, the 3D rail renders **from this same state**; §18.3's snapshot test that keeps the
DOM list and the 3D state in sync already has one of its two halves.

### 0.4 The registry blocker (backend path)

MAISON's eighteen IDs do not exist in the live registry. `ActivityListPanel` fetches
`GET /api/v1/registry/{comp}/{level}`, so until the rows land the season board shows every
beat as _not yet open_. Consequences and the questions this raises, recorded rather than
guessed at:

- **Level code for Level B.** This PRD uses `PRO`. The live level enum is unverified. If
  the backend calls it `ADVANCED`, it is one constant in the beat table.
- **`trace` path encoding.** §10.2's terminals read `"C2-HARD-03.a.b"`. The client submits
  `{ trace: { path: ["a", "b"] } }` — bare choice keys, assuming the server composes the
  terminal from the activity ID. If it expects fully-qualified segments, the renderer
  changes, not the content.
- **`DECISION_TREE` type + rubric.** Both are server-side. The client never sees a tier map
  and holds no scoring path of its own — there is no client-side scoring anywhere in this
  repo, by design.
- **A dev fixture, not a mock backend.** Because nothing is playable without a live
  backend, MAISON ships a dev-only registry fixture behind the existing `VITE_DEV_WORLD`
  flag so the season is walkable, testable and reviewable offline. It holds **no answer
  keys and no scoring** — a submit without a backend simply reports that it could not be
  scored.

### 0.5 Where the tier maps live

§10.2 is **an authoring record for the backend registry, not client data.** Nothing under
`src/` imports it, and nothing may. Reviewers: a tier map appearing in `src/` is a
blocking defect — it is the answer key.

### 0.6 Framework gaps MAISON exposes

MAISON is the first venue that is not "one competency, one level", and it surfaces four
gaps in the F1 framework. Each is a maintainer-path change under master PRD §7.3, listed
here so the diff is not a surprise:

| Gap                                                                      | Why MAISON hits it                                                   |
| ------------------------------------------------------------------------ | -------------------------------------------------------------------- |
| `CityBuilding` carries a single `competency` + `level`                   | MAISON spans nine competencies × two tracks                          |
| `ActivityListPanel` fetches exactly one `(comp, level)` list             | MAISON needs eighteen, and one missing row must not blank the board  |
| No `decision_tree` content kind; no producer for the `trace` result kind | `DECISION_TREE` is MAISON's only activity type                       |
| `ResultView` always prints `Proficiency n/3`                             | §11 forbids it in this venue; the tier belongs in the lookbook alone |

---

## 1. TL;DR

The door is heavy and it does not have a bell. Inside, the boutique is cool and mostly empty — four metres of polished floor, a single rail under one hard light, and a staircase at the back where you can see the atelier: eight people, north light, the sound of a machine running and stopping.

You run MAISON. Small team, one boutique, a following that is growing faster than your bank balance, and a collection to get out in eleven weeks. The brand is built on three things — reputation, scarcity, and the fact that the clothes are genuinely well made — and every single one of them can be spent, once, for cash.

Over one season you will decide what to make, what to charge, who to sell through, and what your name is worth. Nobody grades you. **The rail tells you what you decided.** The press wall tells you what happened. By the show, you are standing in a house that is the sum of nine choices, and it is either the house you meant to build or it is one you traded away in instalments.

**The fantasy in one line:** _your name is the product, and every deal spends a little of it._

**Why MAISON.** It is the building where the abstract idea of "value" becomes a physical object you can walk up to. A bank's reputation is a spreadsheet; a fashion house's reputation is a garment on a rail with a price tag on it. That makes MAISON the clearest venue in the city for C8 (Value Creation) and C5 (Strategic Thinking) — the two competencies that are hardest to make concrete anywhere else.

---

## 2. Scope

### In scope

- One first-person interior across two connected levels: a boutique floor and a raised atelier, open to each other by sightline.
- Seven named NPCs plus an ambient atelier and boutique loop.
- Nine competency decision trees × two tracks = **18 trees, 162 authored leaves**.
- A ten-key world-state model whose primary expression is a single garment rail.
- The **mentor consultation** mechanic for C2 (§9.6), resolved into the standard two-beat contract.
- Registry content for `C1-HARD-03 … C9-HARD-03` and `C1-PRO-03 … C9-PRO-03`.
- The end-of-journey report as the season lookbook.

### Out of scope

- Any shared framework change. Gaps go to the maintainer.
- Any backend endpoint beyond the registry rows in §10.
- A design minigame. You do not pick fabrics on a grid or drag hems. The interactions are: walk, look, talk, decide.
- A 3D player avatar. See §3.4 and §18.5 — the mirror shows the collection, not you; the lookbook carries your portrait using the existing 2D composition.
- The runway show itself. It happens between C8 and C9, off-screen, which is the correct amount of restraint.

---

## 3. The world

### 3.1 The space

Two levels, one volume. The boutique is at street level; the atelier sits on a **0.9 m raised platform** at the back, reached by four broad steps _and a ramp_ (the ramp is not only accessibility housekeeping — it is how rails get wheeled between the two, so it earns its place in the fiction as well as in §15).

Boutique **11.2 m × 8.0 m**; atelier platform **11.2 m × 6.4 m**; ceiling 4.6 m throughout, which is the single most important number in the room. MAISON is tall. The café was small enough that you could not escape anything; MAISON is big enough that you can stand a long way from a problem and still see it, which is a different and more expensive kind of pressure.

```
                                                            north light ↑↑↑
   ┌──────────────────────────────────────────────────────────────────────┐
   │   ATELIER  (raised 0.9 m)                                            │ NE
   │   ┌──────────┐   ┌──────────┐   ┌───────────┐    ┌────────────────┐  │
   │   │ cutting  │   │ machines │   │  ÉLISE'S  │    │  dress forms   │  │
   │   │  table   │   │  ×3      │   │   bench   │    │   ×4           │  │
   │   └──────────┘   └──────────┘   └───────────┘    └────────────────┘  │
   │   ▒▒▒▒▒▒▒▒▒▒▒▒▒▒ BALUSTRADE ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒  [ steps ] [ ramp ]   │
   ├──────────────────────────────────────────────────────────────────────┤
   │  ╔═══════════════╗                                                   │
   │  ║  PRESS WALL   ║   BOUTIQUE                    ┌──────────────┐    │
   │  ║  (stair run)  ║                               │   FITTING    │    │
   │  ╚═══════════════╝            ┏━━━━━━━━━┓        │   ALCOVE     │    │
   │                               ┃  THE    ┃        │  + MIRROR    │    │
   │      ┌────────┐               ┃  RAIL   ┃        └──────────────┘    │
   │      │ desk / │               ┗━━━━━━━━━┛                            │
   │      │lookbook│                  ▲ key light                         │
   │      └────────┘                                                      │
   │  ░░░░░░░░░░ shopfront glass ░░░░░░░░░░░░░░░░░░░░░░░  [ DOOR ]        │ SW
   └──────────────────────────────────────────────────────────────────────┘
                        ← Market Street →
```

**Zones**

| id           | name                 | Feel                                                                                                                         |
| ------------ | -------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `z_boutique` | _the floor_          | Cool, quiet, under-furnished on purpose. Sound carries. This is where money is discussed.                                    |
| `z_rail`     | _the rail_           | The one pool of hard light in the building. You stand in it to look at what you have made.                                   |
| `z_atelier`  | _the atelier_        | Warmer, north-lit, cluttered, loud with machines. The only room in MAISON that is actually working.                          |
| `z_fitting`  | _the fitting alcove_ | Enclosed, softly lit, mirrored. Private the way the Café's pass-through is private.                                          |
| `z_stair`    | _the stair_          | The press wall runs along it. A transitional space you pass through six times a session and read a little more of each time. |

### 3.2 Circulation and sightlines

You spawn **at the desk in the boutique**, facing the rail with the atelier behind it and above it. In one frame you see: your product, your team, and the light they work in. That is the whole company in one shot, and it is the reason the atelier is raised rather than hidden.

Three sightlines that do work:

1. **Boutique → atelier.** You can always see the people making the thing you are about to make a promise about. When you agree terms with a buyer on the floor, Élise is in your peripheral vision. That is not decoration; it is the C6 and C7 decisions arriving with a witness.
2. **The rail → the shopfront glass.** The rail sits between you and the street. Anything on it is visible from outside, which is why the collab piece landing on it in C5 is a public act.
3. **The stair.** Every trip between floors walks you past the press wall. The building's memory is on the route you take most.

### 3.3 The unforgettable thing — THE RAIL

A single garment rail, centre of the boutique floor, under the only hard light in the building. It holds the season.

It changes. Not subtly:

| World state | What is on the rail                                                                                  |
| ----------- | ---------------------------------------------------------------------------------------------------- |
| `bold`      | Eight pieces, all vermilion — the house signature, the thing the press calls you                     |
| `mixed`     | Vermilion and neutrals hanging together; the neutrals outnumber the vermilion by the end of the week |
| `neutral`   | Two vermilion pieces left as accents; the rest is bone, ash, sand                                    |
| `capsule`   | A second, shorter rail wheeled alongside — the entry line, visibly cheaper hangers                   |
| `collab`    | One garment on the rail carries a second label. It is not badly made. It is just not yours.          |
| `thin`      | Four pieces. You could not fund the rest.                                                            |

The price tags change with `price_tags`. The label on the neck changes with `house_mark`. A player can walk up, look at the rail, and read their entire season off it in five seconds without a single word of UI.

**Why this works for the silent-tier contract:** the rail never says _good_ or _bad_. A rail of neutrals is not a failure — it might be the best decision you made. A rail with a collab piece on it is not a sin — it might be what kept the lights on. The rail reports; the learner judges.

### 3.4 The mirror and the lookbook

**The mirror** is full-height, in the fitting alcove. It shows a **dress form wearing the rail's current hero piece** — not the player. It is a fitting mirror, and its job is to let you look at the collection at body scale rather than on a hanger. Technically it is a mirrored duplicate mesh, not a real reflection (no render targets).

**The lookbook** on the desk is where _you_ appear. It is the season's press material, and its cover plate carries the player's character portrait — the existing 2D composition from the HUD avatar chip, framed as a designer's headshot. This is the one place in the whole city where a player sees the character they built presented as a person rather than a sprite, and it costs nothing because the composition already exists.

**Deliberately not built:** a 3D player avatar. It would ripple into the shop, the cosmetics pipeline and every other interior. §18.5 records this as an open decision with a recommendation to defer.

### 3.5 The clock

MAISON runs on one collection and counts down to the show. The countdown is physically present: a number chalked on the atelier's steel column, changed by Élise between beats.

| Beat | Competency                | Countdown    | The room                                                       |
| ---- | ------------------------- | ------------ | -------------------------------------------------------------- |
| 1    | C1 · Problem Sensing      | **11 weeks** | Full team, calm, samples everywhere                            |
| 2    | C2 · Learning Agility     | **9 weeks**  | First sell-through numbers are in from the pre-season drop     |
| 3    | C3 · Courage to Commit    | **8 weeks**  | The production slot closes Friday. Everyone knows.             |
| 4    | C4 · Financial Discipline | **7 weeks**  | Fabric invoice on the desk. Dov is in the boutique, patiently. |
| 5    | C5 · Strategic Thinking   | **5 weeks**  | Rio's offer, and enough money in it to fund two seasons        |
| 6    | C6 · Power & Influence    | **4 weeks**  | Hélène on the floor with a number and a deadline               |
| 7    | C7 · People Management    | **2 weeks**  | Atelier lights on past ten. Élise has been here since six.     |
| 8    | C8 · Value Creation       | **1 week**   | The drop is Thursday. There is a shortcut available.           |
| 9    | C9 · Perseverance         | **after**    | The show happened. The reviews are on the press wall.          |

The countdown does the pressure work so the UI does not have to. Nothing is ever on a real timer — the number on the column is fiction, and fiction is enough.

---

## 4. Art direction

**One line:** _expensive, cold, and one degree away from beautiful_ — a room that is trying very hard, which is the truest thing about a small luxury house.

| Element            | Direction                                                                                                                                                                                                                                                                                                    |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Palette**        | Bone, ash, raw plaster, pale oak, brushed brass, black steel. **One saturated colour: vermilion**, and it appears only on the rail. When the rail goes neutral, the entire building loses its only warm hue — which is the emotional content of the C2 decision, delivered without a word. 16 colours total. |
| **Contrast**       | High and deliberate. The boutique is under-lit; the rail is over-lit; the atelier is flat north light. Three distinct lighting characters in one volume.                                                                                                                                                     |
| **Materials**      | Matte plaster and linen everywhere. Specular budget spent on exactly three things: the mirror, the brass rail, and the shopfront glass.                                                                                                                                                                      |
| **Texture**        | The boutique is immaculate — no wear at all, which is its own kind of tell. The atelier is the opposite: chalk marks on the cutting table, thread on the floor, tape on the machines. The wear budget lives entirely upstairs.                                                                               |
| **Key light**      | A hard narrow directional over the rail (implemented as a tight directional + emissive card; no spot lights). North light through tall atelier windows: soft, cool, unglamorous, and the only honest light in the building.                                                                                  |
| **Silhouette**     | Low-poly and severe. Straight lines, no chamfers on architecture. The garments get the polygon budget: cloth silhouettes read at a distance and they are the product.                                                                                                                                        |
| **Negative space** | Extreme in the boutique. Four metres of empty polished floor between the door and the rail. Luxury retail is the art of not filling a room, and it also happens to be excellent for a walking camera.                                                                                                        |

**Candidate CC0 sources** (license audit required before use — every line needs a
`public/assets/ASSETS_LICENSES.md` entry first):

| Need                                           | Candidate                                                    | License      |
| ---------------------------------------------- | ------------------------------------------------------------ | ------------ |
| Architecture, stair, balustrade, glass         | Kenney _Retro Urban Kit_, _Modular Buildings_                | CC0 (verify) |
| Desks, benches, stools, shelving               | Kenney _Furniture Kit_                                       | CC0 (verify) |
| Characters + shared rig                        | Quaternius modular character packs                           | CC0 (verify) |
| Animations                                     | Quaternius _Universal Animation Library_                     | CC0 (verify) |
| **Garments, dress forms, the rail**            | **Bespoke** — one artist, one batch, against the style sheet | n/a          |
| Sewing machines, cutting table, bolts of cloth | Bespoke kitbash from kit parts                               | n/a          |

MAISON needs more bespoke art than the Café because free asset packs contain approximately no clothing. **This is the building's largest risk** and §18.4 addresses it: the garment set is eight silhouettes × four colourways, built once, reused for every state of the rail.

---

## 5. The cast

Seven named. **Never more than five on screen.** The atelier's ambient workers are the swing capacity — they thin out when a named character is downstairs.

### 5.1 Élise Moreau — head of atelier

- **Who.** 54. Thirty-one years of hands. She was cutting for other people's houses before yours existed and she chose to come here, which she has never mentioned and never will. Exacting, dry, and completely without ego about anything except a seam.
- **Look.** Grey shirt, sleeves rolled, tape measure that is never not around her neck, reading glasses pushed up. Reads instantly from the boutique floor because she is the only person in the building who stands still.
- **Anchor.** Her bench, `z_atelier`. Patrol: bench → cutting table → dress forms → bench.
- **Animation.** `work` (pinning, default), `fold`, `lean`, `talk`, `listen`.
- **Voice.** Few words, all load-bearing. She states facts about cloth and lets you extract the implication. _"This one's been unpicked twice. That's not a fabric problem."_
- **Carries.** C2 (she is the one who noticed the neutrals moving before the numbers did), C7 Level A (the exhaustion), and the countdown on the column.
- **Gaze.** `player_near`. She looks up, holds it a beat longer than is comfortable, then goes back to work. That single behaviour does more characterisation than any line she has.

### 5.2 Kwabena "Kobby" Asare — junior designer

- **Who.** 26. Prolific, fast, generous, and the reason three other people in the atelier have stopped putting ideas forward — because you keep choosing his, and you have not noticed that you keep choosing his.
- **Look.** Whatever he made last week, worn as a test. The most colourful person in the room.
- **Anchor.** The cutting table. Patrol: cutting table → boutique rail → cutting table (he keeps going down to look at his own pieces on the rail, which is both endearing and the C7 problem).
- **Animation.** `work`, `talk_emphatic`, `gesture`, `walk`.
- **Voice.** Enthusiastic, quick, slightly too many words. Genuinely kind. _"Can I show you one thing? One thing, then I'll leave you alone."_
- **Carries.** C7 Level B (the favouritism you have not seen).

### 5.3 Véra Lindqvist — the mentor

- **Who.** 60s. Ran a bigger house than yours for eighteen years, left before it ate her, now advises three labels including this one. She never tells you what to do. She asks you what the number means.
- **Look.** Impeccable, undramatic, entirely at ease. Sits when everyone else stands.
- **Anchor.** The boutique desk, `z_boutique`, when present. She is **not in the building by default** — she appears at C2 and can be reached at other beats through the desk phone, which is how the consultation mechanic (§9.6) is rendered without adding a character to every scene.
- **Animation.** `sit_talk`, `sit_listen`, `stand_look_rail`.
- **Voice.** Slow, exact, ends on questions. _"Three times faster than what? Than the bold, or than last season's bold?"_
- **Carries.** C2 in both tracks, and the consultation path.

### 5.4 Ines Vidal — the stylist

- **Who.** 30s. Dresses six clients who matter and knows what forty others are saying. In and out of the building constantly, always mid-call, always with a name you should recognise.
- **Look.** Coat, phone, sunglasses pushed into hair. Never puts the bag down, which reads as "not staying" at a glance.
- **Anchor.** The boutique floor near the door. Never goes upstairs.
- **Animation.** `stand_phone`, `talk_fast`, `gesture_rail`, `walk_out`.
- **Voice.** Fast, warm, transactional-but-not-cynical. Relays other people's opinions as facts, which is a specific and useful unreliability. _"Three of mine asked me the same thing this week. That's not nothing."_
- **Carries.** C1.

### 5.5 Hélène Barthes — the buyer

- **Who.** Department-store buyer. Decisive, unhurried, entirely comfortable telling you no. She holds the 48 hours and she will not extend them, not out of cruelty but because her own calendar is not hers either.
- **Look.** The most expensively dressed person in the building, and none of it is yours. Cool palette, one stop cooler than the room.
- **Anchor.** The rail — she talks to you standing at the rail, touching the garments, which is a quiet dominance move and reads perfectly in first person.
- **Animation.** `stand_inspect`, `talk`, `touch_garment`, `check_watch`.
- **Voice.** Precise, courteous, never raises pressure — the pressure is structural, not personal. _"Friday. I'm not being difficult; Friday is when my slot closes too."_
- **Carries.** C3 and C6.

### 5.6 Dov Kessler — the investor

- **Who.** Patient money. Genuinely likes the clothes. Wants a percentage and is not in any hurry, which is the most effective form of pressure there is.
- **Look.** Understated, comfortable, sits down uninvited and it does not feel rude.
- **Anchor.** The boutique desk. Sits.
- **Animation.** `sit_talk`, `sit_listen`, `stand_look_rail`.
- **Voice.** Warm, unhurried, uses "we" early. _"You'll need this money in about six weeks. I'd rather we did it now, when you're negotiating from a good month."_
- **Carries.** C4.

### 5.7 Rio Santoro — the offer

- **Who.** Brokers collaborations and content. Represents a fast-fashion group in C5 and an audience deal in C8. Completely honest about being transactional, which makes him harder to dismiss than a villain would be.
- **Look.** Expensive-casual, phone out, moves around the room while talking rather than standing still.
- **Anchor.** Roams `z_boutique`. Never sits.
- **Animation.** `walk_talk`, `gesture`, `show_phone`, `lean_rail`.
- **Voice.** Fluent, friendly, closes without seeming to. _"Two seasons of runway. That's what this is. I'm not going to pretend it's anything else."_
- **Carries.** C5 and C8.

### 5.8 Ambient

Three atelier workers (sewing, pinning, pressing) on a shared loop, and one boutique client on a slower loop (enters, looks at the rail, leaves — buying nothing, most times, which is accurate). None of them speak lines the player must read.

---

## 6. Ambient life

| Beat                                | Interval   | Notes                                                                                                                                               |
| ----------------------------------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sewing machine run-and-stop         | 6–14 s     | Positional, from the atelier. **The building's heartbeat.** When it stops entirely, something is wrong and the player feels it before they know it. |
| Steam press hiss                    | 25–50 s    | Atelier                                                                                                                                             |
| Scissors on the cutting table       | 20–45 s    | Atelier                                                                                                                                             |
| Hangers sliding on the rail         | 30–70 s    | Boutique — someone rearranging the collection                                                                                                       |
| Boutique door (heavy, no bell)      | 60–120 s   | A dull thud, not a chime. Deliberately unwelcoming.                                                                                                 |
| Street bleed through glass          | continuous | Crossfaded from Market Street, heavily muffled — MAISON is more insulated than the Café, both acoustically and otherwise                            |
| Élise sets down her glasses         | 90–180 s   | The single most-used idle variation; it is how you know she is about to say something                                                               |
| Traffic light through the shopfront | 40–90 s    | A slow warm sweep across the polished floor from a passing vehicle                                                                                  |

**Density is bound to `atelier_mood`.** `strained` → machines run longer and stop harder, no conversation between workers. `fractured` → two of the three machines are silent. `trusting` → someone is humming. The room's mood is carried by _how much noise the work makes_, which is both cheap and completely legible.

**Reduced motion / low-spec:** ambient workers become stationary and the machine cadence halves; the machine sound stays, because it is informational.

**Audio.** Room tone (large, hard, reverberant — the opposite of the Café's boxiness), the atelier's machines, muffled street. **No music bed.** MAISON is a room where music would be a choice the owner made, and the silence is more expensive-sounding than anything we could source.

---

## 7. Player presence

- **Spawn:** at the boutique desk, facing the rail with the atelier above and beyond it.
- **Movement:** walking pace. The ramp and the steps both work; the ramp is the default guided-navigation route.
- **Interactables:** the rail (inspect — a close look at the current collection, with the price tags readable), the mirror, the lookbook on the desk, the press wall, the countdown column, the desk phone (§9.6), and each NPC.
- **Prompts:** diegetic, world-anchored DOM. The rail's is _"look at the collection"_. The phone's is _"call Véra"_.
- **Guided navigation stations:** _the desk · the rail · the fitting alcove · the press wall · the stair · the cutting table · Élise's bench_, plus NPCs by name and role.
- **Exit:** the shopfront door. Always available.

---

## 8. The scenario spine

| Beat  | Comp                        | Station             | Who brings it | The staging                                                                                                                                                                                        |
| ----- | --------------------------- | ------------------- | ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 11w   | **C1** Problem Sensing      | `st_rail`           | Ines          | She's at the rail, mid-call, and finishes it to tell you three of her clients asked the same question this week. She means it helpfully. She is also repeating something rather than reporting it. |
| 9w    | **C2** Learning Agility     | `st_bench`          | Élise         | She has the pre-season sell-through on a printed sheet, and she has put it on your side of her bench rather than handing it to you. The neutrals are moving three times faster than the vermilion. |
| 8w    | **C3** Courage to Commit    | `st_rail`           | Hélène        | Standing at the rail, touching the fabric. Two offers, one production slot, and Friday. She checks her watch once, without meaning anything by it.                                                 |
| 7w    | **C4** Financial Discipline | `st_desk`           | Dov           | Seated. The fabric invoice is on the desk between you, and it has gone up. He has been patient for six weeks and is about to be patient some more, which is the pressure.                          |
| 5w    | **C5** Strategic Thinking   | `st_boutique_floor` | Rio           | He walks the floor while he talks, which means you turn to follow him, which means the rail is behind him the whole time. Two seasons of funding for one garment with somebody else's label in it. |
| 4w    | **C6** Power & Influence    | `st_rail`           | Hélène        | Back. Same spot at the rail. A number that would halve your margin, framed as a favour, delivered pleasantly, with Élise visible upstairs.                                                         |
| 2w    | **C7** People Management    | `st_atelier`        | Élise / Kobby | Past ten. Two machines running. Élise has been in since six and has unpicked the same seam twice. Kobby is downstairs looking at his own piece on the rail.                                        |
| 1w    | **C8** Value Creation       | `st_desk`           | Rio           | The drop is Thursday. There is a shortcut, it is cheap, it works, and everyone in this industry has used it at least once.                                                                         |
| after | **C9** Perseverance         | `st_press_wall`     | the wall      | The show happened. Two clippings are up. One is polite. One is not. Élise is upstairs and has not said anything about either.                                                                      |

**Pacing.** Between beats: the countdown number changes on the column, the rail updates, one press-wall frame may fill, and the atelier's noise level shifts. The player is free to move; the next beat triggers on approach, never on a timer.

---

## 9. Decision content

### 9.1 How to read this section

Two-beat trees, branch-specific follow-ups, nine leaves. Tiers live in §10 only. Choice letters are shuffled per activity.

### 9.2 Rewrites of the source blueprint

The MAISON blueprint marks its weak options more heavily than the others, and several of its options are abstractions rather than actions. Both are fixed here; **the rewrite is the shipping text.**

| Where       | Source phrasing                                                                         | Problem                                             | Shipping text                                                                                                                                                  |
| ----------- | --------------------------------------------------------------------------------------- | --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C1-B (Lv B) | "Copy the rival's cheaper line right away, or you'll lose those buyers for good."       | "Copy" is a judgement                               | "Match them, this season. That buyer is deciding where they start, and whoever they start with is where they stay."                                            |
| C2-A        | "Stick with bold colour — it's who you are, and the early data is probably just noise." | "Probably just noise" is the author dismissing it   | "Hold the colour. Six weeks of sell-through in a pre-season drop is not a season, and a house that chases its own early numbers stops having a point of view." |
| C3-A        | "Ask for two more weeks to research — better safe than sorry."                          | Cliché marks it as timid                            | "Ask for two weeks. Neither of these deals is reversible, and the cost of choosing the wrong one is a year, not a season."                                     |
| C4-A (Lv B) | "Take the investor's cash quickly to remove the stress and grow right away."            | "Quickly … remove the stress" frames it as weakness | "Take Dov's money. He's offering on a good month at a fair number, and money raised from strength is the cheapest money you will ever get."                    |
| C5-A        | "Take the money now — you can worry about brand image later."                           | Explicitly marked                                   | "Sign it. Two seasons of funded runway buys you the freedom to be uncompromising later, and nobody remembers who paid for the year you survived."              |
| C6-A        | "Accept the cut — the exposure is worth more than the lost profit."                     | Acceptable but thin                                 | "Take the terms. That floor puts you in front of forty thousand people a week, and there is no marketing budget on earth that buys that."                      |
| C7-A        | "Push the team to hit the deadline — feelings can wait until after launch."             | "Feelings can wait" is the author's verdict         | "Hold the date. Everyone in this building knew what the two weeks before a show look like when they took the job, and moving it costs you the slot."           |
| C8-A        | "Fake the 'sold out' hype — it drives sales right now."                                 | "Fake" marks it                                     | "Post that it sold out. Scarcity is the oldest lever in this industry, everyone pulls it, and the pieces genuinely are nearly gone."                           |
| C8-A (Lv B) | "Pay for the hidden press — image is everything."                                       | Marked                                              | "Take the placement. Every house you admire has bought coverage at some point, and being written about is how a small label stops being small."                |
| C9-A        | "Panic and change the whole brand direction, or blame the market and freeze up."        | Two contradictory options in one, both marked       | "Change direction. The collection was the statement and it did not land — go back to the table and come back next season as something else."                   |
| C9-A (Lv B) | "Give up on the line, or stubbornly refuse to change anything."                         | Same                                                | "Cut the line. Three problems in one season is not a rough patch, it is an answer, and the discipline is knowing when to stop paying for one."                 |

**Abstractions grounded.** The source's Advanced options are frequently written as competency descriptions rather than actions ("fix the real cause, make the team feel safe to speak up, build for long-term loyalty"). Every one is rewritten as something a person does in this room, this week, with a named consequence. A choice the player cannot picture is a choice they cannot make.

---

### 9.3 Exemplar A — `C2-HARD-03` · "Three Times Faster" (Level A, fully worked)

**Station** `st_bench` · **Host** Élise · **9 weeks out** · **Shipped:** [c2-hard-03.ts](../src/activities/content/maison/c2-hard-03.ts)

> **Stage.** The atelier, mid-morning, north light. Élise has printed the pre-season sell-through and put it on your side of her bench rather than handing it to you, which is how she says things she does not want to say out loud.
>
> The neutrals are moving three times faster than the vermilion. The vermilion is the house. It is on the rail downstairs, it is in every photograph anyone has ever taken of this label, and it is the word the one review you have ever had used about you.
>
> Élise sets her glasses down.

**Seed choices**

|       | Text                                                                                                                                                           |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **a** | "Get Véra on the phone before you touch the order. Ask what a three-to-one on a pre-season drop actually means, and move on what she says."                    |
| **b** | "Shift the next drop toward what's selling, but keep one vermilion piece in it. Follow the money without giving up the thing people know you for."             |
| **c** | "Hold the colour. Six weeks of sell-through in a pre-season drop is not a season, and a house that chases its own early numbers stops having a point of view." |

**Seed consequences**

- **a** — _Véra asks you three questions in a row and you can only answer two of them. Three times faster than what — the bold, or last season's bold? Faster in units or in value? By the end of the call the number means something different than it did at the start, and it still says neutrals._ → `atelier_mood: steady`
- **b** — _You reweight the order: six neutral, two vermilion. Élise puts the sheet away without comment, which from Élise is agreement. The rail goes mixed by Friday and looks, honestly, better than it did._ → `rail: mixed`
- **c** — _You hold. Élise says "right" and goes back to the seam. Over the next three weeks the neutrals in the boutique sell out and the vermilion does not, and the rail starts to look less like a statement and more like a surplus._ → `rail: bold_thin`, `cash: tight`

**Follow-up — branch a** _(you called Véra)_

> The reweighted order is in and it is selling. Véra rings back a week later, unprompted: _"I've been thinking about your three-to-one. Do you know yet whether they're buying neutrals, or buying an easier first purchase?"_

|       | Text                                                                                                                                                           |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **a** | "Split the next drop deliberately — neutral at entry price, vermilion at full — and find out which variable is actually doing the work."                       |
| **b** | "Ring her back every time a number surprises you from now on. She sees the thing behind the number faster than you do, and that gap is the whole point."       |
| **c** | "It's selling. Take the win, run the neutral weighting through the season, and revisit the question when there's a season's worth of data to revisit it with." |

**Follow-up — branch b** _(you reweighted and kept one)_

> The mixed rail sells through better than either version would have alone. Ines mentions, delightedly, that two of her clients described you as "less shouty this season". She means it as praise. Élise, upstairs, heard it.

|       | Text                                                                                                                                          |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| **a** | "Get Véra in. 'Less shouty' is either the best or the worst thing anyone has said about this house, and you can't tell which from inside it." |
| **b** | "Lean in. Reweight further toward neutral for the main collection, and let the vermilion become the accent it is clearly already becoming."   |
| **c** | "Hold the split exactly where it is for the rest of the season, and decide what the house is after the show rather than during it."           |

**Follow-up — branch c** _(you held the colour)_

> Three weeks. The neutrals in the boutique are gone and the vermilion is not. Élise has started folding the unsold pieces rather than rehanging them, which she has never done. She has not said anything.

|       | Text                                                                                                                                                         |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **a** | "Hold. You are eight weeks from a show built entirely around this colour, and changing the collection now would be reacting to a boutique, not to a market." |
| **b** | "Cut the vermilion order, take the loss on what has already been made, and reweight the show while there is still time to reweight it."                      |
| **c** | "Call Véra, say out loud that you have been defending the colour rather than reading the numbers, and let her work out which you are still doing."           |

---

### 9.4 Exemplar B — `C5-PRO-03` · "Two Seasons" (Level B, fully worked)

**Station** `st_boutique_floor` · **Host** Rio · **5 weeks out** · **Shipped:** [c5-pro-03.ts](../src/activities/content/maison/c5-pro-03.ts)

> **Stage.** Rio walks while he talks, which means you turn to follow him, which means the rail is behind him the entire conversation. He is not hiding it. He knows exactly where he is standing.
>
> A fast-fashion group wants your name on a capsule. Twelve pieces, their factories, their price points, your label on the neck alongside theirs. The money funds two seasons outright.
>
> You have four weeks of cash. The pieces on your rail resell for more than you charge for them, which is the only reason Hélène is interested and the only reason Rio is here.
>
> **Rio:** _"Two seasons of runway. That's what this is. I'm not going to pretend it's anything else."_

**Seed choices**

|       | Text                                                                                                                                                                       |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **a** | "Work the numbers on what it does to you — resale, the buyers, what Hélène says when she sees it — then decide with the cost in front of you."                             |
| **b** | "Map the chain before you answer: cash this year, resale next year, who takes your call the year after. Then design the deal around what you won't give up, or refuse it." |
| **c** | "Sign it. Two seasons of funded runway buys you the freedom to be uncompromising later, and nobody remembers who paid for the year you survived."                          |

**Seed consequences**

- **a** — _You spend two days on it and the number that stops you is not the fee, it's the resale — a comparable house did this eighteen months ago and their secondary market has never recovered. You knew the deal was a trade. Now you know what you were trading._ → `resale: strong`
- **b** — _You come back to Rio with a shape rather than an answer: no label on the neck, a separate name, twelve pieces, one season, and a hard end date. He says he'll ask. It's smaller money. It is also a deal you could survive being public._ → `cash: funded`, `house_mark: clean`
- **c** — _The money clears in eleven days and it is more money than this company has ever had at once. Three months later the capsule is in every branch of a chain with 600 stores, your resale prices have halved, and Hélène's calls have got noticeably shorter._ → `cash: funded`, `house_mark: collab_logo`, `resale: soft`, `rail: collab`

**Follow-up — branch a** _(you costed it properly and declined)_

> You turned it down on the resale number. Six weeks later a house one tier above you takes almost the same deal and gets a visible sales bump and a lot of coverage. Ines asks, not unkindly, whether you were being principled or slow.

|       | Text                                                                                                                                                                          |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **a** | "Say the quiet part: you weren't being principled, you were being solvent, and you'd take a version of that deal tomorrow if it didn't touch the neck label."                 |
| **b** | "Hold the position and say nothing. The bump is three months old; the resale damage takes eighteen. You'll be right eventually and being right early looks like being wrong." |
| **c** | "Go back to Rio with the version you'd actually sign — different name, hard end date, no label — and use the fact that a bigger house just validated the category."           |

**Follow-up — branch b** _(you designed a deal you could survive)_

> They agree to most of it and push back on one thing: they want the MAISON name in the marketing even if it's off the neck. It is a smaller concession than the one you refused and it is the same concession.

|       | Text                                                                                                                                                      |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **a** | "Refuse it, in writing and specifically — the neck label was never the point, the association was, and conceding it in marketing concedes it everywhere." |
| **b** | "Take it. You held the line where it actually mattered, the marketing is transient, and the garment is the thing that lasts."                             |
| **c** | "Trade it: they can use the name for one campaign window, and in exchange the whole thing ends on a fixed date with no renewal option."                   |

**Follow-up — branch c** _(you signed)_

> The capsule is everywhere. Your resale has halved, Hélène's calls have got shorter, and Rio has come back with a second, larger version of the same offer. The money is real, the runway is real, and the thing you were funding it to protect is visibly worse than it was.

|       | Text                                                                                                                                                                             |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **a** | "Take the second one too. You are in this now; the damage is done and the only bad version of this is doing it once and getting none of the upside."                             |
| **b** | "Stop at one. Take the money you have, spend the two seasons rebuilding the thing you spent, and treat the capsule as a bridge rather than a business."                          |
| **c** | "Stop, and be public about stopping — put the reason in the next collection's notes, let the market see a house that priced its own mistake, and start earning the resale back." |

---

### 9.5 The remaining sixteen trees — seed layer and follow-up specification

Shipping text for the seed layer; follow-ups specified by prompt and tier intent.
**Shipped as authored seeds:** [seeds.ts](../src/activities/content/maison/seeds.ts). They are
deliberately **not** registered as playable — a one-beat tree cannot terminate at a
two-deep rubric terminal (§10.2), so shipping them half-built would submit traces the
server cannot score. The venue shows them as _Coming soon_ until the follow-up layer is
authored.

#### C1 · Problem Sensing — `good_questions`

**Level A — `C1-HARD-03` "Three of Mine Asked"** · `st_rail` · Ines · 11w

> She finishes her call to tell you three of her clients want a cheaper way in. She's repeating rather than reporting, and you have cash for exactly one move this season.

- Launch the entry line now. Three stylists saying the same thing in one week is as close to a market signal as this business gets.
- Go and ask the clients themselves. Find out whether it's the price they want or an easier first purchase — those are different problems with different answers.
- Put out one short capsule at a lower price and watch who actually buys it before you commit a line to it.

_Follow-ups:_ **"launched"** → it sells to new buyers and two long-standing clients ask if you've gone mass · **"asked"** → it turns out to be access, not price; do you fix access, fix price anyway, or fix both? · **"capsule"** → the capsule sells but at a margin that doesn't scale; extend, kill, or reprice?

**Level B — `C1-PRO-03` "The Resale Number"** · `st_rail` · Ines · 11w

> A rival launched an entry line. Your pieces are reselling at nearly double retail. Cash for one move. No proof of how many would actually buy.

- Match them, this season. That buyer is deciding where they start, and whoever they start with is where they stay.
- Run one capsule for a season and track both sell-through and margin properly before you commit a whole line to it.
- Find out who is asking, how often, and what they would genuinely pay — then spend only where demand and margin both hold.

#### C2 · Learning Agility — `learning_from_feedback`

**Level A — `C2-HARD-03`** — fully worked in §9.3.

**Level B — `C2-PRO-03` "The Colour House"** · `st_bench` · Élise + Véra · 9w

> The bold pieces are slow. A buyer you trust says the customer wants neutrals. The press has spent two years calling you _the colour house_, and that phrase is most of your recognition.

- Defend the colour publicly. Your entire recognition is one word, and changing it mid-season tells the press you don't know what you are.
- Move the plan on what the data says — shift quietly toward neutrals and keep vermilion as a controlled signature rather than the whole statement.
- Treat the miss as the most useful information you've had all year. Get Véra to stress-test it, then reposition ahead of the market rather than behind it.

#### C3 · Courage to Commit — `saying_no_opportunity_cost`

**Level A — `C3-HARD-03` "Forty-Eight Hours"** · `st_rail` · Hélène · 8w

> A department store wants to stock you. Terms are decent. You have 48 hours and you do not have all the facts.

- Ask for two weeks. Neither of these deals is reversible, and the cost of choosing the wrong one is a year, not a season.
- Weigh what you actually know against what you don't, decide inside the 48 hours, and own whichever way it goes.
- Commit to the one that fits what this house is meant to be in three years, and accept that you are buying it partly blind.

**Level B — `C3-PRO-03` "Friday"** · `st_rail` · Hélène + Rio · 8w

> An exclusive with a high-end store, a pop-up offer on the table, and a production slot that closes Friday. Neither deal is safe.

- Hold both and keep gathering until one of them stops being a guess, even if that means losing the production slot.
- Pick the one that fits the house, act before the slot closes, and accept that you are choosing on incomplete information.
- Decide cleanly under the pressure, accept that your name is on it either way, and turn the decision into momentum that afternoon.

#### C4 · Financial Discipline — `roi`

**Level A — `C4-HARD-03` "Pre-Orders"** · `st_desk` · Dov · 7w

> Pre-orders are strong. You're tempted to double the run and hire two people. Cash is tight.

- Double the production run and hire the two people now. Momentum in this business is a window, not a trend, and windows close.
- Produce only what has already been ordered, keep the cash where it is, and take on freelancers instead of permanent hires.
- Match the spend to demand you can prove, time it to when the money actually lands, and hold a reserve for the next drop.

**Level B — `C4-PRO-03` "Patient Money"** · `st_desk` · Dov · 7w

> Pre-orders are strong but unpaid. Fabric costs have jumped. Dov will fund you for a percentage. You have about one season of cash.

- Take Dov's money. He's offering on a good month at a fair number, and money raised from strength is the cheapest money you will ever get.
- Produce only paid orders, put what's left behind the highest-return piece, and price what the equity would actually cost you over ten years.
- Build the money out of the business first — pre-paid orders, a fabric partner, terms from the mill — and go to Dov only for what's left.

#### C5 · Strategic Thinking — `tradeoffs`

**Level A — `C5-HARD-03` "Your Name On It"** · `st_boutique_floor` · Rio · 5w

> A fast-fashion brand will pay well for your name on a cheap collaboration.

- Sign it. The cheque solves this season, and brand is something you can rebuild once you're solvent enough to have one.
- Work out what it does to you over one to three years, put that against the money, and pick accordingly.
- Trace where it lands — resale, the buyers, who takes your call next year — and design the deal around what you won't give up.

**Level B — `C5-PRO-03`** — fully worked in §9.4.

#### C6 · Power & Influence — `persuasion_storytelling`

**Level A — `C6-HARD-03` "For the Exposure"** · `st_rail` · Hélène · 4w

> A known boutique wants your pieces and wants your margin halved "for the exposure".

- Take the terms. That floor puts you in front of forty thousand people a week, and there is no marketing budget on earth that buys that.
- Ask what the exposure is actually worth to them, make the case for what you're worth, and hold the terms that matter while flexing the ones that don't.
- Negotiate from what you actually have — a resale market they'd like access to — show them the deal that works for both, and be genuinely willing to leave without it.

**Level B — `C6-PRO-03` "Pleasantly"** · `st_rail` · Hélène · 4w

> Tight deadline, names you'd like on your list, an opening offer well under your floor, and a hint that she'll go elsewhere. Your position is stable but not strong.

- Concede the terms. Losing this account with four weeks to a show is not a position you can afford to be principled from.
- Protect the margin and the terms that matter, turn each objection into the reason the work costs what it costs, and push for a decision date.
- Control the pace of the conversation rather than answering it, aim for the version that works for both of you, and be able to leave without damage if it doesn't hold.

#### C7 · People Management — `motivating_team`

**Level A — `C7-HARD-03` "Past Ten"** · `st_atelier` · Élise · 2w

> The atelier lights have been on past ten for a week. Élise has been in since six and has unpicked the same seam twice. A large order ships Friday.

- Hold the date. Everyone in this building knew what the two weeks before a show look like when they took the job, and moving it costs you the slot.
- Rebalance the workload, check whether you've been loading her because she never complains, and put something in place for the team to tell you before it gets here again.
- Fix what's actually causing it — the sample revisions, not the hours — make it safe for her to say so, and accept the ship date moves.

**Level B — `C7-PRO-03` "One Voice"** · `st_atelier` · Élise + Kobby · 2w

> A costly cutting error from a new hire. Morale flat with two weeks to go. And you have noticed, this week, that you have taken Kobby's suggestion nine times running and nobody else has offered one in a month.

- Deal with the error, keep the pace, and address the rest after the show. There is a version of this conversation that can wait and this is it.
- Handle the mistake respectfully, name the favouritism out loud before someone else does, and protect the team's trust while the pressure is on.
- Put people first where it actually costs you — fix the process that let the error through, change how ideas reach you, and carry the schedule hit yourself.

#### C8 · Value Creation & Credibility — `real_value`

**Level A — `C8-HARD-03` "Sold Out"** · `st_desk` · Rio · 1w

> The drop is Thursday. You could post that it's sold out, or you could spend the week showing people how the pieces are actually made.

- Post that it sold out. Scarcity is the oldest lever in this industry, everyone pulls it, and the pieces genuinely are nearly gone.
- Show the work — the cloth, the construction, Élise's hands — and take slower growth in exchange for people knowing what they're buying.
- Teach rather than sell. Make this house the place people learn what good construction looks like, and let the demand arrive as a consequence.

**Level B — `C8-PRO-03` "The Placement"** · `st_desk` · Rio · 1w

> Undisclosed paid coverage, or the slow version: publishing your patterns, your mills, your costs. Cash is tight.

- Take the placement. Every house you admire has bought coverage at some point, and being written about is how a small label stops being small.
- Build the reputation the slow way, publish nothing you can't stand behind, and protect the one asset a house this size actually has.
- Invest in the industry around you — publish the sourcing, credit the mill, teach the technique — and let the reputation outlast any single season's coverage.

#### C9 · Perseverance & Adaptability — `resilience`

**Level A — `C9-HARD-03` "Two Clippings"** · `st_press_wall` · the wall · after

> The show happened. Sales were weak, one review was polite and one was not, and the wall has two frames on it where you expected six. Élise hasn't said anything about either.

- Change direction. The collection was the statement and it did not land — go back to the table and come back next season as something else.
- Take the hit, work out specifically what missed, adjust the next collection, and keep the house pointed exactly where it was pointed.
- Treat the resistance as part of the job: take what's true from the bad review, protect the atelier's morale, and come back sharper.

**Level B — `C9-PRO-03` "And Then"** · `st_press_wall` · after

> After the flop: returns spike, and the wholesale order you were counting on is cancelled in the same week.

- Cut the line. Three problems in one season is not a rough patch, it is an answer, and the discipline is knowing when to stop paying for one.
- Take the feedback into the next set of decisions and keep a clear head while the numbers are bad and everyone is watching.
- Judge each of the three separately — what to continue, what to change, what to stop — and let the stretch make you harder to move.

### 9.6 The mentor consultation, resolved

The source blueprint specifies a scored "mentor lifeline" for C2 — _"Used 0–1 time = Developing · 2 times = Strong · all 3 times = Advanced"_ — as a usage counter, which does not fit the `trace` contract.

**Resolution.** The two-beat structure gives exactly two consultation opportunities per C2 tree, and consulting Véra is one of the three options at each beat. The tier map then encodes the intended signal directly:

| Consultations | Effective tier pattern       | Outcome                   |
| ------------- | ---------------------------- | ------------------------- |
| 0             | the two non-consulting paths | 15–60 → Developing/Strong |
| 1             | consult at one beat          | 42–81 → Strong/Advanced   |
| 2             | consult at both beats        | 95 → Advanced             |

This preserves the design intent (_looking for evidence that might prove you wrong is the competency_), stays entirely inside the existing scoring contract, and costs no backend change. **It is not a literal reading of "3 times"** — the divergence is deliberate and recorded here so a reviewer comparing against the blueprint knows it was decided, not missed.

**Véra is never punished and never gated.** The desk phone works at every beat in the building, at any time, and calling her outside C2 is free, unscored, and produces a genuinely useful question. A lifeline that costs something is a lifeline nobody uses, and the point of this competency is that asking is the strong move.

---

## 10. Registry binding

### 10.1 Activity IDs and subtopics

Building slot **03**.

| Competency | Level A      | Level B     | Subtopic                     | Title                                   | Why this subtopic                                                                           |
| ---------- | ------------ | ----------- | ---------------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------- |
| C1         | `C1-HARD-03` | `C1-PRO-03` | `good_questions`             | Three of Mine Asked / The Resale Number | The Advanced path is asking who, how often, and at what price — the question _is_ the skill |
| C2         | `C2-HARD-03` | `C2-PRO-03` | `learning_from_feedback`     | Three Times Faster / The Colour House   | The whole tree is what you do with a signal that contradicts your identity                  |
| C3         | `C3-HARD-03` | `C3-PRO-03` | `saying_no_opportunity_cost` | Forty-Eight Hours / Friday              | Two offers, one slot — choosing is declining                                                |
| C4         | `C4-HARD-03` | `C4-PRO-03` | `roi`                        | Pre-Orders / Patient Money              | "What does this equity actually cost over ten years" is return on investment                |
| C5         | `C5-HARD-03` | `C5-PRO-03` | `tradeoffs`                  | Your Name On It / Two Seasons           | Cash now against brand value later, made physical on the rail                               |
| C6         | `C6-HARD-03` | `C6-PRO-03` | `persuasion_storytelling`    | For the Exposure / Pleasantly           | The Advanced path is reframing the deal around what they actually value                     |
| C7         | `C7-HARD-03` | `C7-PRO-03` | `motivating_team`            | Past Ten / One Voice                    | Burnout, morale and unequal attention — the maintenance of willingness                      |
| C8         | `C8-HARD-03` | `C8-PRO-03` | `real_value`                 | Sold Out / The Placement                | Manufactured scarcity against demonstrated craft                                            |
| C9         | `C9-HARD-03` | `C9-PRO-03` | `resilience`                 | Two Clippings / And Then                | Compound setbacks; the competency is absorbing them without deforming                       |

`type: "DECISION_TREE"` · `orderIndex: 3` · `estMinutes: 6` (Level A) / `7` (Level B) · `passCriteria: { "minProficiency": 2 }`.

### 10.2 Tier maps and rubrics

> **Server-only. Never shipped to a client.** This subsection is the authoring record for
> the backend registry seed. Nothing under `src/` may import or restate it — see §0.4.

`C2-HARD-03`

| Node              | a                    | b                           | c                            |
| ----------------- | -------------------- | --------------------------- | ---------------------------- |
| **seed**          | Advanced (call Véra) | Strong (reweight, keep one) | Developing (hold the colour) |
| follow · branch a | Strong               | Advanced                    | Developing                   |
| follow · branch b | Advanced             | Developing                  | Strong                       |
| follow · branch c | Developing           | Strong                      | Advanced                     |

```jsonc
"rubric": {
  "kind": "trace",
  "terminals": {
    "C2-HARD-03.a.a": 81, "C2-HARD-03.a.b": 95, "C2-HARD-03.a.c": 63,
    "C2-HARD-03.b.a": 74, "C2-HARD-03.b.b": 42, "C2-HARD-03.b.c": 60,
    "C2-HARD-03.c.a": 15, "C2-HARD-03.c.b": 33, "C2-HARD-03.c.c": 47
  },
  "scoreMap": [
    { "minOutcome": 74, "proficiency": 3 },
    { "minOutcome": 42, "proficiency": 2 },
    { "minOutcome": 0,  "proficiency": 1 }
  ]
}
```

Note `c.c` = 47 → P2: you defended the colour for three weeks, then rang Véra and named your own defensiveness out loud. That is a Strong outcome from a Developing start, and it is the single most important cell in this building's design — **the game must reward changing your mind late over never changing it.**

`C5-PRO-03`

| Node              | a                             | b                                         | c                 |
| ----------------- | ----------------------------- | ----------------------------------------- | ----------------- |
| **seed**          | Strong (cost it, then decide) | Advanced (map the chain, design the deal) | Developing (sign) |
| follow · branch a | Developing                    | Strong                                    | Advanced          |
| follow · branch b | Advanced                      | Developing                                | Strong            |
| follow · branch c | Strong                        | Advanced                                  | Developing        |

```jsonc
"terminals": {
  "C5-PRO-03.a.a": 42, "C5-PRO-03.a.b": 60, "C5-PRO-03.a.c": 74,
  "C5-PRO-03.b.a": 95, "C5-PRO-03.b.b": 63, "C5-PRO-03.b.c": 81,
  "C5-PRO-03.c.a": 33, "C5-PRO-03.c.b": 47, "C5-PRO-03.c.c": 15
}
```

### 10.2.1 The outcome matrix (derived — makes the other sixteen mechanical)

The two worked examples above are not two independent score tables. They are the
same nine outcomes read off one matrix of **seed tier × follow-up tier**:

|                     | follow → Developing | follow → Strong | follow → Advanced |
| ------------------- | ------------------- | --------------- | ----------------- |
| **seed Advanced**   | 63                  | 81              | **95**            |
| **seed Strong**     | 42                  | 60              | 74                |
| **seed Developing** | **15**              | 33              | 47                |

Both §10.2 tables above reproduce exactly, cell for cell. So a tier map for the
remaining sixteen trees is not nine authored numbers — it is **four permutations**
(one per node: seed, follow-a, follow-b, follow-c), and the terminals fall out.
`scoreMap` is unchanged across the building: ≥74 → P3, ≥42 → P2, else P1.

Read the diagonal and the design intent is legible: **changing your mind late
(15 → 47) beats never changing it (63 → 42 at the same seed tier)**. §10.2's note
about `c.c` is not a special case; it is what the matrix is shaped to do.

### 10.2.2 Where the sixteen tier maps live

Not here, and not in `src/`. They are authored against the shipped prose as part
of the **registry seed**, using §10.2.1. What the client guarantees, so the seed
can rely on it:

- **A trace token is a letter, not a position.** The renderer shuffles the three
  options per activity and per beat (§9.1, enforced in `presentationOrder()`), and
  the authored key is what goes in `trace.path` regardless of the slot it was
  shown in. A tier map keyed by letter is stable.
- **The authored order in `src/` is weakest-first**, because that is the order
  §9.5 lists them in and the order they are readable in. It is an authoring
  convention, not a shipped one — no player ever sees it.
- **Every path is exactly two beats deep and every tree has nine leaves**, checked
  in CI, so a terminal set that is not nine entries is a seed error, not a
  content error.

One divergence to record rather than discover: §18.3 asks for "no letter
permutation repeated in the building". With 72 nodes and only six permutations of
three tiers that is impossible, and the PRD's own `C5-PRO-03` repeats `S,A,D` at
its seed and its third follow-up. Treat it as "vary the permutation within each
tree", which is achievable and is what the shipped trees aim at.

---

## 11. Silent tier & reward

**The rail is the feedback, and the rail has no opinion.** It is a factual report of what you decided to make and what it costs. Reviewers should specifically check that no rail state is lit, framed or scored as better than another — the collab piece hangs in the same light as everything else.

**Élise is not a verdict.** She is the character most at risk of becoming one, because she is wise and taciturn and the temptation to have her be quietly disappointed is enormous. Her reactions are bound to `atelier_mood` and `cash` — she is short with you when the atelier is strained, whatever decision strained it. She never comments on a decision as a decision.

**The press wall is not a score.** Clippings fill in from world state, and a cold review is not a fail state — a house can be panned and correct. The wall reports coverage, not quality.

**No hint button.** Suppressed in scenario mode. Véra is not a hint: she asks questions, she never gives an answer, and consulting her is a scored _choice_ rather than an escape from one.

**The coin tick** is silent, magnitude-proportional, and identical in presentation at 5 and at 25.

---

## 12. World state

**Shipped:** [worldState.ts](../src/buildings/fashion_brand/worldState.ts) — the ten keys, a
pure reducer, and `describeRail()` (the §15 plain-language readout).

| Key            | Values                                                                     | Visible as                                                                                         |
| -------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `rail`         | `bold` · `bold_thin` · `mixed` · `neutral` · `capsule` · `collab` · `thin` | The rail. The building's primary readout.                                                          |
| `price_tags`   | `house` · `entry` · `cut`                                                  | Tag colour and printed number, readable on inspection                                              |
| `house_mark`   | `clean` · `collab_logo`                                                    | The neck label on every garment on the rail                                                        |
| `press`        | `empty` · `one` · `mixed` · `warm` · `cold`                                | Filled frames along the stair; the wall is read on foot                                            |
| `atelier_mood` | `steady` · `strained` · `fractured` · `trusting`                           | Machine cadence, how many machines run, whether anyone talks, Élise's idle set                     |
| `cash`         | `season` · `tight` · `funded`                                              | Bolts of cloth on the atelier shelf (many/few/premium); whether the second cutting table is in use |
| `equity`       | `whole` · `sold`                                                           | Dov's presence in the building after C4, and a second name on the desk paperwork                   |
| `resale`       | `strong` · `soft`                                                          | A resale-market printout pinned by the desk, updated between beats                                 |
| `buyer`        | `circling` · `signed` · `walked`                                           | Whether Hélène's boxes are stacked by the door                                                     |
| `countdown`    | `11w` … `after`                                                            | The chalked number on the atelier's steel column                                                   |

Presentation only; never influences scoring. Persisted with the interior resume blob and, once the backend adds city state, across sessions.

---

## 13. End-of-journey report — _"The Lookbook"_

**Unlock:** all nine competencies on the player's track `COMPLETED`.

**The object.** The season's lookbook, on the desk where it has been all along, now printed and bound. The press file is folded into the back. Walking to it opens a full-screen reader.

**The spread.**

1. **The collection** — the rail as it finished, photographed. Eight pieces, whatever they turned out to be, with the prices you set. Below it, in small type, the version you started with. The diff is the season.
2. **The press file** — the clippings from the wall, in order, with the dates.
3. **Your record** — and this is the **only** place tier vocabulary appears anywhere in this building. Nine competencies, nine tiers, each with its one-line meaning and the week it was decided.
4. **The consequence trail** — two lines per competency: what you chose, what it cost, what it bought.
5. **Consistency** — the seed/follow-up shape made legible. _"You mapped the collaboration properly and then conceded the marketing. You see the whole board and you negotiate the last ten per cent as though it doesn't count."_
6. **The cover plate** — your character's portrait, framed as the designer's headshot (§3.4).
7. **Where next** — two or three city buildings that press hardest on your lowest competencies.

**Tone.** A lookbook is a document a house makes about itself. This one is honest. No grades, no percentiles, no praise — a record of a season and what it revealed, written by someone who was in the building.

---

## 14. Level A vs Level B in this room

|                           | Level A (`HARD`, 16–21)                                                                                                          | Level B (`PRO`, 35–50)                                                                                                                    |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| **Framing**               | MAISON is the label you started. Two years old, one boutique, a following that surprises you.                                    | MAISON is the label you took over. It has a reputation you inherited and can spend.                                                       |
| **Threshold question**    | _"Is MAISON the label you're starting, or the one you're taking over?"_ — asked by Élise on first entry, once for the whole city | same                                                                                                                                      |
| **Cast at beat 1**        | Élise, Ines, ambient                                                                                                             | Élise, Kobby, Ines, ambient — the favouritism problem is already in the room                                                              |
| **Props added**           | —                                                                                                                                | The resale printout by the desk from beat 1; a second, older lookbook on the shelf (the house before you); Dov's card already on the desk |
| **Decisions**             | One pressure at a time; the money is small and the horizon is one season                                                         | Cash, brand, equity and reputation move together; the horizon is ten years and the equity decision is permanent                           |
| **The rail**              | Starts at eight pieces                                                                                                           | Starts at eight pieces and a resale tag — the secondary market is a character from the beginning                                          |
| **Light**                 | The key over the rail is warmer                                                                                                  | One stop cooler and harder; the boutique is dimmer                                                                                        |
| **What "Advanced" means** | Asking the better question before spending                                                                                       | Asking it, mapping where the answer lands three years out, and being willing to pay what the answer costs                                 |

---

## 15. Accessibility for this interior

- **The raised atelier** is reachable by ramp as well as steps, and the ramp is the default guided-navigation route. No content is gated behind the steps.
- **Guided navigation labels** in the house's own words: _the desk · the rail · the fitting alcove · the press wall · the stair · the cutting table · Élise's bench_.
- **The rail is the building's primary non-verbal channel and must therefore be fully verbal too.** Every rail change is announced to the live region in plain language — _"the rail is now mostly neutrals; two vermilion pieces remain"_ — and inspecting the rail produces a readable DOM list of what is on it, with prices and labels. A player who cannot see the rail must be able to read the same season off it.
- **The press wall** is a DOM reader on inspection, not an image; the clippings are text.
- **The countdown number** is announced on change and is present in the DOM header of the interior, not only chalked on a column.
- **The machine sound** carries the atelier's mood, so the mood is _also_ surfaced in text: entering `z_atelier` announces both the zone and its state (_"the atelier — two machines running, nobody talking"_).
- **High contrast** is a risk here: this building is deliberately low-contrast in the boutique. The scene has a minimum-luminance floor, all UI is DOM at full contrast, and the high-contrast accessibility setting raises the boutique's ambient rather than tinting the render.

---

## 16. Performance budget

MAISON is the most demanding of the three launch buildings — bigger volume, more characters, and cloth.

| Metric               | MAISON target           | Notes                                                                       |
| -------------------- | ----------------------- | --------------------------------------------------------------------------- |
| Triangles on screen  | ≤ 55 000                | Garments are the expensive item; eight silhouettes at ~1 200 each           |
| Draw calls           | ≤ 80                    | Dress forms, machines, hangers, bolts all instanced                         |
| Unique materials     | ≤ 20                    | Four colourways share one material with a colour uniform                    |
| Skinned characters   | ≤ 5 on screen           | Ambient atelier workers thin out when a named character comes downstairs    |
| Texture memory       | ≤ 88 MB                 | 1024 for garments and the mirror surround; 512 elsewhere                    |
| GLB bundle           | **≤ 6.0 MB** compressed | At the ceiling. If it exceeds, cut ambient workers before cutting garments. |
| Enter / exit         | ≤ 1.0 s                 | Prefetched on approach from Market Street                                   |
| Ambient beats active | ≤ 8                     | §6 table                                                                    |

**The volume is the risk.** A 4.6 m ceiling and a 15 m depth mean more of the scene is on screen at once than in the Café. Mitigations, in order: the atelier's back wall is a low-detail card; the boutique's emptiness is genuinely cheap; and the shopfront glass uses the same low-detail street card as the Café rather than a second one.

---

## 17. Asset checklist

Every line requires an `ASSETS_LICENSES.md` entry before work builds on it.

**Architecture** — boutique shell, atelier platform, steps, ramp, balustrade, stair run, shopfront glass + frame, heavy door, tall atelier windows, steel column (countdown).
**Boutique** — **the rail (hero)**, desk, lookbook (2 states), resale printout, fitting alcove shell, **full-height mirror (hero)**, dress form ×4, hangers.
**Atelier** — cutting table, sewing machines ×3, steam press, Élise's bench, shelving, cloth bolts (3 density states), thread, scissors, chalk, tape.
**Garments (bespoke, the big one)** — 8 silhouettes × 4 colourways (vermilion, bone, ash, sand) + 1 collab piece + 3 entry-line pieces + price tags (3 variants) + neck labels (2 variants). **This is one artist, one batch, and it is the critical-path asset for the whole building.**
**Press wall** — frame ×8, 6 clipping text variants (DOM-readable, not baked images).
**Characters** — shared rig + 7 skins (Élise, Kobby, Véra, Ines, Hélène, Dov, Rio) + 4 ambient skins.
**Animation** — the shared 12-clip set plus MAISON-specific: `pin`, `fold`, `touch_garment`, `walk_talk`, `sit_uninvited`.
**Street (through glass)** — reuse the Café's Market Street card at a different angle.
**Audio** — large room tone, sewing machine (run/stop), steam press, scissors, hangers sliding, heavy door thud, muffled street, glasses set down. **No music.**

---

## 18. Phases, acceptance, testing, risks

### 18.1 Phases

| Phase     | Deliverable                                                                                              | Gate                                                                                                             |
| --------- | -------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| **MAI-0** | Gray-box two-level volume: dimensions, ramp and steps, collision, five zones, seven stations, guided nav | Traverse both levels first-person, mouse and keyboard-only, at 30 fps                                            |
| **MAI-1** | The rail with all seven states; Élise + ambient atelier; the press wall; audio                           | Change the rail state by hand and watch the building's meaning change — assessed by someone who did not build it |
| **MAI-2** | `C2-HARD-03` and `C5-PRO-03` end to end, including the Véra phone                                        | A real registry activity, server-scored, **no tier visible anywhere**, and the mentor path working               |
| **MAI-3** | All nine competencies × both tracks; full cast; countdown progression                                    | A complete season in one sitting                                                                                 |
| **MAI-4** | The lookbook; a11y pass; perf pass; garment set complete; licenses done                                  | A keyboard-only player completes a season and reads the lookbook                                                 |

See §19 for what of this has actually landed.

### 18.2 Acceptance criteria

1. **Plausible-peers audit passes**, run by a fresh reader on all 54 seed choices and 162 leaves with tiers covered. _Blocking._ MAISON's blueprint is the most heavily marked of the three, so this gate matters most here.
2. **Tier-leak audit passes.** Nothing outside §13.
3. **Registry validates.** `validate_registry` passes with MAISON's rows; all eighteen rubrics parse; all terminal sets are nine entries.
4. **The rail is fully legible without sight.** Inspecting it yields a complete DOM list; every change is announced. _Blocking_ — this is the building's primary feedback channel.
5. **Keyboard-only completion**, verified by e2e.
6. **Ramp parity.** Every station reachable without using the steps.
7. **Performance.** §16 met at MAI-3 and MAI-4.
8. **Consequence visibility.** Every decision changes at least one of: the rail, the press wall, the atelier's noise, or the cloth on the shelf.

### 18.3 Test plan

- **Unit** — the world-state reducer; the rail state machine (every state reachable, no state unreachable); the countdown mapping.
- **Content** — every constructible path terminates in a rubric terminal; every terminal is reachable; every leaf writes at least one world-state key; the mentor path is available at both C2 beats in both tracks.
- **Choice parity (machine pass)** — for every trio of choices, longest minus shortest ≤ **8 words**; no capitalised tier label, proficiency number, `n/3` or pass/fail phrasing in any shipped string; no verdict language ("unfortunately", "you should have", "the better move", "correct", "well done") in any consequence; each tier used exactly once per node and no letter permutation repeated in the building. The tier half of this check runs against the **registry seed**, not the client (§0.4).
- **Component** — the dialogue layer builds the correct `trace`; scenario mode renders no result view; the rail's DOM inspection list matches its 3D state exactly (a snapshot test, because these will drift).
- **E2E** — enter → `C2-HARD-03` → verify the rail changed → exit → re-enter → verify persistence → complete the season → open the lookbook.
- **Playtest** — a 25-minute scripted session with a fresh player, ending with _"which choice do you think the game wanted?"_. More than two correct out of nine sends §9 back for rewrite.

### 18.4 Risks

| Risk                                                                                           | Mitigation                                                                                                                                                                                                                                |
| ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **The registry rows do not exist** (§0.3) — the venue lists nothing against the live backend.  | The manifest ships the IDs as the authoring record; the offline mock covers the two complete trees so MAI-2 is verifiable today. Escalate the seed to the backend owner.                                                                  |
| **Garment art is the critical path and free packs contain none.**                              | Eight silhouettes × four colourways, built once by one artist, reused for every rail state. Fallback: dress forms and hanging cloth shapes rather than garments — less beautiful, entirely legible. Start this asset at MAI-0, not MAI-2. |
| **The blueprint's options are the most heavily marked of the three buildings.**                | The rewrite table in §9.2 is mandatory shipping text; the audit is blocking and run fresh.                                                                                                                                                |
| **The Advanced options are abstractions** ("build for long-term loyalty") rather than actions. | Every one rewritten into something that happens in this room this week. Reviewers reject any option they cannot picture.                                                                                                                  |
| **Élise becomes the game's conscience** — a verdict in a grey shirt.                           | Her reactions are bound to world state, never to tier. §11 flags it for reviewers. Playtest question: _"did Élise approve of what you did?"_ — if players can answer confidently, she is broken.                                          |
| **The volume costs more than the Café and MAISON is at the bundle ceiling.**                   | §16's mitigation order; the atelier back wall as a card; empty floor is free.                                                                                                                                                             |
| **Low-contrast art direction fights accessibility.**                                           | Minimum-luminance floor; DOM at full contrast; the high-contrast setting raises ambient rather than tinting.                                                                                                                              |
| **The mentor mechanic diverges from the blueprint's literal wording.**                         | §9.6 records the resolution and the reasoning explicitly so it reads as a decision rather than an omission. Needs KK sign-off.                                                                                                            |

### 18.5 Open decisions

- **The interior framework itself.** MAISON's §3–§7 need an interior engine this repo does not have (§0). Someone has to decide whether that is a 3D ADR or a 2.5D Pixi sub-scene inside `Interior.tsx`. **Recommendation: 2.5D sub-scene**, because the whole city is already isometric Pixi and a second renderer doubles the art pipeline.
- **3D player avatar.** The mirror currently shows a dress form. A real 3D avatar would ripple into the shop, the cosmetics catalogue and every interior. **Recommendation: defer past launch**; the lookbook's 2D portrait plate carries the "this is you" moment adequately.
- **The mentor divergence** (§9.6) — needs KK's word.
- **The house's signature colour.** Vermilion is this document's choice because it reads hot against a cold room and survives low-poly shading. Cheap to change; expensive to change late (it is in every garment texture).
- **Does the show itself ever appear?** Current position: no. It happens between C8 and C9 and we see only the press wall. Playtest whether that restraint reads as elegant or as a missing scene.
- **Whether Hélène returns in C9** if she signed. Currently she doesn't, and her absence carries.

---

## 19. Implementation log

Re-cut against the real `0.1.0-f1` codebase (§0). §18.1's MAI-0…MAI-4 assume an interior
engine; these are the phases that actually build MAISON here.

### 19.1 The phases

| Phase                       | Deliverable                                                                                                        | Gate                                                                       |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------- |
| **P0 — Baseline**           | This §0/§19 rewrite; the tree clean of a prior session's artifacts                                                 | `npm run ci` green on an unmodified `src/`                                 |
| **P1 — MAISON exists**      | `cityMap.ts`: `fashion_brand` becomes MAISON, `kind: "scenario"`, eighteen hosted IDs; `CityScreen` routes it      | Walk to Market Street, press E, MAISON opens; `cityMap.test.ts` green      |
| **P2 — The engine**         | `src/lib/decisionTree.ts` (pure); the `decision_tree` content kind; `DecisionTreeRenderer` → `trace`; silent close | A tree plays and submits `{trace:{path}}`; no proficiency on screen        |
| **P3 — The rail**           | `src/lib/maisonWorld.ts`: ten keys, reducer, rail machine, `describeRail()`; a persisted store                     | Every rail state reachable and readable in words                           |
| **P4 — The season board**   | The nine beats × two tracks, countdown, rail readout, press wall; the eighteen-way activity fetch                  | Enter → play a beat → the rail changes → it survives leaving and returning |
| **P5 — All eighteen trees** | Both exemplars verbatim + the sixteen follow-up layers; the §18.3 parity audit in CI                               | Audit green; every beat playable                                           |
| **P6 — Offline + lookbook** | The dev registry fixture (§0.4); the lookbook (§13); a11y and e2e pass                                             | A full season played end to end without a backend                          |

### 19.2 Status

- **P0 — done.** The tree is clean and `src/` typechecks.
- **P1 — done.** `fashion_brand` is MAISON: `kind: "scenario"`, a 3×2 footprint on Market
  Street, all eighteen ids, routed to its own panel. The city's placement invariants
  (reachability, non-overlap, corridors, crosswalks) pass unchanged.
- **P2 — done.** [`src/lib/decisionTree.ts`](../src/lib/decisionTree.ts) (traversal, world
  deltas, the parity helpers), the `decision_tree` content kind, the renderer emitting
  `{ trace: { path } }`, and the silent-tier close.
- **P3 — done.** [`world.ts`](../src/buildings/fashion_brand/world.ts) — ten keys, reducer,
  rail state machine, `describeRail()` / `describeAtelier()` / `describePress()` /
  `describeCash()`; [`maisonStore.ts`](../src/buildings/fashion_brand/maisonStore.ts)
  persists the season the way `eggStore` persists discoveries.
- **P4 — done.** [`MaisonPanel.tsx`](../src/buildings/fashion_brand/MaisonPanel.tsx): the
  threshold question, the rail readout, the nine beats, the eighteen-way fetch, and the
  world moving on the trace the player actually submitted.
- **P5 — done.** All eighteen trees, 162 leaves, in
  [`trees/`](../src/buildings/fashion_brand/trees). The §18.3 machine pass runs in CI over
  every authored string and caught three real defects while they were being written: a
  20/23/30-word trio where the resigned option was the short one, Dov delivering a verdict
  on the player, and — the one that mattered — **the whole building shipping its weak
  option first**, because §9.5 lists options weakest-first and eighteen trees were authored
  in that order. Fixed structurally rather than by hand: `presentationOrder()` shuffles the
  three options per activity and per beat, deterministically, so no author can reintroduce
  it. §10.2.1 records the outcome matrix the two exemplars turn out to share.
- **P6 — done.** [`devFixture.ts`](../src/buildings/fashion_brand/devFixture.ts) makes the
  season walkable without a backend — dynamically imported behind `devWorldBypass` and
  verified absent from the production bundle. A submit offline says plainly that nothing
  scored it, and the house still moves, because the house moves on the trace and never on
  the score. [`Lookbook.tsx`](../src/buildings/fashion_brand/Lookbook.tsx) unlocks at nine
  decided beats and is the only page in this building that repeats a tier — and only for
  beats the server actually scored.

### 19.2.2 The interior (M0–M6)

The interior framework landed upstream while P0–P6 were being built — a building
registry, a lazy interior gate, and a way for a building to borrow the city's
renderer, with the Café as its first tenant. That answers §18.5's first open
decision: **a 2.5D Pixi sub-scene, not R3F.** MAISON was re-cut against it.

| Phase  | Deliverable                                                                                                                                                                                  |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **M0** | Merge (17 commits), one conflict in `CityScreen`, re-baseline                                                                                                                                |
| **M1** | [`room.ts`](../src/buildings/fashion_brand/room.ts) — two levels, five zones, nine stations                                                                                                  |
| **M2** | [`props`](../src/buildings/fashion_brand/props.ts)/[`scene`](../src/buildings/fashion_brand/scene.ts)/[`MaisonCanvas`](../src/buildings/fashion_brand/MaisonCanvas.tsx) — the room on screen |
| **M3** | [`dressing.ts`](../src/buildings/fashion_brand/dressing.ts) — all ten §12 keys visible                                                                                                       |
| **M4** | [`beats.ts`](../src/buildings/fashion_brand/beats.ts) + [`vera.ts`](../src/buildings/fashion_brand/vera.ts) — beats at their stations, the desk phone                                        |
| **M5** | [`cast.ts`](../src/buildings/fashion_brand/cast.ts) — the seven, the cap, Élise's gaze                                                                                                       |
| **M6** | The silent-tier fix, the lookbook's cover plate and where-next                                                                                                                               |

**311 tests, `npm run ci` green.** Walk in from Market Street:
`VITE_DEV_WORLD=1 npm run dev`.

The acceptance criteria that are now met rather than deferred: **§18.2.4** (the
rail is fully legible without sight — inspecting it yields the complete list),
**§18.2.6** (ramp parity, proved by sealing the steps and walking the room),
**§18.2.8** (consequence visibility, proved by showing each of the ten keys
reaches a different part of the room), and **§11** — which was being violated:
completing a beat fired a win jingle and confetti, a verdict delivered before the
player had read the world their decision changed.

### 19.2.2 R1–R4 — the Café pass

The Café module is the house standard for an interior, so MAISON was read against
it line by line. Four rounds followed.

| Round  | What it did                                                                                                                                                                                         |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **R1** | One source of layout truth, `NEAR_EDGE`, `resolution: 2`, [`panels.tsx`](../src/buildings/fashion_brand/panels.tsx), [`index.ts`](../src/buildings/fashion_brand/index.ts), six geometry invariants |
| **R2** | `actHere()` in [`roomStore.ts`](../src/buildings/fashion_brand/roomStore.ts) — one guarded path, and props that answer the mouse                                                                    |
| **R3** | The mirror (§3.4), which had been a prompt that did nothing since the stations were authored                                                                                                        |
| **R4** | [`guide.ts`](../src/buildings/fashion_brand/guide.ts) — Tab walks the room, closing §18.2.5                                                                                                         |

Two rendering bugs came out of the comparison rather than out of play:

- **Three lists of "where the machines are" had drifted apart.** `room.ts` said
  `(3,1)(4,1)(5,1)`, `scene.ts` restated the same three, and `MaisonCanvas` stood the
  ambient workers at `(2,1)(6,1)(8,2)` — so the people running the machines were nowhere
  near them. Everything that draws at a prop, or stands in front of one, now derives its
  cells from `FURNITURE`.
- **The shopfront was drawing over the player.** It is the frontmost row, so by depth
  alone it clipped the feet of anyone walking the front of the boutique. The Café had
  designed this out with `NEAR_EDGE`; MAISON had not.

The criteria that moved from deferred to met: **§18.2.5** (keyboard-only completion —
stated as a property in [`guide.test.ts`](../src/buildings/fashion_brand/guide.test.ts)
and walked in the e2e) and **§3.4** (the fitting alcove now shows the season on a body).

### 19.2.1 Framework files touched, and why

A building PR should touch only its own folder (master PRD §7.3). These are the
exceptions, each closing a gap from §0.6 rather than reaching into shared code for
convenience:

| File                                         | Change                                                                                   |
| -------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `src/world/cityMap.ts`                       | `VenueKind` gains `"scenario"`; `fashion_brand` becomes MAISON                           |
| `src/ui/CityScreen.tsx`                      | Routes `"scenario"` to the venue's own panel                                             |
| `src/lib/decisionTree.ts`                    | New — the traversal, beside `sim.ts` and `budget.ts`                                     |
| `src/activities/content.ts`                  | `decision_tree` joins the union; venue content maps merge into `ACTIVITY_CONTENT`        |
| `src/activities/content.test.ts`             | `PRO` accepted; decision-tree structural invariants                                      |
| `src/activities/content.integration.test.ts` | `decision_tree → trace` in the rubric-kind map                                           |
| `src/activities/renderers/*`                 | New `DecisionTreeRenderer`                                                               |
| `src/activities/PlayerShell.tsx`             | Dispatch branch; silent-tier close; emits `activity_submitted`; dev-world unscored close |
| `src/framework/events.ts`                    | `activity_submitted` — the choice, not just that a choice happened                       |
| `src/lib/decisionTree.ts`                    | `presentationOrder()` — the per-beat choice shuffle §9.1 asks for                        |

### 19.3 Standing debts

- **§6's audio does not exist.** The room tone, the sewing machines' run-and-stop, the
  steam press, the heavy door with no bell — all §17 lines, none of them recorded. §6's
  whole conceit is that the atelier's mood is carried by _how much noise the work makes_,
  so this is a gap rather than a detail. The visual half is in and bound to
  `atelier_mood`.
- **The art is procedural.** Every prop is drawn with vector Graphics and baked, so the
  room ships without waiting on §17. `PROP_SPRITE` is the seam where real art takes over
  per kind. The garment set — eight silhouettes × four colourways, §18.4's critical path —
  is not started.
- **Kobby does not patrol yet** (§5.2). He stands at the cutting table rather than drifting
  down to look at his own pieces on the rail, which is the detail that makes the C7
  favouritism land.
- **The room has no moving part.** The Café's counter flap is a reduced-motion-aware
  affordance with a sound and an announcement; MAISON animates only the player and the
  people. Nothing in the room itself moves when you act on it.
- **Kobby does not patrol yet** — see below; unchanged by the Café pass.

- **§3–§7, §16 (the interior).** Blocked on the interior-engine decision in §18.5. The
  season board is the shipping surface until then.
- **§10 against the live backend.** Blocked on the registry seed (§0.4). The dev fixture
  makes MAISON reviewable, not real.
- **The §18.2.1 plausible-peers audit is owed.** The sixteen follow-up layers are authored
  to §9.5's stated intent by Claude, not by the PRD's author. The machine pass (§18.3) runs
  in CI; the **fresh-reader pass is still required before this venue is called done**, and
  it is blocking.
- **The Véra desk phone (§9.6).** Present as a _choice_ in the C2 trees, which is the whole
  scored mechanic. Absent as a _free, unscored, always-available call_ — that needs a room
  to put a phone in.
- **The Café owes MAISON three things back**, since it is the same standard: MAISON's
  clamped, exported and tested `shade()` (the Café's would blow up on the same input that
  killed this room); the early-armed `detach` and the `.catch` on the async build (without
  them a bake that throws leaves the city hidden and frozen); and the label/prompt linting
  tests.
