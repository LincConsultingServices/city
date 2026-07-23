## ApiClient — the ONLY thing in the project that touches HTTPRequest, status
## codes, or JSON envelopes (PRD §7.3, §12.2). Everyone else calls typed
## `await`-able methods and receives an ApiResult.
##
## Two envelopes, one normalization: the live backend today returns a flat
## `{"error":"message"}` (see academy_handler.go / middleware.go); the PRD §8.3
## describes a future structured `{"error":{code,message,redirectUrl}}`. Both
## collapse into ApiError here, so callers never branch on which one they got.
##
## Auth policy (PRD §8.3, §10): on 401 INVALID_TOKEN we do ONE silent Firebase
## refresh and retry; failing that we announce session_lost. NETWORK / 5xx on
## idempotent calls back off and retry a few times.
##
## NOTE: this creates one HTTPRequest node per in-flight call. A reusable pool
## is a perf optimization tracked for a later phase; correctness first.
extends Node

const REQUEST_TIMEOUT := 20.0
const MAX_RETRIES := 2
const BASE_BACKOFF := 0.5
const MAX_BACKOFF := 4.0
# NOTE: PackedStringArray(...) is not a constant expression in GDScript, so
# these headers are built inline at the call sites rather than as consts.


func _ready() -> void:
	AppConfig.ensure_loaded()


# ── Backend: typed methods (all authed; all return ApiResult) ────────────────


## The F0 bootstrap call. There is no /me route on the live backend yet
## (PRD assumes one) — registry/modules is the first authed call that exists and
## carries the caller's per-module progress + earned badges. Session.bootstrap()
## wraps this so swapping to /me later is a one-line change.
func get_registry_modules() -> ApiResult:
	return await _authed(HTTPClient.METHOD_GET, "/api/v1/registry/modules")


func get_level(comp: String, level: String) -> ApiResult:
	return await _authed(HTTPClient.METHOD_GET, "/api/v1/registry/%s/%s" % [comp, level])


func get_activity(activity_id: String) -> ApiResult:
	return await _authed(HTTPClient.METHOD_GET, "/api/v1/registry/activity/%s" % activity_id)


# ── Firebase Identity Toolkit REST (PRD §10) ─────────────────────────────────


## Returns a plain Dictionary (Firebase has its own envelope, not the backend's):
##   { ok: true,  id_token, refresh_token, expires_in, local_id, email, display_name }
##   { ok: false, firebase_error: "EMAIL_NOT_FOUND" | "INVALID_LOGIN_CREDENTIALS" | ... }
func firebase_sign_in(email: String, password: String) -> Dictionary:
	AppConfig.ensure_loaded()
	if AppConfig.firebase_api_key.is_empty():
		return {"ok": false, "firebase_error": "CONFIG_MISSING"}
	var url := "%s?key=%s" % [AppConfig.FIREBASE_SIGNIN_URL, AppConfig.firebase_api_key]
	var payload := JSON.stringify({"email": email, "password": password, "returnSecureToken": true})
	var headers := PackedStringArray(["Content-Type: application/json", "Accept: application/json"])
	var raw := await _http(HTTPClient.METHOD_POST, url, headers, payload)
	return _parse_firebase_signin(raw)


## Returns { ok, id_token, refresh_token, expires_in } or { ok:false, firebase_error }.
## Note the refresh endpoint speaks snake_case and form-encoding, unlike sign-in.
func firebase_refresh(refresh_token: String) -> Dictionary:
	AppConfig.ensure_loaded()
	if AppConfig.firebase_api_key.is_empty() or refresh_token.is_empty():
		return {"ok": false, "firebase_error": "CONFIG_MISSING"}
	var url := "%s?key=%s" % [AppConfig.FIREBASE_REFRESH_URL, AppConfig.firebase_api_key]
	var body := "grant_type=refresh_token&refresh_token=%s" % refresh_token.uri_encode()
	var headers := PackedStringArray(["Content-Type: application/x-www-form-urlencoded"])
	var raw := await _http(HTTPClient.METHOD_POST, url, headers, body)
	if not raw.get("transport_ok", false):
		return {"ok": false, "firebase_error": "NETWORK"}
	var parsed: Variant = JSON.parse_string(String(raw.get("body", "")))
	var status: int = raw.get("status", 0)
	if status >= 200 and status < 300 and typeof(parsed) == TYPE_DICTIONARY:
		return {
			"ok": true,
			"id_token": String(parsed.get("id_token", "")),
			"refresh_token": String(parsed.get("refresh_token", "")),
			"expires_in": int(String(parsed.get("expires_in", "3600"))),
		}
	return {"ok": false, "firebase_error": _firebase_error_code(parsed)}


