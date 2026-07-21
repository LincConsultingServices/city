# The City — Godot 2.5D isometric frontend

One Godot web game: a 2.5D isometric, tycoon-style city whose buildings are
business **venues**. Entering a venue launches training activities drawn from the
9 competencies. The city is the presentation layer; the live
[`academy-backend`](../academy-backend) remains the single source of truth for
identity, activities, scoring, badges, and coins — **the client never computes
proficiency, grants badges, or credits coins** (PRD §1).

> Full spec: the master PRD (*The City · Godot 2.5D Isometric Frontend*).
> **Current phase: F0 — Skeleton.** Start with [`docs/F0_STATUS.md`](docs/F0_STATUS.md):
> it records what's built, how F0 diverges from the PRD to match the *real*
> backend, and how to smoke-test.

## Quick start

Requires **Godot 4.3+** (GDScript; the GL Compatibility renderer is used for a
robust web export).

```bash
cp config/app_config.example.json config/app_config.json
# edit app_config.json: set firebaseApiKey (WarRoom web key) + apiBaseUrl
```

Open in Godot 4.3+ and press Play (main scene: `main/boot.tscn`). Or headless:

```bash
godot --headless --import --quit
godot --headless --script res://tests/run_tests.gd   # unit tests
```

## How auth works (PRD §10, and see F0_STATUS §1)

1. Sign in with Firebase (project `warroom-498513`, same as the main app) →
   `idToken`.
2. Every backend call sends `Authorization: Bearer <idToken>`; the backend
   **auto-provisions** the academy user on first sight (there is no sign-up here
   and no `/auth/sync`).
3. Bootstrap is `GET /api/v1/registry/modules` (no `/me` route exists yet).
4. Sign-up never happens in-game: an unknown WarRoom account is caught at the
   Firebase layer and routed to `warroom.humanfirstbykk.com/register`.

## Layout (PRD §12.1)

```
project.godot            Godot 4.3 · autoloads · input map · GL Compatibility
config/                  AppConfig (static) + app_config.json (gitignored, per-build)
autoload/                the 7 shared singletons — the entire shared runtime surface
  event_bus  api_client  session  player_state  economy  scene_router  audio_manager
core/                    static helpers: iso.gd, building_manifest.gd, api_result.gd
main/                    boot scene (login vs city)
ui/                      login · hud · venue overlay
city/                    world scene, ground, character, camera, building framework
buildings/<id>/          ★ one folder per venue — the ownership boundary (PRD §7, §17)
  ice_cream_cart/          F0 placeholder venue (manifest only)
activities/              (F1) player shell + 13 renderers + content
assets/                  art/audio + ASSETS_LICENSES.md (mandatory, CI-checked)
docs/                    F0_STATUS · STYLE_SHEET · BUILDING_GUIDE
tests/                   headless unit tests (no GUT dependency)
firebase.json .firebaserc  Firebase Hosting with mandatory COOP/COEP headers (PRD §13)
```

## The one rule for building teams

A building PR touches **only** `buildings/<its-id>/` + its own manifest (PRD §7.3,
§17). Buildings never call HTTP, never edit shared scenes, never reimplement the
activity player. If you need something the framework doesn't provide, that's a
framework issue → maintainer PR → everyone benefits. See
[`docs/BUILDING_GUIDE.md`](docs/BUILDING_GUIDE.md).
