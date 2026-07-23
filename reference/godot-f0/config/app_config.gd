## AppConfig — the one place environment values live. Deliberately a static
## class_name and NOT an autoload: it holds no runtime game state, so it cannot
## drift and does not count against the 7-autoload shared surface (PRD §12.1).
##
## Resolution order (last wins):
##   1. the baked defaults below,
##   2. res://.env                     (gitignored KEY=VALUE file; local dev),
##   3. real OS environment variables  (CI / shell — override the .env file),
##   4. window.CITY_CONFIG on the web  (hosting-time injection, no rebuild).
##
## The .env format matches the backend's godotenv convention (KEY=VALUE, '#'
## comments, optional surrounding quotes). Each field accepts its own canonical
## name AND the main WarRoom frontend's NEXT_PUBLIC_* name (first in the list
## wins), so the existing frontend .env can be dropped in verbatim (PRD §10).
##
## SECURITY NOTE: the Firebase *web* API key is a client identifier, not a
## secret (it ships in every web bundle) — but we still never hardcode a value
## we were not given, and we keep it out of the repo. Leave it blank and the
## login screen shows a clear "configuration missing" message instead of
## failing cryptically.
class_name AppConfig
extends RefCounted

# ── Baked defaults (safe, non-secret) ────────────────────────────────────────
const DEFAULT_FIREBASE_PROJECT_ID := "warroom-498513"  # PRD §10, confirmed in backend .env.example
const DEFAULT_API_BASE_URL := "http://localhost:8080"  # local dev; set the Cloud Run URL per build
# PRD §10 — client-side register URL; the backend never provides a redirectUrl.
const DEFAULT_REGISTER_URL := "https://warroom.humanfirstbykk.com/register"
const CLIENT_VERSION := "city@0.0.1-f0"  # sent as clientVersion on submit (PRD §8.2)

# Firebase Identity Toolkit REST (PRD §10). Project-independent host; the API
# key scopes it to warroom-498513.
const FIREBASE_SIGNIN_URL := "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword"
const FIREBASE_REFRESH_URL := "https://securetoken.googleapis.com/v1/token"

const ENV_PATH := "res://.env"

# field → accepted env-var names, in priority order (first present wins). The
# NEXT_PUBLIC_* aliases let the main frontend's .env be reused as-is.
const FIELD_ENV_NAMES := {
	"firebase_api_key": ["FIREBASE_API_KEY", "NEXT_PUBLIC_FIREBASE_API_KEY"],
	"firebase_project_id": ["FIREBASE_PROJECT_ID", "NEXT_PUBLIC_FIREBASE_PROJECT_ID"],
	"api_base_url": ["API_BASE_URL", "NEXT_PUBLIC_API_URL"],
	"register_url": ["REGISTER_URL", "NEXT_PUBLIC_REGISTER_URL"],
}

static var _loaded := false
static var firebase_api_key := ""
static var firebase_project_id := DEFAULT_FIREBASE_PROJECT_ID
static var api_base_url := DEFAULT_API_BASE_URL
static var register_url := DEFAULT_REGISTER_URL


## Idempotent. Call from any autoload's _ready() before first use.
static func ensure_loaded() -> void:
	if _loaded:
		return
	_loaded = true
	_resolve(_parse_env_file())  # .env layer
	_resolve(_os_env_vars())  # OS env overrides the file (CI path)
	_load_web_overrides()  # web hosting-time injection wins
	if firebase_api_key.is_empty():
		push_warning(
			(
				"AppConfig: no Firebase API key found — set FIREBASE_API_KEY (or "
				+ "NEXT_PUBLIC_FIREBASE_API_KEY) in .env. Login is disabled until then."
			)
		)


static func is_configured() -> bool:
	ensure_loaded()
	return not firebase_api_key.is_empty()


# ── Loaders ──────────────────────────────────────────────────────────────────


