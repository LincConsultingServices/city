## AppConfig — the one place environment values live. Deliberately a static
## class_name and NOT an autoload: it holds no runtime game state, so it cannot
## drift and does not count against the 7-autoload shared surface (PRD §12.1).
##
## Resolution order (last wins):
##   1. the baked defaults below,
##   2. res://config/app_config.json    (gitignored; per-build values),
##   3. window.CITY_CONFIG on the web    (hosting-time injection, no rebuild).
##
## SECURITY NOTE: the Firebase *web* API key is a client identifier, not a
## secret (it ships in every web bundle) — but we still never hardcode a value
## we were not given. Leave it blank and the login screen shows a clear
## "configuration missing" message instead of failing cryptically.
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
	_load_json_file()
	_load_web_overrides()
	if firebase_api_key.is_empty():
		push_warning(
			(
				"AppConfig: firebase_api_key is empty — set it in config/app_config.json "
				+ "(see app_config.example.json). Login is disabled until then."
			)
		)


static func is_configured() -> bool:
	ensure_loaded()
	return not firebase_api_key.is_empty()


static func _load_json_file() -> void:
	var path := "res://config/app_config.json"
	if not FileAccess.file_exists(path):
		return
	var text := FileAccess.get_file_as_string(path)
	var parsed: Variant = JSON.parse_string(text)
	if typeof(parsed) != TYPE_DICTIONARY:
		push_warning("AppConfig: config/app_config.json is not a JSON object — ignoring.")
		return
	_apply(parsed)


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
		api_base_url = _strip_trailing_slash(String(cfg.apiBaseUrl))
	if cfg.registerUrl != null:
		register_url = String(cfg.registerUrl)


static func _apply(d: Dictionary) -> void:
	firebase_api_key = String(d.get("firebaseApiKey", firebase_api_key))
	firebase_project_id = String(d.get("firebaseProjectId", firebase_project_id))
	api_base_url = _strip_trailing_slash(String(d.get("apiBaseUrl", api_base_url)))
	register_url = String(d.get("registerUrl", register_url))


static func _strip_trailing_slash(s: String) -> String:
	return s.substr(0, s.length() - 1) if s.ends_with("/") else s
