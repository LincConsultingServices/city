# PRD — THE CAFÉ · a small neighbourhood coffee shop

_The City · Building 01 · Market Street · v1.0 · 2026-07-27 · **Status: Draft for sign-off** · Owner: TBD (one dev, per CODEOWNERS)_

_Inherits [ADR-005 — Interior Framework](ADR-005_Interior_Framework.md) for everything platform-level: the R3F engine, the scene schema, the scoring model, the silent-tier contract, accessibility and budgets. Read that first. This document specifies **only what is true of this building**._
_Parent: [PRD_City_Frontend.md](PRD_City_Frontend.md) · Sibling scaffolds: [MAISON](PRD_Building_MAISON.md) · [MERIDIAN](PRD_Building_MERIDIAN.md)_

---

## 1. TL;DR

You push open a door on Market Street and the city falls away behind you. You are standing behind the counter of a small coffee shop with four staff, a set of regulars who have sat in the same seats for years, six flat weeks of sales, and not much money. It is yours from this morning.

Over one season — nine weeks, nine decisions — you will decide what to sell, what to spend, who to keep, and what you will not do for money. Nobody tells you which choice was right. The room tells you what happened instead: the chalkboard gets rewritten, the light changes, the regulars' table fills up or it doesn't, and by the last week you are standing in a café that is measurably the consequence of you.

**The fantasy in one line:** _it's your café, and the room remembers._

**Why this is building 01.** The Café is the smallest business in the city and therefore the clearest. Every competency has a concrete, physical expression at this scale — cash is a drawer, a team is one person you can see from where you stand, reputation is whether Marcus is in his chair on Thursday. It is the vertical slice for the whole interior framework: if the loop is not moving here, it will not be moving at a bank.

---

## 2. Scope

### In scope

- One first-person interior: a single room plus a visible back-of-house pass-through and a street view.
- Six named NPCs plus an ambient customer loop.
- Nine competency decision trees × two tracks (Level A → `HARD`, Level B → `PRO`) = **18 trees, 162 authored leaves**.
- A visible world-state model with ten keys driving props, light, cast presence and ambience.
- The end-of-journey report as a diegetic object.
- Registry content for `C1-HARD-01 … C9-HARD-01` and `C1-PRO-01 … C9-PRO-01`.

### Out of scope

- Any change to shared framework code (ADR-005 §8.4 — hard rule). Framework gaps go to the maintainer.
- Any backend endpoint. The Café consumes what exists plus BE-13/BE-14 (ADR-005 §18).
- The kitchen as a walkable space — visible through the pass-through, never entered.
- A café management sim. There is no drag-a-cup minigame, no timed service loop. The interactions are: walk, look, talk, decide.
- Multiplayer, co-presence, or any other customer than the ones the script brings.

### Assumptions this PRD depends on

| Assumption                                  | Source        | If false                                                        |
| ------------------------------------------- | ------------- | --------------------------------------------------------------- |
| `PRO` level exists in the registry          | BE-13         | Level B cannot seed; ship Level A only and hold Level B content |
| `coinsByProficiency` is `{1:5, 2:15, 3:25}` | BE-14         | Rewards are off-scale but nothing breaks                        |
| Framework gaps G1–G8 are closed             | ADR-005 §17   | The interior cannot be mounted at all                           |
| The interior engine reaches I0              | ADR-005 §20.1 | Blocked                                                         |

---

## 3. The world

### 3.1 The room

Roughly **9.4 m × 7.2 m**, single storey, ceiling at 3.1 m. Small enough that you can see everyone in it from anywhere, which is the whole point — this is a business where every problem is in the same room as you.

```
                      ← Market Street (visible through glass) →
   ┌────────────────────────────────────────────────────────────────┐
   │  ░░░░░░░░░░░░  WINDOW WALL  ░░░░░░░░░░░░░░░░░░░░░░░  [ DOOR ]  │  SW
   │  ░                                                    ░  bell  │
   │  ░   ┌────┐        ┌──────────┐        ┌────┐         ░        │
   │  ░   │ T1 │        │    T3    │        │ T2 │      ┌──┴──┐     │
   │  ░   └────┘        │ REGULARS │        └────┘      │ T4  │     │
   │  ░  two-top        └──────────┘       two-top      │ high│     │
   │  ░                   four-top                      └─────┘     │
   │  ░                                                             │
   │  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ COUNTER ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓   │
   │   till    pastry case   grinder   ESPRESSO MACHINE   end-run    │
   │  ═══════════════ CHALKBOARD (above, wall-mounted) ═══════════   │
   │  ┌──────────┐                                    ┌───────────┐  │
   │  │  BOARD   │            back bar                │PASS-THROUGH│ │
   │  │ community│                                    │  → kitchen │ │
   │  └──────────┘                                    └───────────┘  │  NE
   └────────────────────────────────────────────────────────────────┘
```

**Zones** (`InteriorScene.zones` — announced on entry, drive audio and ambience):

| id         | name                 | Feel                                                                                           |
| ---------- | -------------------- | ---------------------------------------------------------------------------------------------- |
| `z_floor`  | _the floor_          | Where customers are. Warmest light, most footfall, most noise.                                 |
| `z_behind` | _behind the counter_ | Your side. Machine noise, the till, the chalkboard within arm's reach.                         |
| `z_window` | _by the window_      | Street sound bleeds in. Where you go to look at what the competition is doing.                 |
| `z_pass`   | _the pass-through_   | The only private corner. Out of earshot of the floor by about two metres, which matters in C7. |

### 3.2 Circulation and sightlines

The counter is the spine. You spawn **behind it**, at the till, facing out — the first thing you see is your own room with people in it, and the door dead ahead. Everything is reachable in under six seconds of walking; nothing is more than one turn away.

Three deliberate sightlines:

1. **Till → door.** You always see who comes in. The bell means you hear them first, look up second — a rhythm the ambient loop leans on hard.
2. **Behind the counter → the regulars' table.** Marcus's chair is directly in your eyeline from where you work. This is why C9's empty table lands.
3. **Anywhere → the window → the street.** The iso city you left is visible outside, stylised and slightly out of focus. In C3 the food truck parks in that frame. In C9 a new awning appears across the road. **The threat is always visible from inside**, which is the honest version of running a small shop.

The pass-through is the one place you cannot be seen from the floor. Every conversation that should not happen in public happens there, and the framework's proximity system is tuned so that the ambient customer chatter ducks when you stand in `z_pass`. Privacy is rendered as an audio mix.

### 3.3 The unforgettable thing

**The chalkboard and the regulars' table.**

The chalkboard above the counter is not decoration. It is the running record of every decision you have made about what this café sells, rewritten between weeks in Priya's handwriting, and the player can walk up and read it at any time. Adding oat milk puts a line on it. Renaming the iced drink changes a word. Taking the delivery app puts a small logo in the corner, and building your own direct channel takes it off again and replaces it with a phone number. Nine weeks in, the board is a physical diff of your season.

The four-top by the window is the other half. It fills, thins and refills according to `regulars`, driven by C1, C8 and C9. Marcus is in the same chair every morning until he isn't.

Between them they do the thing the silent-tier contract needs: **feedback with no verdict attached.** The board says what you sell. The table says who is still here. Neither says "good" or "bad" and neither has to.

### 3.4 The season

Nine decisions map onto one season, and the room ages through it. Between weeks the screen does not cut away — the light shifts over about 1.2 seconds, ambient density changes, and Priya is mid-way through rewriting something when you look back at the board.