## Assign each field from the first present, non-empty candidate name in `vars`.
static func _resolve(vars: Dictionary) -> void:
	for field: String in FIELD_ENV_NAMES:
		for name: String in FIELD_ENV_NAMES[field]:
			if vars.has(name):
				var value: String = String(vars[name]).strip_edges()
				if not value.is_empty():
					_set_field(field, value)
					break


## Parse res://.env into a {KEY: value} dictionary. Missing file → empty dict.
static func _parse_env_file() -> Dictionary:
	var out := {}
	if not FileAccess.file_exists(ENV_PATH):
		return out
	var text := FileAccess.get_file_as_string(ENV_PATH)
	for raw_line in text.split("\n"):
		var line := raw_line.strip_edges()
		if line.is_empty() or line.begins_with("#"):
			continue
		if line.begins_with("export "):  # tolerate `export KEY=VALUE`
			line = line.substr(7).strip_edges()
		var eq := line.find("=")
		if eq < 0:
			continue
		var key := line.substr(0, eq).strip_edges()
		out[key] = _unquote(line.substr(eq + 1).strip_edges())
	return out


## Real process environment variables for every candidate name we recognise.
static func _os_env_vars() -> Dictionary:
	var out := {}
	for field: String in FIELD_ENV_NAMES:
		for name: String in FIELD_ENV_NAMES[field]:
			if OS.has_environment(name):
				out[name] = OS.get_environment(name)
	return out


static func _load_web_overrides() -> void:
	if not OS.has_feature("web"):
		return
	# window.CITY_CONFIG can be set by index.html at hosting time so a redeploy
	# does not require a fresh Godot export. Vars stay untyped on purpose: the
	# JavaScriptObject type only exists in web builds, so annotating it would
	# break compilation on desktop/CI.
	var win = JavaScriptBridge.get_interface("window")
	if win == null:
		return
	var cfg = win.CITY_CONFIG
	if cfg == null:
		return
	if cfg.firebaseApiKey != null:
		firebase_api_key = String(cfg.firebaseApiKey)
	if cfg.firebaseProjectId != null:
		firebase_project_id = String(cfg.firebaseProjectId)
	if cfg.apiBaseUrl != null:
		api_base_url = _normalize_base_url(String(cfg.apiBaseUrl))
	if cfg.registerUrl != null:
		register_url = String(cfg.registerUrl)


# ── Helpers ──────────────────────────────────────────────────────────────────


## Assign one resolved value to its static field, normalising as needed.
static func _set_field(field: String, value: String) -> void:
	match field:
		"firebase_api_key":
			firebase_api_key = value
		"firebase_project_id":
			firebase_project_id = value
		"api_base_url":
			api_base_url = _normalize_base_url(value)
		"register_url":
			register_url = value
		_:
			push_warning("AppConfig: unmapped field %s" % field)


## Strip one layer of matching surrounding single/double quotes.
static func _unquote(s: String) -> String:
	if s.length() >= 2:
		if (s.begins_with("\"") and s.ends_with("\"")) or (s.begins_with("'") and s.ends_with("'")):
			return s.substr(1, s.length() - 2)
	return s


## Normalise a backend base URL to the service ORIGIN that the client's hardcoded
## "/api/v1/..." paths expect. The main frontend's NEXT_PUBLIC_API_URL ends in
## "/api" (its own convention); the academy backend routes live at "/api/v1" off
## the root (see backend main.go), so a trailing "/api" here would double up.
## Strip trailing slashes, then one trailing "/api", then any slashes again.
static func _normalize_base_url(s: String) -> String:
	var u := s.strip_edges()
	u = _rstrip_slashes(u)
	if u.ends_with("/api"):
		u = u.substr(0, u.length() - 4)
	return _rstrip_slashes(u)


static func _rstrip_slashes(s: String) -> String:
	var u := s
	while u.ends_with("/"):
		u = u.substr(0, u.length() - 1)
	return u
