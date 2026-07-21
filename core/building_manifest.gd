## BuildingManifest — loads and validates the building.json plug-in manifests
## that ARE the registration point for a venue (PRD §7.1). The city scene holds
## NO hardcoded building nodes; BuildingManager asks this class for the list at
## load and instances from it (PRD §12.2).
##
## Validation here is the difference between "a bad manifest shows a clear error"
## and "the game crashes" (PRD §18): a malformed building.json is reported and
## skipped, never fatal.
class_name BuildingManifest
extends RefCounted

const ROOT := "res://buildings"


## Scan buildings/*/building.json → an Array of validated manifest Dictionaries,
## each with an added "_dir" pointing at its folder. Invalid manifests are
## reported via push_error and skipped.
static func load_all(root: String = ROOT) -> Array:
	var out: Array = []
	var dir := DirAccess.open(root)
	if dir == null:
		push_warning("BuildingManifest: no buildings dir at %s" % root)
		return out
	dir.list_dir_begin()
	var entry := dir.get_next()
	while entry != "":
		if dir.current_is_dir() and not entry.begins_with("."):
			var path := "%s/%s/building.json" % [root, entry]
			if FileAccess.file_exists(path):
				var m := load_one(path)
				if not m.is_empty():
					m["_dir"] = "%s/%s" % [root, entry]
					out.append(m)
		entry = dir.get_next()
	dir.list_dir_end()
	return out


## Parse + validate a single manifest file. Returns {} on any problem.
static func load_one(path: String) -> Dictionary:
	var text := FileAccess.get_file_as_string(path)
	if text.is_empty():
		push_error("BuildingManifest: empty or unreadable %s" % path)
		return {}
	var parsed: Variant = JSON.parse_string(text)
	if typeof(parsed) != TYPE_DICTIONARY:
		push_error("BuildingManifest: %s is not a JSON object" % path)
		return {}
	var errors := validate(parsed)
	if not errors.is_empty():
		push_error("BuildingManifest: %s is invalid:\n  - %s" % [path, "\n  - ".join(errors)])
		return {}
	return parsed


## Structural validation. Returns a list of human-readable problems (empty = ok).
## Kept pure (no I/O) so it is trivially unit-testable (see tests/).
static func validate(m: Dictionary) -> PackedStringArray:
	var errors := PackedStringArray()

	for key in ["id", "displayName", "district"]:
		if not m.has(key) or String(m.get(key, "")).strip_edges().is_empty():
			errors.append("missing required string '%s'" % key)

	if not m.has("enabled") or typeof(m["enabled"]) != TYPE_BOOL:
		errors.append("missing boolean 'enabled'")

	if not m.has("hostedActivities") or typeof(m["hostedActivities"]) != TYPE_ARRAY:
		errors.append("missing array 'hostedActivities'")

	# interiorScene may be null (framework overlay mode) OR a res:// path string.
	if m.has("interiorScene") and m["interiorScene"] != null and typeof(m["interiorScene"]) != TYPE_STRING:
		errors.append("'interiorScene' must be a res:// path string or null")

	# exterior block: needs footprintTiles + entranceTile as coordinate arrays.
	if not m.has("exterior") or typeof(m["exterior"]) != TYPE_DICTIONARY:
		errors.append("missing object 'exterior'")
	else:
		var ext: Dictionary = m["exterior"]
		if not _is_tile_list(ext.get("footprintTiles", null)):
			errors.append("exterior.footprintTiles must be an array of [x,y] pairs")
		if not _is_tile(ext.get("entranceTile", null)):
			errors.append("exterior.entranceTile must be an [x,y] pair")

	return errors


static func _is_tile(v: Variant) -> bool:
	return typeof(v) == TYPE_ARRAY and v.size() == 2 and _is_num(v[0]) and _is_num(v[1])


static func _is_tile_list(v: Variant) -> bool:
	if typeof(v) != TYPE_ARRAY or (v as Array).is_empty():
		return false
	for t in v:
		if not _is_tile(t):
			return false
	return true


static func _is_num(v: Variant) -> bool:
	return typeof(v) == TYPE_INT or typeof(v) == TYPE_FLOAT


# ── Convenience accessors (so callers don't re-parse the same fields) ────────


static func footprint_cells(m: Dictionary) -> Array:
	var cells: Array = []
	var ext: Variant = m.get("exterior", {})
	if typeof(ext) == TYPE_DICTIONARY:
		for t in ext.get("footprintTiles", []):
			cells.append(Vector2i(int(t[0]), int(t[1])))
	return cells


static func entrance_cell(m: Dictionary) -> Vector2i:
	var ext: Variant = m.get("exterior", {})
	if typeof(ext) == TYPE_DICTIONARY and _is_tile(ext.get("entranceTile", null)):
		var t: Array = ext["entranceTile"]
		return Vector2i(int(t[0]), int(t[1]))
	return Vector2i.ZERO