| Week | Competency                | Light                                       | Room temperature        |
| ---- | ------------------------- | ------------------------------------------- | ----------------------- |
| 1    | C1 · Problem Sensing      | late-spring morning, high and clean         | busy, easy              |
| 3    | C2 · Learning Agility     | the same, a shade warmer                    | busy                    |
| 5    | C3 · Courage to Commit    | first properly hot day, glare on the window | loud, street noise up   |
| 8    | C4 · Financial Discipline | **night** — the only closed-café beat       | silent, one lamp        |
| 10   | C5 · Strategic Thinking   | high summer, flat overhead light            | steady                  |
| 12   | C6 · Power & Influence    | late summer, long light through the glass   | quiet mid-morning       |
| 14   | C7 · People Management    | first grey day                              | tense, thin             |
| 16   | C8 · Value Creation       | autumn, low gold                            | steady                  |
| 18   | C9 · Perseverance         | late autumn, blue and short                 | depends entirely on you |

The week-8 night beat is the structural centrepiece: chairs up, machine cooling, no NPCs, the takings on the counter and nobody to perform for. It is the only time in the building you are alone, and it carries the money decision on purpose.

---

## 4. Art direction

**One line:** _warm, worn, and a little too small_ — a room that has been loved by other people before it was yours.

| Element            | Direction                                                                                                                                                                                                                                                         |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Palette**        | Burnt oak, oxblood tile, brass, cream plaster, chalk white. One cold accent only: the daylight through the window glass, which is deliberately bluer than everything else so the room reads warm by contrast. 18 colours total, derived from the shared city LUT. |
| **Materials**      | Matte everywhere except three surfaces — the espresso machine (brushed steel), the counter top (worn lacquer), and the window glass. Specular is a storytelling budget here; spend it on the machine, because the machine is a character.                         |
| **Wear**           | Every horizontal surface has a story. Ring marks on the counter. A chip in the tile by the door. The four-top's varnish worn pale where forearms go. This is texture work, not geometry — one shared wear overlay.                                                |
| **Key light**      | From the window, low and warm, angled so it lands across the floor and clips the counter edge. The chalkboard is deliberately in the shade so the chalk reads bright.                                                                                             |
| **Practicals**     | Three pendant bulbs over the floor (emissive cards, no point lights), the pastry case glow, the machine's group-head lamp. At night, only the pendant over the till.                                                                                              |
| **Silhouette**     | Low-poly, chamfered, no micro-detail (ADR-005 §16.2). Chairs are four planes and a back. The espresso machine gets the polygon budget nothing else does.                                                                                                          |
| **Negative space** | The floor is emptier than a real café. Deliberate — a first-person camera at walking pace needs more room than a photograph does, and a room you can move through cleanly feels better than a room that is accurate.                                              |

**Candidate CC0 sources** (each pending license audit before use — ADR-005 §16.1):

| Need                            | Candidate                                                   | License      |
| ------------------------------- | ----------------------------------------------------------- | ------------ |
| Room shell, counters, shelving  | Kenney _Retro Urban Kit_, _Mini Market_                     | CC0 (verify) |
| Tables, chairs, stools, lamps   | Kenney _Furniture Kit_                                      | CC0 (verify) |
| Cups, pastries, bottles, crates | Kenney _Food Kit_                                           | CC0 (verify) |
| Characters + shared rig         | Quaternius modular character packs                          | CC0 (verify) |
| Animation clip set              | Quaternius _Universal Animation Library_                    | CC0 (verify) |
| Espresso machine (hero prop)    | **Bespoke** — kitbash from kit parts, one artist, one batch | n/a          |

The espresso machine, the chalkboard and the pastry case are the three hero props and are worth building rather than borrowing. Everything else is kit.

---

## 5. The cast

Six named characters. **Never more than four present at once** (ADR-005 §15 caps skinned meshes at six on screen; ambient customers eat the rest of the budget).

### 5.1 Priya Raman — head barista