# ── Internals ────────────────────────────────────────────────────────────────


## One authed attempt + the retry/refresh policy loop.
func _authed(method: int, path: String, body_dict: Dictionary = {}, allow_refresh: bool = true) -> ApiResult:
	AppConfig.ensure_loaded()
	var attempt := 0
	var result := await _once(method, path, body_dict)
	while not result.ok:
		var code := result.error.code
		if code == "INVALID_TOKEN" and allow_refresh:
			if await Session.try_silent_refresh():
				allow_refresh = false
				result = await _once(method, path, body_dict)  # retry once with the fresh token
				continue
			EventBus.session_lost.emit("token_expired")
			break
		if (code == "NETWORK" or code == "SERVER_ERROR") and attempt < MAX_RETRIES:
			attempt += 1
			EventBus.toast_requested.emit("Reconnecting…", "info")
			await get_tree().create_timer(_backoff(attempt)).timeout
			result = await _once(method, path, body_dict)
			continue
		break
	return result


func _once(method: int, path: String, body_dict: Dictionary) -> ApiResult:
	var url := AppConfig.api_base_url + path
	var headers := Session.auth_headers()
	var body := "" if body_dict.is_empty() else JSON.stringify(body_dict)
	var raw := await _http(method, url, headers, body)
	return _to_result(raw)


func _http(method: int, url: String, headers: PackedStringArray, body: String) -> Dictionary:
	var req := HTTPRequest.new()
	req.timeout = REQUEST_TIMEOUT
	add_child(req)
	var err := req.request(url, headers, method, body)
	if err != OK:
		req.queue_free()
		return {"transport_ok": false, "status": 0, "body": ""}
	var res: Array = await req.request_completed
	req.queue_free()
	var result_code: int = res[0]
	var status: int = res[1]
	var body_text: String = (res[3] as PackedByteArray).get_string_from_utf8()
	if result_code != HTTPRequest.RESULT_SUCCESS:
		return {"transport_ok": false, "status": status, "body": body_text}
	return {"transport_ok": true, "status": status, "body": body_text}


func _to_result(raw: Dictionary) -> ApiResult:
	if not raw.get("transport_ok", false):
		var e := ApiResult.ApiError.new(
			"NETWORK", "Network request failed. Check your connection.", int(raw.get("status", 0))
		)
		return ApiResult.failure(e)
	var status: int = raw["status"]
	var body_text: String = raw.get("body", "")
	var parsed: Variant = JSON.parse_string(body_text) if not body_text.is_empty() else null
	if status >= 200 and status < 300:
		return ApiResult.success(status, parsed)
	# Envelope normalization lives in the pure, unit-tested ErrorEnvelope.
	return ApiResult.failure(ErrorEnvelope.parse(status, parsed))


func _parse_firebase_signin(raw: Dictionary) -> Dictionary:
	if not raw.get("transport_ok", false):
		return {"ok": false, "firebase_error": "NETWORK"}
	var parsed: Variant = JSON.parse_string(String(raw.get("body", "")))
	var status: int = raw.get("status", 0)
	if status >= 200 and status < 300 and typeof(parsed) == TYPE_DICTIONARY:
		return {
			"ok": true,
			"id_token": String(parsed.get("idToken", "")),
			"refresh_token": String(parsed.get("refreshToken", "")),
			"expires_in": int(String(parsed.get("expiresIn", "3600"))),
			"local_id": String(parsed.get("localId", "")),
			"email": String(parsed.get("email", "")),
			"display_name": String(parsed.get("displayName", "")),
		}
	return {"ok": false, "firebase_error": _firebase_error_code(parsed)}


## Firebase puts the machine-readable reason in error.message, e.g.
## "EMAIL_NOT_FOUND", "INVALID_PASSWORD", "INVALID_LOGIN_CREDENTIALS",
## "TOO_MANY_ATTEMPTS_TRY_LATER : ...".
func _firebase_error_code(parsed: Variant) -> String:
	if typeof(parsed) == TYPE_DICTIONARY and parsed.has("error") and typeof(parsed["error"]) == TYPE_DICTIONARY:
		var msg := String(parsed["error"].get("message", "UNKNOWN"))
		return msg.split(" ")[0].strip_edges()  # drop the " : detail" suffix some errors carry
	return "UNKNOWN"


func _backoff(attempt: int) -> float:
	return minf(BASE_BACKOFF * pow(2.0, attempt - 1), MAX_BACKOFF)
