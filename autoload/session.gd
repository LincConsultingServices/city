## Session — identity + tokens (PRD §10). Owns login / silent refresh / logout
## and the `bootstrap()` seam. Holds the Firebase tokens in memory; persists the
## refresh token (encrypted) only when "remember me" is chosen.
##
## IMPORTANT reality note (see docs/F0_STATUS.md): the live backend has NO /me
## route and NEVER returns a 403 NOT_REGISTERED — it auto-provisions any valid
## token. So:
##   • bootstrap() uses GET /api/v1/registry/modules as the first authed call.
##   • the "unregistered user → register" path is detected at the FIREBASE login
##     layer (EMAIL_NOT_FOUND), not from a backend 403. And because Firebase
##     email-enumeration protection can collapse that into INVALID_LOGIN_CREDENTIALS,
##     the login screen always keeps a "Register" affordance visible too.
extends Node

const REMEMBER_FILE := "user://session.dat"

# In-memory identity (never persisted except the refresh token, opt-in).
var id_token := ""
var refresh_token := ""
var user_email := ""
var display_name := ""
var local_id := ""
var bootstrapped := false

# Cached bootstrap payload — the /me substitute. Modules + earned badges for the
# HUD and building "new content" states (PRD §6.5).
var modules: Array = []
var registry_version := ""

var _remember := false


func is_logged_in() -> bool:
	return not id_token.is_empty()


func auth_headers() -> PackedStringArray:
	var h := PackedStringArray(["Content-Type: application/json", "Accept: application/json"])
	if not id_token.is_empty():
		h.append("Authorization: Bearer %s" % id_token)
	return h


## Full login: Firebase sign-in → store tokens → bootstrap. Returns an outcome
## Dictionary the login screen renders: { status, message }.
##   status ∈ ok | unregistered | bad_credentials | disabled | rate_limited
##            | invalid_input | config_missing | network | error
func login(email: String, password: String, remember: bool) -> Dictionary:
	var fb := await ApiClient.firebase_sign_in(email.strip_edges(), password)
	if not fb.get("ok", false):
		return _outcome_for_firebase(String(fb.get("firebase_error", "UNKNOWN")))

	_remember = remember
	_store_tokens(fb)
	if not await bootstrap():
		# Auth worked but the backend bootstrap failed (network / server).
		return {"status": "network", "message": "Signed in, but the city didn't respond. Try again."}
	if _remember:
		_persist_refresh()
	return {"status": "ok", "message": ""}


## The bootstrap call. Swap this single line to GET /me once the backend adds it.
func bootstrap() -> bool:
	var result := await ApiClient.get_registry_modules()
	if not result.ok:
		return false
	if typeof(result.data) == TYPE_DICTIONARY:
		modules = result.data.get("modules", [])
		registry_version = String(result.data.get("registryVersion", ""))
	bootstrapped = true
	EventBus.session_ready.emit()
	return true


## Try to re-authenticate silently using the refresh token. Returns success.
## Called by ApiClient on a 401, and by boot on cold start (remember-me).
func try_silent_refresh() -> bool:
	if refresh_token.is_empty():
		return false
	var fb := await ApiClient.firebase_refresh(refresh_token)
	if not fb.get("ok", false):
		return false
	id_token = String(fb.get("id_token", ""))
	if not String(fb.get("refresh_token", "")).is_empty():
		refresh_token = String(fb.get("refresh_token", ""))
	if _remember:
		_persist_refresh()
	return not id_token.is_empty()


## Cold-start restore for remember-me. Returns true if we end up logged in.
func restore_session() -> bool:
	var saved := _load_persisted_refresh()
	if saved.is_empty():
		return false
	_remember = true
	refresh_token = saved
	if not await try_silent_refresh():
		_clear_persisted_refresh()
		return false
	return await bootstrap()


func logout() -> void:
	id_token = ""
	refresh_token = ""
	user_email = ""
	display_name = ""
	local_id = ""
	bootstrapped = false
	modules = []
	_clear_persisted_refresh()
	EventBus.session_lost.emit("logout")


# ── Internals ────────────────────────────────────────────────────────────────


func _store_tokens(fb: Dictionary) -> void:
	id_token = String(fb.get("id_token", ""))
	refresh_token = String(fb.get("refresh_token", ""))
	user_email = String(fb.get("email", ""))
	display_name = String(fb.get("display_name", ""))
	local_id = String(fb.get("local_id", ""))


func _outcome_for_firebase(code: String) -> Dictionary:
	match code:
		"CONFIG_MISSING":
			return {
				"status": "config_missing",
				"message": "The city isn't configured yet (missing Firebase key). See config/app_config.example.json."
			}
		"NETWORK":
			return {"status": "network", "message": "Couldn't reach sign-in. Check your connection."}
		"EMAIL_NOT_FOUND":
			return {"status": "unregistered", "message": ""}
		"INVALID_PASSWORD", "INVALID_LOGIN_CREDENTIALS":
			return {"status": "bad_credentials", "message": "That email and password didn't match."}
		"USER_DISABLED":
			return {"status": "disabled", "message": "This account is disabled. Contact your program lead."}
		"TOO_MANY_ATTEMPTS_TRY_LATER":
			return {"status": "rate_limited", "message": "Too many attempts. Please wait a moment and try again."}
		"INVALID_EMAIL", "MISSING_EMAIL", "MISSING_PASSWORD":
			return {"status": "invalid_input", "message": "Enter a valid email and password."}
		_:
			return {"status": "error", "message": "Sign-in failed. Please try again."}


func _persist_refresh() -> void:
	if refresh_token.is_empty():
		return
	var f := FileAccess.open_encrypted_with_pass(REMEMBER_FILE, FileAccess.WRITE, _persist_pass())
	if f == null:
		push_warning("Session: could not write remember-me file (%d)." % FileAccess.get_open_error())
		return
	f.store_line(refresh_token)
	f.close()


func _load_persisted_refresh() -> String:
	if not FileAccess.file_exists(REMEMBER_FILE):
		return ""
	var f := FileAccess.open_encrypted_with_pass(REMEMBER_FILE, FileAccess.READ, _persist_pass())
	if f == null:
		return ""
	var token := f.get_line()
	f.close()
	return token


func _clear_persisted_refresh() -> void:
	if FileAccess.file_exists(REMEMBER_FILE):
		DirAccess.remove_absolute(REMEMBER_FILE)


## Best-effort obfuscation key (PRD §10 "encrypted local file"). Device-derived
## where possible; this is at-rest obfuscation for a client token, not a vault.
func _persist_pass() -> String:
	var uid := OS.get_unique_id()
	if uid.is_empty():
		uid = "city-local-fallback"
	return "warroom-city::" + uid
