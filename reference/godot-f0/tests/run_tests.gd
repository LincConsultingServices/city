## Headless unit tests — run with:
##     godot --headless --script res://tests/run_tests.gd
## Exits non-zero on any failure, so CI can gate on it. No GUT addon required
## (GUT can be layered on later); this covers the pure logic that matters most in
## F0 (PRD §18): the iso transform, manifest validation, and — critically — the
## dual error-envelope normalization that lets the client survive the backend
## catching up to the PRD.
##
## Only dependency-free scripts are exercised here (iso, manifest, error
## envelope) so the tests compile and run under a bare --script SceneTree without
## needing the autoloads instantiated.
extends SceneTree

const IsoS := preload("res://core/iso.gd")
const ManifestS := preload("res://core/building_manifest.gd")
const EnvelopeS := preload("res://core/error_envelope.gd")

var _failures := 0
var _count := 0


func _initialize() -> void:
	_test_iso()
	_test_manifest()
	_test_envelope()
	print("\n──────────────────────────────")
	if _failures == 0:
		print("ALL PASS (%d checks)" % _count)
	else:
		printerr("%d / %d checks FAILED" % [_failures, _count])
	quit(1 if _failures > 0 else 0)


func _check(cond: bool, msg: String) -> void:
	_count += 1
	if cond:
		print("  ok   - %s" % msg)
	else:
		_failures += 1
		printerr("  FAIL - %s" % msg)


# ── Iso (core/iso.gd) ────────────────────────────────────────────────────────


func _test_iso() -> void:
	print("[iso]")
	var cell := Vector2(3, 5)
	var round_trip: Vector2 = IsoS.world_to_map(IsoS.map_to_world(cell))
	_check(round_trip.is_equal_approx(cell), "map_to_world → world_to_map round-trips")
	_check(IsoS.map_to_world(Vector2.ZERO).is_equal_approx(Vector2.ZERO), "origin cell maps to origin")
	var poly: PackedVector2Array = IsoS.tile_polygon(Vector2.ZERO)
	_check(poly.size() == 4, "tile_polygon returns a 4-point diamond")


# ── BuildingManifest.validate (core/building_manifest.gd) ────────────────────


func _test_manifest() -> void:
	print("[manifest]")
	var good := {
		"id": "x",
		"displayName": "X",
		"district": "d",
		"enabled": true,
		"hostedActivities": [],
		"exterior": {"footprintTiles": [[0, 0]], "entranceTile": [0, 1]},
	}
	_check(ManifestS.validate(good).is_empty(), "well-formed manifest passes")

	_check(ManifestS.validate({"id": "x"}).size() > 0, "missing required fields fail")

	var bad_foot := good.duplicate(true)
	bad_foot["exterior"] = {"footprintTiles": "nope", "entranceTile": [0, 1]}
	_check(ManifestS.validate(bad_foot).size() > 0, "non-array footprintTiles fails")

	var bad_entrance := good.duplicate(true)
	bad_entrance["exterior"] = {"footprintTiles": [[0, 0]], "entranceTile": [0]}
	_check(ManifestS.validate(bad_entrance).size() > 0, "malformed entranceTile fails")

	var null_interior := good.duplicate(true)
	null_interior["interiorScene"] = null
	_check(ManifestS.validate(null_interior).is_empty(), "null interiorScene is allowed (overlay mode)")


# ── ApiClient error-envelope normalization (autoload/api_client.gd) ──────────


func _test_envelope() -> void:
	print("[envelope]")

	# Backend's CURRENT flat envelope: {"error":"message"} + status.
	var flat = EnvelopeS.parse(401, {"error": "Invalid or expired token"})
	_check(flat.code == "INVALID_TOKEN", "401 → INVALID_TOKEN code")
	_check(flat.message == "Invalid or expired token", "flat envelope message is surfaced")

	var flat_404 = EnvelopeS.parse(404, {"error": "activity not found"})
	_check(flat_404.code == "NOT_FOUND", "404 → NOT_FOUND code")

	var flat_500 = EnvelopeS.parse(500, {"error": "internal error"})
	_check(flat_500.code == "SERVER_ERROR", "500 → SERVER_ERROR code")

	# FUTURE structured envelope (PRD §8.3): {"error":{code,message,redirectUrl}}.
	var structured = EnvelopeS.parse(
		403, {"error": {"code": "NOT_REGISTERED", "message": "no account", "redirectUrl": "https://reg"}}
	)
	_check(structured.code == "NOT_REGISTERED", "structured envelope code overrides status")
	_check(structured.redirect_url == "https://reg", "structured envelope redirectUrl is captured")

	# LIVE backend shape (verified against Cloud Run): a 401 carries a structured
	# error whose code is UNAUTHENTICATED, NOT INVALID_TOKEN. Auth is status-driven,
	# so any 401 must still normalize to INVALID_TOKEN or silent-refresh never fires.
	var live401 = EnvelopeS.parse(
		401, {"error": {"code": "UNAUTHENTICATED", "message": "Missing or malformed token"}}
	)
	_check(live401.code == "INVALID_TOKEN", "live 401 (UNAUTHENTICATED) → INVALID_TOKEN")
	_check(live401.message == "Missing or malformed token", "live 401 message is preserved")
	_check(live401.is_auth_error(), "live 401 is treated as an auth error")
