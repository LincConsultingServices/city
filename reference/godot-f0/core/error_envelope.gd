## ErrorEnvelope — pure normalization of backend error bodies into an ApiError.
## Extracted from ApiClient so it has ZERO autoload dependencies and is trivially
## unit-testable (PRD §18: "ApiClient envelope encode/decode ... unit tests").
##
## Collapses the backend's CURRENT flat envelope (`{"error":"message"}`) and the
## FUTURE structured one (`{"error":{code,message,redirectUrl}}`, PRD §8.3) into
## one shape, so callers are written once.
class_name ErrorEnvelope
extends RefCounted


static func parse(status: int, parsed: Variant) -> ApiResult.ApiError:
	var code := code_for_status(status)
	var message := default_message_for(status)
	var redirect := ""
	if typeof(parsed) == TYPE_DICTIONARY and parsed.has("error"):
		var errfield: Variant = parsed["error"]
		if typeof(errfield) == TYPE_STRING:
			message = String(errfield)  # flat envelope (today)
		elif typeof(errfield) == TYPE_DICTIONARY:  # structured (PRD §8.3)
			if errfield.has("code"):
				code = String(errfield["code"])
			if errfield.has("message"):
				message = String(errfield["message"])
			if errfield.has("redirectUrl"):
				redirect = String(errfield["redirectUrl"])
	# Auth is status-driven: ANY 401 means "authenticate again", whatever label the
	# body carries. The LIVE backend sends structured
	# {"error":{"code":"UNAUTHENTICATED","message":"Missing or malformed token"}};
	# older/local builds send a flat string. Both normalize to our internal
	# INVALID_TOKEN so the single silent-refresh path (PRD §8.3, §10) fires
	# uniformly — otherwise a real expired token would skip the refresh entirely.
	if status == 401:
		code = "INVALID_TOKEN"
	return ApiResult.ApiError.new(code, message, status, redirect)


static func code_for_status(status: int) -> String:
	match status:
		400:
			return "BAD_REQUEST"
		401:
			return "INVALID_TOKEN"
		403:
			return "FORBIDDEN"
		404:
			return "NOT_FOUND"
		_:
			return "SERVER_ERROR" if status >= 500 else "HTTP_ERROR"


static func default_message_for(status: int) -> String:
	match status:
		401:
			return "Your session expired."
		403:
			return "You don't have access to that."
		404:
			return "Not found."
		_:
			return (
				"The city's services are having a moment. Retrying…"
				if status >= 500
				else "Something went wrong (%d)." % status
			)