- **Who.** 26. Been here three years, longer than you. Fast hands, dry mouth, notices everything and comments on about a fifth of it. She is the best thing about this café and she knows it, which is not the same as being difficult.
- **Look.** Apron over a plain tee, sleeves pushed up, hair tied back and losing. Warm skin tones, one bright element (a green band on the wrist) so she reads instantly across the room.
- **Anchor.** At the machine, `z_behind`. Rarely leaves it. Patrol: machine → grinder → counter end → machine.
- **Animation.** `work` (default, at the machine), `wipe`, `talk`, `listen`, `lean` (against the back bar when something's wrong).
- **Voice.** Short sentences. Understatement. She asks questions she already knows the answer to, as a courtesy. _"So is that good or not?"_ _"We keeping the almond?"_
- **Carries.** C2 (the iced drink she championed to the team on your say-so), C7 Level A (she is the one arriving late), C4's aftermath, and the end-of-journey letter.
- **Gaze.** `player_near`. She looks up when you come behind the counter, every time. It is a two-frame effect that does more for presence than anything else in the building.

### 5.2 Tomas Bergström — second barista

- **Who.** 30s. Brilliant on the bar and genuinely faster than Priya on a rush. Also the reason the rota is a running argument. In Level A he is background; in Level B he is the high performer whose presence is costing you the rest of the team.
- **Look.** Same apron, worn differently. Taller, broader, takes up more space than the room has.
- **Anchor.** The grinder end of the counter. Patrol: grinder → pass-through → grinder.
- **Animation.** `work`, `lean`, `talk_emphatic`, `turn`.
- **Voice.** Confident, faintly amused, does not think he is being difficult. _"I moved my Thursday. It's fine — I cleared it."_
- **Carries.** C7 Level B.

### 5.3 Marcus Ofori — the regular

- **Who.** Late 60s, retired, in at 7:40 every morning without exception until the morning he isn't. Four-top by the window, newspaper, one long black, occasionally a second. He has been coming here longer than you have owned it.
- **Look.** Coat he never takes off. Reading glasses. The most static silhouette in the room, which is the point — you notice when the chair is empty.
- **Anchor.** T3, seated. Never patrols.
- **Animation.** `sit_read`, `sit_look`, `talk` (seated), `stand_leave`.
- **Voice.** Unhurried. Says the true thing without any weight on it, which is why it lands. _"It's a bit different, isn't it. The coffee."_
- **Carries.** C8 (he is the one who notices the beans) and C9 (he is the one who tries the new place).
- **The rule:** Marcus's presence is bound to `regulars`. `full` → in his chair. `thin` → chair empty, coat gone. `returning` → back, and he says nothing about having been away, which is worse and better.

### 5.4 Nadia Haddad — the commuter

- **Who.** Early 30s, in at 8:05, always slightly late, always takeaway. Polite, brisk, has somewhere to be. She has been buying her second coffee somewhere else for six weeks and has not mentioned it.
- **Look.** Coat, bag, phone in hand. Moves fast. Never sits — she is a silhouette at the till, which makes the C1 conversation feel stolen from her morning.
- **Anchor.** The till, `z_floor` side. Enters, orders, leaves.
- **Animation.** `stand_wait`, `talk`, `check_phone`, `walk`.
- **Voice.** Friendly and compressed. Says the important thing on her way out the door. _"You still don't do oat, do you?"_
- **Carries.** C1 (the dairy-free ask that is really an exit signal) and C5 (she has been ordering through the app).

### 5.5 Ray Delacroix — the food truck

- **Who.** 40s, runs a loaded-fries truck two streets over and wants your kerb on weekends. Loud, warm, entirely straight with you — he is not a villain, he is a man with a truck and a proposal. In Level B he doubles as your supplier's rep with a bulk offer that expires today.
- **Look.** Cap, forearms, a clipboard he does not need.
- **Anchor.** Appears first at the window (visible from inside before he comes in — a staging trick worth stealing for other buildings), then at the door, then at the counter.
- **Animation.** `talk_emphatic`, `lean_counter`, `gesture_outside`.
- **Voice.** Fast, generous, a closer's rhythm. _"Your crowd, my fries, Saturday. Tell me what's wrong with that."_
- **Carries.** C3.

### 5.6 Ellery Fitch — the office buyer

- **Who.** The office manager from the block behind you. Wants weekly coffee for their meetings and wants it at 40% off. In Level B she is the corporate account whose terms would tie up a year of your capacity at nearly no margin, and who mentions, pleasantly, that she has other options.
- **Look.** Laptop bag, lanyard, sits down before she's asked. Cooler palette than anyone else in the room — she is the one character lit slightly wrong for the café, on purpose.
- **Anchor.** T3, the four-top — she takes Marcus's table, which nobody mentions and everybody notices.
- **Animation.** `sit_laptop`, `sit_talk`, `sit_lean_back`.
- **Voice.** Warm, precise, entirely comfortable with silence. Her pressure is never raised.
- **Carries.** C6.

### 5.7 Ambient customers

Three unnamed skins on a shared loop: enter → queue → order (mimed at the till) → sit or leave. Density is bound to `regulars` and to the week. They never speak lines the player must read; they produce room noise and bodies, and their job is to make the room feel like it exists when nothing is being asked of you.

---

## 6. Ambient life

The liveliness budget for this interior, enforced in the frame loop (ADR-005 §15).

| Beat                         | Interval       | Notes                                                                                                                                                       |
| ---------------------------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Espresso machine steam       | 8–20 s         | Only while an NPC is at the machine. Audio + a short particle puff.                                                                                         |
| Grinder burr                 | 30–60 s        | Loud enough to duck conversation for 1.5 s — used deliberately as a beat before a hard line.                                                                |
| Door bell + customer         | 25–45 s        | Density scales with `regulars` and week. Street audio swells for 2 s while the door is open.                                                                |
| Cup on saucer                | 12–30 s        | Positional, from wherever a customer is sitting.                                                                                                            |
| Priya wipes / restacks       | 40–90 s        | Idle variation so she is never a statue.                                                                                                                    |
| Marcus turns a page          | 45–120 s       | Only when `regulars` is `full` or `returning`.                                                                                                              |
| Pigeon on the window ledge   | 90–180 s       | Rare. A callback to the city billboard's _"the pigeons remain unbothered."_ Continuity is cheap and people love it.                                         |
| Street traffic through glass | continuous bed | Crossfaded from the Market Street district bed on entry — the city audio does not stop, it goes muffled, which is exactly what walking indoors sounds like. |

**Reduced motion / low-spec** (ADR-005 §14.5): the pigeon, the steam particles and the customer loop drop to a third; Priya and Marcus become stationary; the grinder and bell remain because they are informational.

**Audio.** Room tone (warm, small, slightly boxy), a low instrumental bed, the machine, the street. All CC0, all logged. **Open item:** a CC0 bed with the right warmth is the hardest asset to source here; the fallback is room tone only, which is honestly not worse.

---

## 7. Player presence

- **Spawn:** behind the counter at the till, facing the door. Eye height 1.65 m, FOV 65°.
- **Movement:** walking pace only. The room is 9 m across; the whole point is that you cannot get away from anything in it.
- **Interactables:** the chalkboard (read), the community board (read), the window (look out — the street, the truck, the rival's awning), the pass-through (the private corner), the till drawer (week 8 only), and each NPC.
- **Prompts:** a diegetic floating DOM prompt anchored in world space, appearing within 1.4 m. Priya's prompt is her name; the chalkboard's is _"read the board"_. Never _"Press E to interact with object_04"_.
- **Guided navigation** (ADR-005 §14.2): six stations plus four NPCs in the tab list, labelled in the room's own words — _the till_, _the machine_, _by the window_, _the regulars' table_, _the pass-through_, _the board_.
- **Exit:** the door. Always available, never blocked, and leaving mid-decision autosaves at the seed choice and resumes at the follow-up.

---

## 8. The scenario spine

Every decision is staged. None of them arrive as a question on a card — someone brings it to you, or the room does.

| Wk  | Comp                        | Station          | Who brings it         | The staging                                                                                                                                                         |
| --- | --------------------------- | ---------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **C1** Problem Sensing      | `st_till`        | Nadia                 | She orders, pauses, and asks on her way out. It is the third time this week. Priya says nothing, which is Priya saying something.                                   |
| 3   | **C2** Learning Agility     | `st_bar`         | Priya                 | Two weeks into the iced drink you told the team to get behind. She has the numbers written on the back of a docket and has been waiting for you to ask.             |
| 5   | **C3** Courage to Commit    | `st_window`      | Ray                   | You see the truck pull up outside before he comes in. He wants an answer tomorrow. It is the hottest day of the year and the street is full.                        |
| 8   | **C4** Financial Discipline | `st_till_night`  | **nobody**            | 22:30. Chairs up, machine cooling, one lamp. The month's takings are on the counter. It is August, and you know what September looks like.                          |
| 10  | **C5** Strategic Thinking   | `st_board`       | Nadia (offhand)       | There is a delivery-app promo card pinned to the community board that you did not pin. Nadia mentions she's been ordering through it. She means it as a compliment. |
| 12  | **C6** Power & Influence    | `st_table_4`     | Ellery Fitch          | She's taken Marcus's table. Laptop open. She has a number in mind and has already decided how reasonable it sounds.                                                 |
| 14  | **C7** People Management    | `st_passthrough` | Priya / Tomas         | First grey day. The floor is thin. This is the only conversation in the season that happens out of earshot, and the room's audio mix says so.                       |
| 16  | **C8** Value Creation       | `st_counter_end` | the supplier's sample | A bag of the cheaper beans on the counter end, and a price on the invoice that would solve this month. Marcus is in his chair behind you, reading.                  |
| 18  | **C9** Perseverance         | `st_window`      | the street            | A new awning across the road. Two of your regulars are in there, visible through two panes of glass. Marcus's chair is empty for the first time.                    |

**Pacing.** Between weeks: a 1.2 s light transition, an ambient density change, and one visible world-state change applied. The player is then free — they can walk, read the board, look out of the window, talk to whoever is in — and the next decision triggers on approach to its station, never on a timer. Nobody is ever rushed into a decision by the game; the _fiction_ applies the pressure.

---

## 9. Decision content

### 9.1 How to read this section

Each decision is a two-beat tree (ADR-005 §9.2): a seed with three choices, then a **branch-specific** follow-up with three more. Nine leaves. The tier of each choice is recorded in §10 and appears **nowhere** in shipped client content.

Choice letters are shuffled per activity so that position never correlates with tier (ADR-005 §11.4 rule 5). The shuffle is recorded in the tier map in §10.3 and nowhere else.

### 9.2 Rewrites of the source blueprint

The source blueprint contains phrasings that mark the weak option, which violates the plausible-peers rule. These are rewritten here, and the rewrite is the shipping text.

| Where | Source phrasing                                                                | Problem                                                   | Shipping text                                                                                                                                       |
| ----- | ------------------------------------------------------------------------------ | --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| C4-A  | "Buy the upgraded espresso machine — you earned it, and it'll impress people." | "You earned it" is the author judging the player          | "Replace the machine. It's the oldest thing in the room, it's the thing everything else runs through, and a good month is exactly when you fix it." |
| C5-A  | "Sign up — more orders is more orders."                                        | Too short, glib; marks itself                             | "List with them. Reach you can't buy is worth a cut you don't like, and every order is an order you weren't getting."                               |
| C6-A  | "Give the discount — a steady bulk order is worth it."                         | Too short                                                 | "Take the 40%. A standing weekly order is the only predictable revenue in this building, and predictable is worth paying for."                      |
| C8-A  | "Switch to the cheaper beans — customers probably won't notice."               | "Probably won't notice" frames it as deceit               | "Take the cheaper beans. The difference is real in a cupping room and nearly invisible under milk, and the margin is what keeps the lights on."     |
| C9-A  | "Quickly drop your prices to win the regulars back fast."                      | "Quickly" and "fast" mark it as reactive                  | "Cut prices while they're still deciding. Habit is the whole business at this size, and habit is cheapest to defend before it breaks."              |
| C3-A  | "Decline — it's too risky to commit without knowing the impact."               | Short; hedged where others are confident                  | "Say no. You'd be handing your Saturday lunch trade to a man with a fryer, and you can't model what that costs until it's already gone."            |
| C9-B  | "Make a bold, fast pivot to counter them before you lose more."                | "Bold, fast" is author praise attached to the weak option | "Move first and move big. Three weeks of decline is a trend, and the worst thing you can do against funded competition is nothing."                 |

**General rule applied throughout:** every option carries its own justification and is written by someone who believes it — and choice length is held to parity, because it is the tier leak nobody looks for.

The first draft of this document failed that. Measured across all 69 choices, the Advanced options ran systematically longer than their peers (worst trio: 25 / 9 / 19 words), which makes _"pick the longest option"_ a partial strategy with no tier vocabulary involved. Every trio was rewritten. The shipping content measures **13–33 words, median 23, and no trio spread above 8 words** — the numeric rule now recorded in [ADR-005 §11.4](ADR-005_Interior_Framework.md). It is checked by script (§18.3), not by eye.

---

### 9.3 Exemplar A — `C1-HARD-01` · "The Dairy-Free Question" (Level A, fully worked)

**Station** `st_till` · **Host** Nadia · **Week 1**

> **Stage.** 8:05. The bell goes. Nadia's already reaching for her card before she's at the counter, the way she is every morning. She orders, then stops halfway through putting her phone away.
>
> **Nadia:** _"You still don't do oat, do you?"_
>
> It's the third time this week someone's asked. Behind you, Priya doesn't say anything, which is Priya's way of saying something. There's enough in the till for one move this month.

**Seed choices**

|       | Text                                                                                                                                                      |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **a** | "Chalk a card and prop it by the till — _Oat milk? Should we?_ — and see how many people actually react over two days."                                   |
| **b** | "Order oat and almond this week. People are telling you what they want, and in a shop this size the one who moves first wins."                            |
| **c** | "Ask Nadia — and the others who've asked — what they'd actually do if you had it. Find out whether it's a nice-to-have or the reason they'd stop coming." |

**Seed consequences**

- **a** — _You prop the card by the till. Over two days eleven people tap it and three write their names underneath in Priya's chalk. You order one crate of oat with a number in your head instead of a hope._ → `chalkboard: oat_asked`
- **b** — _Two crates arrive Thursday. The oat moves. Three weeks later you find the almond behind the fridge, unopened, four days past date. You bought what people said, not what they'd pay for._ → `chalkboard: oat_plus`, `till: tight`
- **c** — _Nadia tells you she gets her second coffee at the place by the station three mornings a week, because they do oat and you don't. Two others say the same thing without being asked. It was never really about milk._ → `regulars: thin`

**Follow-up — branch a** _(you tested first)_

> The crate arrives. Oat sells — nine cups, then eleven, then seven. Not the flood the card suggested. Priya, wiping down: _"So is that good or not?"_

|       | Text                                                                                                                                               |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| **a** | "Eleven people said yes to a card and nine actually bought. Use the gap between those two numbers to calibrate the next test, not the next order." |
| **b** | "Nine cups a day is nine cups a day. Bring the almond in too and give the whole range a fair run before judging any of it."                        |
| **c** | "Hold at one crate a week, leave the card up another fortnight, and let the reorder rate make the call instead of you."                            |

**Follow-up — branch b** _(you ordered both)_

> The almond's a write-off and the till is thinner than it should be in a good month. Priya, not looking up: _"We keeping the almond?"_

|       | Text                                                                                                                                                          |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **a** | "Keep both on. Pulling something a fortnight after adding it makes the place look like it doesn't know what it is."                                           |
| **b** | "Cut the almond, and spend the afternoon finding out what the oat buyers actually came in for. The crate's already lost — it should at least buy the answer." |
| **c** | "Drop the almond, keep the oat, and from now on reorder against what sold last week rather than what you hoped would sell."                                   |

**Follow-up — branch c** _(you asked, and found the real reason)_

> You know now: it's the commuters, and it's the station café. Priya's already worked out what you're going to say. _"So do we chase them, or do we not?"_

|       | Text                                                                                                                                         |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| **a** | "Bring oat in and aim the whole morning at commuters — faster service, a takeaway price, out of the door in ninety seconds."                 |
| **b** | "Oat, yes. But the thing you're actually fixing is the 7:50-to-8:20 window. Time the queue for a week, then design that half hour properly." |
| **c** | "Match the station café properly — oat, soy, all of it — so there's nothing left worth walking down the road for."                           |

**Leaf consequences** (abbreviated; full prose in `script.ts`)

Each leaf resolves in the room within 4–6 seconds: a line from Priya, one world-state change, and — where earned — one staged beat. Examples: `c.b` ends with Priya writing **7:50 – 8:20** on the corner of the chalkboard and leaving it there for the rest of the season, which the player will notice again in week 10.

---

### 9.4 Exemplar B — `C4-PRO-01` · "The Good Month" (Level B, fully worked)

**Station** `st_till_night` · **Host** none · **Week 8**

> **Stage.** 22:30. Chairs up, machine cooling and ticking as it goes. One pendant on over the till. The month's takings are stacked on the counter in front of you — the best four weeks since you took the place on.
>
> It's also August. You've run this room long enough to know what September looks like.

**Seed choices**

|       | Text                                                                                                                                                                                                |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **a** | "Treat the month as weather, not climate. Work out what this place costs to run through a bad October, ring-fence exactly that, and invest only what could vanish without touching anyone's wages." |
| **b** | "Cover the slow stretch first — a realistic number, not a comfortable one — then put whatever's left behind the single thing that earns the most back."                                             |
| **c** | "Put it to work while it's working. Momentum is the hardest thing to buy and the easiest thing to lose; a good month is when you extend, not when you sit on it."                                   |

**Seed consequences**

- **a** — _You write two numbers on the back of a receipt: what a bad October costs, and what's left over. The second number is small. You spend it on the grinder, which was going anyway, and go home._ → `till: healthy`
- **b** — _You take last year's slow-season number, add a fifth, and put it aside. What's left goes on the loyalty cards Priya's been asking about for a year. It isn't exciting. It's the kind of decision nobody ever notices._ → `till: healthy`, `staff: trusting`
- **c** — _You commit to the second machine and the extra weekend hours. For three weeks it feels like the right call. Then the schools go back, the mornings thin, and you're carrying a payment on a machine that's cold by eleven._ → `till: strained`, `machine: upgraded`

**Follow-up — branch a** _(you ring-fenced properly)_

> October comes in worse than your bad-October number — not catastrophically, about a fifth worse. The reserve holds, but it is visibly draining, and Priya has started asking, carefully, whether her hours are safe.

|       | Text                                                                                                                                                                  |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **a** | "Tell her the truth with a number in it: how many weeks the reserve covers at this rate. Then trim what can be trimmed without touching hours."                       |
| **b** | "Reassure her it's fine and keep the number to yourself until you have to share it. Worrying the team about a month that might still turn is its own kind of damage." |
| **c** | "Say plainly how far the reserve goes — then give October a job. Use the quiet mornings for the 7:50 window you've never had time to fix."                            |

**Follow-up — branch b** _(you covered the season and invested the rest)_

> October undershoots your reserve by about a fortnight's worth. The loyalty cards are working — but slowly, and slowly is not what a fortnight short needs.

|       | Text                                                                                                                                                              |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **a** | "Push the loyalty scheme harder. Double the stamps for a month and buy the traffic back while there's still a scheme to push."                                    |
| **b** | "Separate the two problems. Fund the fortnight from something reversible, and let the loyalty scheme run on its own timeline instead of asking it to rescue you." |
| **c** | "Trim a fortnight of hours by agreement, close an hour earlier on the dead days, and protect the reserve rather than the schedule."                               |

**Follow-up — branch c** _(you spent it)_

> The machine payment lands on the 3rd. The takings don't. For the first time since you took this place on, you are short.

|       | Text                                                                                                                                                         |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **a** | "Name it out loud, to Priya and to the supplier, before either works it out alone — then restructure the payment while you still have credibility to spend." |
| **b** | "Go to the supplier for terms and cut every single cost that isn't the coffee or the wages. This week, not next month."                                      |
| **c** | "Trade through it. A tight month is a tight month, and the machine pays for itself the moment the mornings come back."                                       |

---

### 9.5 The remaining sixteen trees — seed layer and follow-up specification

The seed layer below is the shipping text (post-rewrite). The follow-up branches are specified by **prompt and tier intent**; the leaf prose is authored against the rules in ADR-005 §11.4 and reviewed under §11.5.

#### C2 · Learning Agility

**Level A — `C2-HARD-01` "The Iced Drink"** · `st_bar` · Priya · Week 3

> Two weeks in. Priya has the numbers on the back of a docket and has clearly been waiting for you to ask.

- Ask the people who walked past it why they didn't order, then change the recipe on what they tell you.
- Keep pushing it. A drink that's this good takes a month to find its people, and pulling it early kills things that would have worked.
- Change exactly one thing — the price or the name — for a week, and let the difference decide it.

_Follow-ups:_ **branch "asked customers"** → they say it's too sweet; do you fix the recipe and stop there, keep asking, or turn the finding into a habit? · **branch "kept pushing"** → a month gone, still flat; hold, quietly drop, or admit it to the team and rebuild? · **branch "one change"** → it lifted, but you changed price and name in the same week by accident; re-run clean, keep the win, or generalise the method?

**Level B — `C2-PRO-01` "The Drink You Championed"** · `st_bar` · Priya + Tomas · Week 3

> You told the team to get behind it. They did. It isn't working, and they are watching to see what you do about having been wrong.

- Run one clean test: change a single variable, measure it, and decide the keep-or-cut threshold before you look at the result.
- Hold the line. Reversing a fortnight after you asked the team to commit teaches them that your decisions are weather.
- Put the numbers on the counter in front of the team, ask them why they think it's missing, and change it on what they say.

_Follow-ups:_ branch-specific, each turning on **whether the test was designed before or after the data** — the deepest form of the competency and the thing the follow-up exists to catch.

#### C3 · Courage to Commit

**Level A — `C3-HARD-01` "The Truck"** · `st_window` · Ray · Week 5

> The hottest day of the year. Ray's truck is at the kerb before he is at the door. He needs an answer tomorrow.

- Yes, but structured: you sell the drinks, he sells the food, and you split a combo so both sides have a reason to send people across.
- Say no. You'd be handing your Saturday lunch trade to a man with a fryer, and you can't model what that costs until it's already gone.
- Yes to a month, with a date in the diary to look at the numbers together and a clean way out if it isn't working.

_Follow-ups:_ **"structured"** → his crowd is big but buys almost no coffee; renegotiate, ride it out, or redesign the combo? · **"declined"** → he parks outside the rival and takes the crowd with him; approach him, hold, or counter-programme? · **"one-month trial"** → the check-in date arrives with ambiguous numbers; extend, exit, or make the criteria explicit before extending?

**Level B — `C3-PRO-01` "Thirty Per Cent"** · `st_counter_end` · Ray (as supplier rep) · Week 5

> A bulk offer at 30% off, placed today or not at all. The saving is real. It would take most of your spare cash, and you have no idea what the quarter after next looks like.

- Pass. Tying that much cash to a forecast you don't have is the kind of risk that only looks smart in hindsight.
- Model your worst-case cash position honestly. If you'd survive it, take the whole deal and lock the saving in.
- Take a smaller order now with an option on the rest later — most of the discount, a fraction of the exposure.

#### C4 · Financial Discipline

**Level A — `C4-HARD-01` "The Good Month"** · `st_till_night` · none · Week 8

> Same staging as §9.4, smaller stakes and shorter horizon.

- Replace the machine. It's the oldest thing in the room, it's what everything runs through, and a good month is exactly when you fix it.
- Put most of it aside as a cushion and spend a little on the one thing customers have actually asked for.
- Back the single spend most likely to bring the same people through the door again next week, and leave the rest where it is.

**Level B — `C4-PRO-01`** — fully worked in §9.4.

#### C5 · Strategic Thinking

**Level A — `C5-HARD-01` "The App"** · `st_board` · Nadia (offhand) · Week 10

> A promo card on the community board you didn't pin. Nadia mentions she's been ordering through it. She means it kindly.

- Do the arithmetic on their cut first, then lift delivery prices enough to come out where you started.
- List with them. Reach you can't buy is worth a cut you don't like, and every order is an order you weren't getting.
- Use it to get found, then give every delivery bag a reason to order direct next time.

**Level B — `C5-PRO-01` "Forty Per Cent of You"** · `st_board` · Week 10

> The app now drives 40% of your orders. They've just raised the commission. Leaving costs you that volume overnight; staying costs you the margin. Whatever you decide today, you'll be living inside for two years.

- Absorb it. You cannot walk away from 40% of your orders on principle.
- Renegotiate, or price the app channel separately, and start nudging your repeat customers toward ordering direct.
- Build the direct channel properly, so that no single platform is ever again in a position to reprice you.

#### C6 · Power & Influence

**Level A — `C6-HARD-01` "Forty Off"** · `st_table_4` · Ellery Fitch · Week 12

> She's taken Marcus's table. Laptop open, coffee she bought herself, a number already decided.

- Ask what they actually need before you talk price, then build a package that serves it at a number that still works for you.
- Take the 40%. A standing weekly order is the only predictable revenue in this building, and predictable is worth paying for.
- Offer a smaller discount, tied to a minimum weekly order and a commitment up front, so the price you give matches the certainty you get.

**Level B — `C6-PRO-01` "The Account"** · `st_table_4` · Ellery Fitch · Week 12

> Steady revenue, a year's commitment, and terms that would leave you working at roughly nothing. She mentions, pleasantly, that she has other options.

- Meet the terms. Predictable revenue at thin margin still beats an empty diary.
- Hold the price and give ground on what costs you least — delivery windows, packaging, invoicing — and let them choose.
- Find out what they actually value, rebuild the deal around it, and be genuinely willing to walk.

#### C7 · People Management

**Level A — `C7-HARD-01` "Late"** · `st_passthrough` · Priya · Week 14

> First grey day. She's been late four times in two weeks and it's landing on everyone else. The pass-through is the only place in this room where a conversation stays between two people.

- Talk to her privately first, find out what's actually going on, and agree a fix together.
- Give a clear warning. Lateness that goes unaddressed in a team this size becomes everyone's lateness inside a month.
- Ask, listen, and deal with both the behaviour and its cause — adjust what you can support without moving the standard.

**Level B — `C7-PRO-01` "The Best One"** · `st_passthrough` · Tomas + Priya · Week 14

> Tomas is the fastest pair of hands you have and the reason two other people are miserable. Cracking down risks losing him. Not cracking down risks losing them.

- Back the performer. Results carry a small business, and the rest of the team adjusts to reality faster than they admit.
- Deal with the behaviour directly with him, and protect morale by being open with everyone else about what you're doing.
- Set one standard that applies to everybody, coach him toward it, and accept that holding it might cost you him.

#### C8 · Value Creation & Credibility

**Level A — `C8-HARD-01` "The Sample Bag"** · `st_counter_end` · the supplier's sample · Week 16

> A bag of the cheaper beans on the counter end and a number on the invoice that would fix this month. Marcus is in his chair behind you, reading.

- Keep the beans you use and start telling people why — put the roaster's name on the board and make the sourcing part of what this place is.
- Take the cheaper beans. The difference is real in a cupping room and nearly invisible under milk, and the margin is what keeps the lights on.
- Stay with the beans you use, absorb the thinner margin this month, and say nothing about it to customers or to the supplier.

**Level B — `C8-PRO-01` "The Quiet Cut"** · `st_counter_end` · Week 16

> There is a reduction you could make that this quarter needs and almost nobody would notice for a while.

- Make it. The numbers need it, the difference is marginal, and a quarter you survive is worth more than a principle you can't afford.
- Protect the quality and find the money somewhere harder — the rent, the hours, the two things on the menu nobody orders.
- Refuse it, and turn the standard into something people can see — build the kind of reputation that outlives any single quarter's numbers.

#### C9 · Perseverance & Adaptability

**Level A — `C9-HARD-01` "The New Awning"** · `st_window` · the street · Week 18

> A new café across the road, open a fortnight. Through two panes of glass you can see two of your regulars sitting in it. Marcus's chair is empty for the first time since you took this place on.

- Cut prices while they're still deciding. Habit is the whole business at this size, and habit is cheapest to defend before it breaks.
- Stay steady. Ask your regulars what they actually come here for, and then put everything you have into that one thing.
- Treat it as information. Work out what the new place does genuinely well, work out what you do that they can't, and compete on that.

**Level B — `C9-PRO-01` "Three Weeks Down"** · `st_window` · Week 18

> Well-funded competition, three straight weeks of decline, staff who have started reading the room, and cash that is tightening. This is the third hard stretch this year.

- Move first and move big. Three weeks of decline is a trend, and the worst thing you can do against funded competition is nothing.
- Steady the team, find out what is actually causing the drop, and adjust tactics without abandoning the direction.
- Absorb it. Work out precisely what to hold and what to change, and use the pressure to make both the business and yourself harder to move.

---

## 10. Registry binding

### 10.1 Activity IDs and subtopics

Building slot **01** (ADR-005 §10.5). Subtopics are **authored to fit the decision**, not mechanically rotated; the allocation is coordinated across buildings by the registry maintainer so every subtopic lands exactly twice per competency-level.

| Competency              | Level A id   | Level B id  | Subtopic                 | Title                             | Why this subtopic                                                                  |
| ----------------------- | ------------ | ----------- | ------------------------ | --------------------------------- | ---------------------------------------------------------------------------------- |
| C1 Problem Sensing      | `C1-HARD-01` | `C1-PRO-01` | `empathy_pain`           | The Dairy-Free Question           | The Advanced path is finding out what the request actually costs the person asking |
| C2 Learning Agility     | `C2-HARD-01` | `C2-PRO-01` | `experimentation`        | The Iced Drink                    | Both tracks turn on whether a test was designed or improvised                      |
| C3 Courage to Commit    | `C3-HARD-01` | `C3-PRO-01` | `smart_vs_reckless_risk` | The Truck / Thirty Per Cent       | Level B is literally "stress-test the worst case, then commit"                     |
| C4 Financial Discipline | `C4-HARD-01` | `C4-PRO-01` | `cash_flow`              | The Good Month                    | A seasonal spike misread as growth is the canonical cash-flow error                |
| C5 Strategic Thinking   | `C5-HARD-01` | `C5-PRO-01` | `scenario_thinking`      | The App                           | "Today's call shapes the next two years" is the definition                         |
| C6 Power & Influence    | `C6-HARD-01` | `C6-PRO-01` | `negotiation`            | Forty Off / The Account           | Direct                                                                             |
| C7 People Management    | `C7-HARD-01` | `C7-PRO-01` | `feedback`               | Late / The Best One               | The mechanism in both tracks is the honest conversation, held or avoided           |
| C8 Value Creation       | `C8-HARD-01` | `C8-PRO-01` | `quality_craftsmanship`  | The Sample Bag / The Quiet Cut    | The decision is literally about the product                                        |
| C9 Perseverance         | `C9-HARD-01` | `C9-PRO-01` | `adaptability_pivoting`  | The New Awning / Three Weeks Down | The Advanced path is adapting without abandoning                                   |

`type: "DECISION_TREE"` · `orderIndex: 1` · `estMinutes: 6` · `passCriteria: { "minProficiency": 2 }` for all eighteen.

### 10.2 Cross-building subtopic ledger

After the three launch buildings, per competency, three subtopics are used once and three are free. The remaining nine buildings must fill exactly nine slots: one more of each used subtopic, and two each of the free ones.

| Comp | Café (01)              | MERIDIAN (02)        | MAISON (03)                | Still free (×2 each)                                             |
| ---- | ---------------------- | -------------------- | -------------------------- | ---------------------------------------------------------------- |
| C1   | empathy_pain           | root_cause           | good_questions             | observation · spotting_gaps · prioritizing_problems              |
| C2   | experimentation        | updating_beliefs     | learning_from_feedback     | curiosity · transfer · reflection                                |
| C3   | smart_vs_reckless_risk | deciding_uncertainty | saying_no_opportunity_cost | overcoming_fear · commitment_followthrough · accountability      |
| C4   | cash_flow              | budgeting            | roi                        | needs_vs_wants · profit_loss · pricing                           |
| C5   | scenario_thinking      | systems_thinking     | tradeoffs                  | goal_setting_planning · prioritization · competitive_positioning |
| C6   | negotiation            | reading_people       | persuasion_storytelling    | clear_communication · alliances_networking · ethical_influence   |
| C7   | feedback               | conflict_resolution  | motivating_team            | collaboration · leadership_delegation · customer_empathy         |
| C8   | quality_craftsmanship  | trust_reputation     | real_value                 | branding_identity · delivering_promises · differentiation        |
| C9   | adaptability_pivoting  | handling_failure     | resilience                 | grit_persistence · stress_management · growth_mindset            |

### 10.3 Tier maps and rubrics

**Server-only. This table never ships to a client in any form.**

`C1-HARD-01`

| Node              | a          | b          | c          |
| ----------------- | ---------- | ---------- | ---------- |
| **seed**          | Strong     | Developing | Advanced   |
| follow · branch a | Advanced   | Developing | Strong     |
| follow · branch b | Developing | Advanced   | Strong     |
| follow · branch c | Strong     | Advanced   | Developing |

Terminals, computed as `0.6 × seed + 0.4 × follow` over `Developing 15 · Strong 60 · Advanced 95` (ADR-005 §10.1):

```jsonc
"rubric": {
  "kind": "trace",
  "terminals": {
    "C1-HARD-01.a.a": 74, "C1-HARD-01.a.b": 42, "C1-HARD-01.a.c": 60,
    "C1-HARD-01.b.a": 15, "C1-HARD-01.b.b": 47, "C1-HARD-01.b.c": 33,
    "C1-HARD-01.c.a": 81, "C1-HARD-01.c.b": 95, "C1-HARD-01.c.c": 63
  },
  "scoreMap": [
    { "minOutcome": 74, "proficiency": 3 },
    { "minOutcome": 42, "proficiency": 2 },
    { "minOutcome": 0,  "proficiency": 1 }
  ]
}
```

`C4-PRO-01`

| Node              | a          | b          | c          |
| ----------------- | ---------- | ---------- | ---------- |
| **seed**          | Advanced   | Strong     | Developing |
| follow · branch a | Strong     | Developing | Advanced   |
| follow · branch b | Developing | Advanced   | Strong     |
| follow · branch c | Advanced   | Strong     | Developing |

```jsonc
"terminals": {
  "C4-PRO-01.a.a": 81, "C4-PRO-01.a.b": 63, "C4-PRO-01.a.c": 95,
  "C4-PRO-01.b.a": 42, "C4-PRO-01.b.b": 74, "C4-PRO-01.b.c": 60,
  "C4-PRO-01.c.a": 47, "C4-PRO-01.c.b": 33, "C4-PRO-01.c.c": 15
}
```

The remaining sixteen tier maps are authored alongside their leaf prose and must satisfy: the three seed tiers are each used exactly once; each follow-up branch uses each tier exactly once; and the letter permutation differs from every other activity in the building. A generator script producing these permutations from a tier assignment is a framework utility, not building code.

### 10.4 Trace paths on the wire

```jsonc
// Player picked "ask Nadia" (c), then "fix the 7:50 window" (b) → 95 → P3 → 25 coins
{
  "result": {
    "trace": {
      "path": ["C1-HARD-01.seed", "C1-HARD-01.c", "C1-HARD-01.c.follow", "C1-HARD-01.c.b"],
    },
  },
}
```

Autosave via `PUT /progress/{id}/state` fires after the seed choice, carrying the partial path and the current world state.

---

## 11. Silent tier & reward

Everything in ADR-005 §11 applies. The Café-specific commitments:

**What the player sees after a decision.** The consequence plays in the room — a line, an animation, a world-state change — and then they are simply free to walk again. There is no result panel. There is no "next" button that implies a score was computed. The season moves on.

**The coin tick.** The existing `Celebration` coin-fly runs at the HUD, magnitude proportional, **with no text and no differentiated sound.** A player earning 5 and a player earning 25 see the same animation at different lengths and are told nothing about the difference. Over nine weeks the balance is noticeably different between a strong run and a weak one, and the player will feel that without ever being told it.

**No hint button.** The player shell suppresses it in scenario mode. There is nothing to hint at here that is not a tier leak.

**The one place the Café is tempted to cheat, and must not.** It is very tempting to have Priya say something warm after a good decision and something flat after a weak one. That is a verdict wearing an apron. Priya's reaction is driven by **world state**, not by tier — she is short with you when the till is tight, whatever decision made it tight. The distinction is the whole design and reviewers should look for it specifically.

---

## 12. World state

Ten keys. Every one maps to something the player can see.

| Key          | Values                                                                                                                          | Visible as                                                                                                         |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `chalkboard` | `base` · `oat_asked` · `oat` · `oat_plus` · `plant_full` · `iced` · `iced_renamed` · `combo` · `app` · `direct` · `beans_story` | The board above the counter, rewritten in Priya's hand between weeks                                               |
| `regulars`   | `full` · `steady` · `thin` · `returning`                                                                                        | Marcus present/absent; ambient customer density; how many chairs at T3 are pulled out                              |
| `till`       | `tight` · `healthy` · `strained`                                                                                                | The drawer's contents at week 8; Priya's idle animation (`work` vs `lean`); how fast she restocks                  |
| `staff`      | `easy` · `strained` · `trusting`                                                                                                | Priya's and Tomas's idle set and gaze frequency; whether the rota by the pass-through has pencil corrections on it |
| `truck`      | `absent` · `parked` · `gone_rival`                                                                                              | Ray's truck through the window, at your kerb or across the road                                                    |
| `machine`    | `old` · `upgraded`                                                                                                              | The hero prop's model variant, and its steam/noise cadence                                                         |
| `board`      | `clean` · `app_card` · `direct_card`                                                                                            | The community noticeboard by the door                                                                              |
| `beans`      | `good` · `cheap`                                                                                                                | The sack behind the counter; the colour of the crema in the cup Priya sets down                                    |
| `rival`      | `none` · `open` · `promo`                                                                                                       | The awning across the street, and whether it has a sandwich board out                                              |
| `season`     | `spring` · `summer` · `autumn` · `night`                                                                                        | The window light, driven by week rather than decisions                                                             |

**Rules.** Presentation only — none of these influence scoring, which is entirely the trace path. Persisted with the interior resume blob and, once BE-8 lands, across sessions so a returning player walks back into the café they made.

---

## 13. End-of-journey report — _"The Year at the Corner"_

**Unlock:** all nine competencies on the player's track are `COMPLETED` (ADR-005 §13).

**The object.** A letter, in an envelope, propped against the pass-through hatch where the rota usually is. Priya wrote it. Walking up to it opens a full-screen reader.

**The letter** (framing copy, ~200 words) recaps the season in Priya's voice, built from the world-state trail: which decisions the café is visibly still living with, what the board says now, whether Marcus is in his chair. Warm, unsentimental, no grading. She signs off with something about next year.

**Behind the letter**, on the same screen and scrolled to, is your own record — and this is the **only place** in the entire building where tier vocabulary appears:

1. **Nine competencies, nine tiers** — Developing / Strong / Advanced, each with its one-line meaning and the week it was decided.
2. **The consequence trail** — what you chose, what happened, in two lines per competency.
3. **Consistency** — the seed/follow-up shape made legible. _"In week 1 you found the real reason people were leaving, and then tried to match the station café on range rather than fixing the morning. You see clearly and then reach for the obvious move."_ This is the most useful sentence in the report and it comes directly from §10.2's arithmetic.
4. **Where to go next** — the two or three city buildings that draw hardest on your lowest competencies, named as places rather than as remediation.

**Tone.** No shame framing. Nothing is failed; some things are _not yet_. The report is a debrief from someone who worked the bar next to you all season, not a scorecard.

---

## 14. Level A vs Level B in this room

Same geometry. Same chalkboard. Different weight.

|                           | Level A (`HARD`, 16–21)                                                                                                              | Level B (`PRO`, 35–50)                                                                                                                          |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| **Framing**               | Your first place. The bank manager took a chance.                                                                                    | You've done this before, and that is why the flat six weeks worries you.                                                                        |
| **Threshold question**    | _"Is this your first place, or have you done this before?"_ — asked by Priya on first entry, once for the whole city (ADR-005 §10.7) | same                                                                                                                                            |
| **Cast at week 1**        | Priya, Marcus, ambient                                                                                                               | Priya, Tomas, Marcus, ambient — the staffing problem is in the room from the start                                                              |
| **Props added**           | —                                                                                                                                    | A supplier price-increase letter pinned by the pass-through; a second rota with corrections; the rival's awning **already visible** from week 1 |
| **Decisions**             | Fewer moving parts, shorter horizon, one clear pressure at a time                                                                    | Competing legitimate interests, irreversibility, and a second-order cost in every option                                                        |
| **Light**                 | Slightly brighter throughout                                                                                                         | One stop cooler; the night beat is darker and longer                                                                                            |
| **What "Advanced" means** | Finding the real problem behind the presenting one                                                                                   | Finding it, and being willing to pay what acting on it costs                                                                                    |

Level B is **not Level A with longer sentences.** The register is the same plain English; what changes is that in Level B every option has a defensible case and a real price, and the follow-up is where the price arrives.

---

## 15. Accessibility for this interior

All of ADR-005 §14 applies. Café-specific:

- **Guided navigation labels** use the room's own words: _the till · the machine · by the window · the regulars' table · the pass-through · the board_. Plus NPCs by name and role: _"Priya, head barista"_.
- **Live-region announcements** on entering each zone, on arriving at a station, on the chalkboard changing (_"Priya has rewritten the board"_ — the world-state change is announced, because a sighted player sees it and a blind player must too), and on the season/light shift.
- **The grinder duck** is an audio effect and must not be the only carrier of a beat — any line it precedes is also visible as text.
- **The pass-through privacy** is communicated in three channels: the audio ducks, the prompt text says _"out of earshot of the floor"_, and the live region announces the same.
- **Marcus's empty chair** — the single most important non-verbal beat in the building — is announced explicitly in week 18 (_"the four-top by the window is empty"_), because a consequence that only exists visually is a consequence half the audience never receives.
- **The night beat** (week 8) reduces light dramatically; contrast on all DOM text is unaffected (it is DOM), and the scene's minimum luminance is floored so the room never becomes unreadable for low-vision players.

---

## 16. Performance budget

Within ADR-005 §15. Café-specific targets:

| Metric               | Café target             | Notes                                                                                   |
| -------------------- | ----------------------- | --------------------------------------------------------------------------------------- |
| Triangles on screen  | ≤ 42 000                | Small room, generous headroom. The machine is ~4 000 of it and worth every one.         |
| Draw calls           | ≤ 60                    | Chairs, cups, bottles and pendants all instanced                                        |
| Unique materials     | ≤ 14                    | One wear overlay shared across all wood and lacquer                                     |
| Skinned characters   | ≤ 4 on screen           | Enforced by the staging table in §8 — the cast is never all present                     |
| Texture memory       | ≤ 64 MB                 | 1024 for the counter/machine/board; 512 for everything else                             |
| GLB bundle           | **≤ 4.5 MB** compressed | Under the 6 MB ceiling; the Café is the smallest building and should prove the pipeline |
| Enter / exit         | ≤ 0.8 s                 | Prefetched on approach from Market Street                                               |
| Ambient beats active | ≤ 8                     | §6 table                                                                                |

**Headroom is deliberate.** The Café is building 01 and the vertical slice; if it needs the full ceiling, the engine is wrong, not the café.

---

## 17. Asset checklist

Every line requires an `ASSETS_LICENSES.md` entry with source URL, author, license, commercial-use proof and date **before** work builds on it.

**Shell & architecture** — room shell, window wall + glass, door + frame + bell, ceiling, floor tile, wall plaster, back-bar shelving, pass-through hatch.
**Counter run** — counter body, worn top, till, pastry case (+ contents), grinder, **espresso machine (hero, bespoke)**, sink end, bean sacks (2 variants for `beans`).
**Furniture** — two-top ×2, four-top, high two-top, chairs ×6, stools ×2, pendant lamps ×3.
**Signage & paper** — **chalkboard (hero, 11 text variants)**, community noticeboard (+ 3 card variants), rota sheet (2 variants), supplier letter, the report envelope.
**Dressing** — cups, saucers, takeaway cups, milk jugs, bottles, newspaper, crates, cloths, plant, coat hooks.
**Characters** — shared rig + 6 skins (Priya, Tomas, Marcus, Nadia, Ray, Ellery) + 3 ambient skins.
**Animation** — the shared 12-clip set (ADR-005 §16.3) plus three Café-specific: `sit_read`, `lean_counter`, `wipe`.
**Street (through glass)** — a low-detail exterior card: kerb, opposite shopfronts, the rival awning (2 states), Ray's truck.
**Audio** — room tone, instrumental bed _(hardest to source — see §6)_, espresso machine group + steam, grinder, door bell, street bed (muffled), cup/saucer, chair scrape, page turn, pigeon.

---

## 18. Phases, acceptance, testing, risks

### 18.1 Phases

| Phase     | Deliverable                                                                                                 | Gate                                                                                                   |
| --------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| **CAF-0** | Gray-box room: correct dimensions, collision, spawn, four zones, six stations, guided nav                   | Walk the room in first person with a mouse and without one, at 30 fps on the reference laptop          |
| **CAF-1** | Priya + Marcus, ambient loop, audio bed, chalkboard and regulars' table wired to world state                | The room feels inhabited when nothing is being asked of you — assessed by someone who did not build it |
| **CAF-2** | `C1-HARD-01` and `C4-PRO-01` end to end: staging → seed → consequence → follow-up → submit → world reaction | A real registry activity, server-scored, with **no tier visible anywhere on screen**                   |
| **CAF-3** | All nine competencies × both tracks; full cast; the season light progression                                | A complete nine-week journey in one sitting                                                            |
| **CAF-4** | The report; a11y pass; perf pass; asset licenses complete                                                   | A keyboard-only player completes a full journey and reads their letter                                 |

### 18.2 Acceptance criteria

1. **Plausible-peers audit passes.** A reviewer who did not write the content reads all 54 seed choices and 162 leaves with tiers covered and cannot reliably identify the weak option. _Blocking._
2. **Tier-leak audit passes.** No proficiency number, pass/fail phrasing, tier word, ranking affordance or comparative coin commentary appears anywhere outside §13's report. _Blocking._
3. **Registry validates.** `go run ./cmd/validate_registry -competency=Cn` passes for all nine with the Café rows present; every rubric parses; every terminal set has nine entries matching the ADR-005 §10.1 arithmetic.
4. **Keyboard-only completion.** A full nine-decision journey without a mouse, verified by e2e test.
5. **Performance.** §16 numbers met on the reference profile at CAF-3 and CAF-4.
6. **Memory.** Five enter/exit cycles with no growth beyond noise.
7. **Consequence visibility.** Every decision produces at least one change a player can point at, and every such change is also announced to a live region.
8. **Resume.** Quitting between seed and follow-up resumes at the follow-up with world state intact.

### 18.3 Test plan

- **Unit** — world-state reducer; the season/light mapping; the tier-map permutation generator (each tier once per node, no repeated permutation).
- **Content** — every `path` a player can construct terminates in a node present in the rubric's `terminals`; every terminal is reachable; every leaf has consequence prose and at least one world-state write.
- **Choice parity (machine pass, ADR-005 §11.5)** — for every trio of choices, longest minus shortest ≤ **8 words**; no capitalised tier label, proficiency number, `n/3` or pass/fail phrasing in any shipped string; no verdict language ("unfortunately", "you should have", "the better move", "correct", "well done") in any consequence; each tier used exactly once per node and no letter permutation repeated in the building. This runs in CI over `script.ts` and is the check that caught the length/tier correlation in this document's first draft.
- **Component** — the dialogue layer builds the correct `trace` result; the scenario presentation mode renders no result view; the status chip shows no proficiency.
- **E2E** — enter from Market Street → play `C1-HARD-01` → verify the chalkboard changed → exit → re-enter → verify it is still changed → complete the journey → open the report.
- **Playtest** — a scripted 20-minute session run by someone who has never seen the content, with one question afterwards: _"which choice do you think the game wanted?"_ If they can answer for more than two decisions out of nine, §9 gets rewritten.

### 18.4 Risks

| Risk                                                                                                              | Mitigation                                                                                                                                                                                   |
| ----------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **The room feels like a menu with furniture.** The failure mode where decisions are just modals in a 3D backdrop. | Staging table §8 is a requirement, not flavour — every decision is delivered by a person or by the room. CAF-1's gate is specifically "does it feel inhabited when nothing is asked of you". |
| **162 leaves is a lot of prose, and prose fatigue produces marked options.**                                      | Two fully-worked exemplars fix the register; ADR-005 §11.4 gives measurable rules (word count, self-justification); the audit is blocking and run by a fresh reader.                         |
| **Priya becomes a verdict machine.**                                                                              | Her reactions are bound to world state, never to tier. §11 calls this out for reviewers explicitly.                                                                                          |
| **CC0 audio with the right warmth may not exist.**                                                                | Ship on room tone alone if necessary — a quiet café is not a worse café.                                                                                                                     |
| **The window's exterior card breaks continuity with the iso city.**                                               | The card is built from the same palette LUT and reuses Market Street's silhouette; slight defocus hides the mismatch honestly.                                                               |
| **Week 8's darkness is an accessibility problem.**                                                                | Minimum scene luminance floor; all text is DOM; the beat is announced.                                                                                                                       |

### 18.5 Open decisions

- **The owner's name** — the letter in §13 is addressed to someone. Does the player have a name in this game, and if so where does it come from? (Display name from `/me` is the obvious answer; needs KK.)
- **Whether Marcus ever comes back** if the player's C9 run is weak. Current position: he does, in week 18's epilogue, and says nothing about it — but this is a tone call.
- **CC0 instrumental bed** — sourcing, or ship without.
- **Ray's dual role** in Level B (truck owner and supplier rep) — is doubling him up economical or confusing? Playtest it at CAF-3.
- **Does the season progress if the player leaves and returns weeks later in real time?** Current position: no — season advances with decisions, not with clock time.
