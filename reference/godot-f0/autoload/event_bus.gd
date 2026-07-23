## EventBus — the one typed signal hub (PRD §12.1). Autoloads and UI emit/listen
## here instead of holding hard references to each other; this is what keeps the
## shared surface small and the building scaffolds decoupled (PRD §7.3, §17).
##
## Rule: signals flow ONE way per concern. State lives in the owning autoload
## (Session/Economy/PlayerState); EventBus only announces that it changed.
extends Node

# ── Session / auth ───────────────────────────────────────────────────────────
## Fired after login + a successful bootstrap call. The city may spawn now.
signal session_ready
## Fired when the session becomes invalid (refresh failed / logout). Return to login.
signal session_lost(reason: String)

# ── Economy (server-driven only — PRD §8.2, §9). Wired now, fed from F1+. ─────
## coinsEarned/coinBalance arrive on submit responses; HUD animates from here.
signal coins_changed(balance: int, delta: int)
## One per entry in badgesAwarded[] on a submit response.
signal badge_awarded(badge: Dictionary)

# ── Activity loop (PRD §8) ───────────────────────────────────────────────────
signal activity_started(activity_id: String)
signal activity_completed(activity_id: String, submit_response: Dictionary)

# ── World / navigation ───────────────────────────────────────────────────────
signal district_changed(district_id: String)
signal building_entered(building_id: String)
signal building_exited(building_id: String)

# ── Cross-cutting UX ─────────────────────────────────────────────────────────
## Central place for the top-center toast lane (PRD §9.1): errors, info, badges.
signal toast_requested(text: String, kind: String)  # kind: "info" | "error" | "reward"
## Emitted by ApiClient when a request fails after its retry policy is exhausted.
signal network_error(message: String)
