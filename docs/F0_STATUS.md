# F0 — Skeleton: status, reality gaps, and how to smoke-test

**Phase F0 goal (PRD §19):** Repo + CI, Godot project, login → bootstrap,
gray-box city (tilemap, camera, click-to-move, one placeholder venue), art style
sheet + base pack decision (licenses logged).
**Demo gate:** *Walk a gray city as an authenticated WarRoom user; the
unregistered path shows the register interstitial.*

This file is the honest record of what F0 delivers, where the **live backend
diverges from the PRD**, and how to verify F0 on a machine with the Godot editor
(this skeleton was authored without a running engine; F0's own gate is a manual
playtest per PRD §18).

---

## 1. Backend reality vs the PRD (verified against `academy-backend`)

The PRD describes a backend that is partly ahead of the code that is actually
live. I built F0 against the **real** contract (`internal/handlers/academy_handler.go`,
`cmd/server/main.go`, `internal/auth/middleware.go`) and made each gap a seam,
not a blocker. File these as backend issues per the additive-only extension flow
(PRD §11.3):

| PRD assumption | What the live backend actually does | How F0 handles it |
|---|---|---|
| `GET /api/v1/me` bootstrap (HUD + starter grants) | **No `/me` route exists.** | `Session.bootstrap()` calls `GET /api/v1/registry/modules` (the first authed call that exists — returns modules + earned badges). One-line swap to `/me` when it lands. |
| Economy live server-side: `/wallet`, `/shop`, `/inventory`, `/avatar`, coins on submit | **None of those routes exist**; `SubmitResponse` has no `coinsEarned`/`coinBalance`; `AcademyUser` has no coin field. | Not needed for F0 (economy is F2). `Economy` autoload is a wired-but-unfed seam holding **no fake data**; it starts feeding the instant those fields appear. |
| Backend returns `403 NOT_REGISTERED` + `redirectUrl` → register | **Middleware auto-provisions** any valid Firebase token into a user row. No such 403, no `redirectUrl`, ever. | The real "unregistered" signal is at the **Firebase login layer** (`EMAIL_NOT_FOUND`). The interstitial fires there; the register URL is a client const (`AppConfig.register_url`). |
| Structured error envelope `{"error":{code,message,redirectUrl}}` (PRD §8.3) | **Flat** `{"error":"message"}` everywhere. | `ApiClient._parse_error` normalizes **both** shapes into one `ApiError` (unit-tested). Callers are written once. |
| openapi **v0.3.0** | `api/openapi.yaml` is **v0.2.0**, and is itself behind the handler (missing badges/profile/hub too). | Built against the handler (source of truth), not the openapi. Flag the openapi as stale. |
| Firebase `EMAIL_NOT_FOUND` cleanly identifies unknown users | Projects with **email-enumeration protection** collapse this into `INVALID_LOGIN_CREDENTIALS` (can't distinguish unknown-email from wrong-password). | Interstitial still fires on `EMAIL_NOT_FOUND`; **and** a persistent "New to WarRoom? Register" link is always visible so the register path is reachable regardless. |

Seeded content today: **C4-BEGINNER only** (per backend README). The placeholder
venue's `hostedActivities` use real `C4-BEG-*` ids so F1 can bind to live data.

Config you must supply before login works (copy `.env.example` → `.env`):
- `FIREBASE_API_KEY` — the WarRoom **web** API key (client key, from the main
  frontend's build config; not a secret but not guessable — left blank on purpose).
- `API_BASE_URL` — `http://localhost:8080` for local dev, or the deployed Cloud Run
  URL (the openapi shows `…-uc.a.run.app` with the hash redacted).

Resolution order (last wins): baked defaults → `res://.env` → real OS env vars
(the CI path) → `window.CITY_CONFIG` (web hosting-time injection). Format matches
the backend's godotenv `.env` so ops knowledge transfers 1:1.

---

## 2. What F0 delivers

**Architecture (the 7-autoload shared surface, PRD §12.1)** — all present:
`EventBus`, `ApiClient`, `Session`, `PlayerState`, `Economy`, `SceneRouter`,
`AudioManager`, plus a static `AppConfig` (not an autoload, holds no state).

- **Auth (PRD §10):** Firebase Identity Toolkit REST sign-in + silent
  `securetoken` refresh (one retry on 401, then login), remember-me via an
  encrypted local refresh token, logout. Register interstitial as above.
- **ApiClient (PRD §8.3, §12.2):** the only HTTP surface; `await`-based; dual
  error-envelope normalization; NETWORK/5xx backoff+retry; typed backend methods
  (`get_registry_modules/level/activity`).
- **City (PRD §6):** gray-box iso ground grid, Y-sorted world, click-to-move
  (navmesh agent + straight-line fallback so it can't deadlock) with WASD
  override, iso camera (soft-follow, 3 zoom steps, leashed drag-pan), a click
  marker.
- **Building framework (PRD §7, §12.2):** city holds **no** hardcoded buildings;
  `BuildingManager` spawns from `buildings/*/building.json` via a validating
  `BuildingManifest` loader; `BuildingExterior` renders the gray-box block +
  sign + door + Open/Locked state identically for every venue; approach → prompt
  → **E to enter** → overlay venue → **Esc/Leave** → back to the same spot
  (spawn-back is free in overlay mode).
- **HUD (PRD §9.1):** avatar chip, coin pill (`—` until the backend has a
  wallet), map button, top-center toast lane, logout.
- **Hosting/CI (PRD §13, §17):** `firebase.json` with COOP/COEP + cache rules;
  `.firebaserc` (project `warroom-498513`); GitHub Actions (gdformat/gdlint +
  headless tests + informational web export + ownership-boundary warning);
  CODEOWNERS folder ownership.
- **Docs/pipeline (PRD §14):** style sheet, mandatory license log, this status.

**Deliberately deferred (correctly out of F0):** the activity player + 13
renderers (F1), the Shop/customization/Trophy Hall (F2), all 11 real venues +
frozen framework docs (F3), interiors/FTUE/audio/a11y/perf passes (F4).

---

## 3. Known F0 shortcuts (tracked, not hidden)

- **Navmesh is a single convex quad** (no carved building holes). Buildings are
  solid via collision, so the character can't walk through them, but path
  *routing around* a building is approximate. Carving footprint holes needs an
  editor smoke-test — a fast-follow. Movement never deadlocks regardless.
- **UI + world are code-built, not editor scenes.** Deliberate: hand-authored
  `.tscn` for complex layouts is error-prone without the editor. These are
  shared-core (single-owner) and can be refactored to editor scenes later.
- **No art/audio assets** (gray-box only); base-pack license audit pending (§14, §20).
- **Path preview line** (PRD §6.3) is a click marker for now, not a full route line.
- **Map screen, fast travel, FTUE, day/night** — later phases by design.

---

## 4. How to smoke-test F0 (needs Godot 4.3+)

1. `cp .env.example .env` and fill `FIREBASE_API_KEY` + `API_BASE_URL` (point at
   a running backend, or the live Cloud Run URL).
2. Open the project in **Godot 4.3+** and press Play (main scene = `main/boot.tscn`).
3. **Login gate:** sign in with a real WarRoom account → you spawn in the gray
   city. Sign in with an unknown email → the register interstitial appears
   (or, with enumeration protection, a "didn't match" error + the always-visible
   Register link).
4. **Walk:** click the ground to move; WASD also drives. Zoom with the wheel.
5. **Venue:** walk to the Ice Cream Cart (north of spawn); the "Press E" prompt
   appears in range; press **E** → the overlay lists its hosted C4-BEG ids →
   **Esc/Leave** returns you to the same spot.
6. **Logout** (top-left) → back to login.

Headless (no editor UI), from the project root:
```
godot --headless --import --quit
godot --headless --script res://tests/run_tests.gd   # unit tests, exits non-zero on failure
```

## 5. F0 exit checklist
- [ ] `.env` created (from `.env.example`) with a valid web API key + backend URL.
- [ ] Smoke-test steps 1–6 pass on the reference laptop profile (PRD §12.3).
- [ ] Backend gaps in §1 filed as issues on `academy-backend` (PRD §11.3).
- [ ] Base art pack license logged in `assets/ASSETS_LICENSES.md` (PRD §14/§20).
- [ ] Real GitHub handles swapped into `CODEOWNERS`.
- [ ] Repo created as `city-frontend` (PRD §17) and CI green.
