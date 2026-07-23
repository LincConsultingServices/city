## ApiResult — the single normalized shape every ApiClient call returns. UI never
## touches HTTPRequest, status codes, or raw JSON envelopes (PRD §7.3, §12.2);
## it inspects `ok`, reads `data`, or branches on `error.code`.
##
## The whole point of this class is that the backend's CURRENT flat envelope
## (`{"error":"message"}`) and a FUTURE structured one
## (`{"error":{"code","message","redirectUrl"}}`, PRD §8.3) both collapse to the
## same `ApiError` here — so callers are written once and survive the backend
## catching up to the PRD.
class_name ApiResult
extends RefCounted

var ok: bool = false
var status: int = 0  # HTTP status (0 = no response / transport failure)
var data: Variant = null  # parsed JSON body on success (Dictionary/Array)
var error: ApiError = null  # populated iff not ok


static func success(status_code: int, body: Variant) -> ApiResult:
	var r := ApiResult.new()
	r.ok = true
	r.status = status_code
	r.data = body
	return r


static func failure(err: ApiError) -> ApiResult:
	var r := ApiResult.new()
	r.ok = false
	r.status = err.http_status
	r.error = err
	return r


## Normalized error. `code` is our stable internal vocabulary, derived from the
## backend body when it carries a code, otherwise inferred from the HTTP status.
class ApiError:
	extends RefCounted
	# Internal codes — the vocabulary the rest of the app switches on:
	#   NETWORK        transport failure / timeout / no response
	#   INVALID_TOKEN  401 — trigger one silent refresh, then login (PRD §8.3, §10)
	#   NOT_REGISTERED 403 with that code (future backend; today this never fires —
	#                  the real "unregistered" signal is Firebase EMAIL_NOT_FOUND)
	#   FORBIDDEN      403 without NOT_REGISTERED (e.g. admin-only)
	#   NOT_FOUND      404
	#   BAD_REQUEST    400 (e.g. result-kind mismatch on submit)
	#   SERVER_ERROR   5xx
	#   HTTP_ERROR     any other non-2xx
	var code: String = "HTTP_ERROR"
	var message: String = ""
	var redirect_url: String = ""
	var http_status: int = 0

	func _init(
		p_code: String = "HTTP_ERROR", p_message: String = "", p_status: int = 0, p_redirect: String = ""
	) -> void:
		code = p_code
		message = p_message
		http_status = p_status
		redirect_url = p_redirect

	func is_auth_error() -> bool:
		return code == "INVALID_TOKEN"
