## PlayerState — local, non-authoritative world state: where the character is,
## which district/venue they're in, FTUE flags, and which venues have unlocked
## fast travel (PRD §5, §6.6).
##
## Persistence is a local file for now (PRD §11.3 candidate #1: a server
## /city/state endpoint is anticipated but not built — a local file is
## explicitly "acceptable at launch"). Nothing here is a source of truth the
## server cares about, so losing it only costs the player their last position.
extends Node

const SAVE_FILE := "user://player_state.json"

var spawn_position := Vector2.ZERO  # last world position; used on next city load
var current_district := "civic_center"  # spawn plaza (PRD §6.1)
var current_venue := ""  # building_id while inside a venue, else ""
var ftue_seen := false  # 60-second guided walk shown (PRD §5.2)
var fast_travel_unlocked := {}  # { building_id: true } — first visit is always on foot


func _ready() -> void:
	load_state()


func mark_venue_visited(building_id: String) -> void:
	fast_travel_unlocked[building_id] = true
	save_state()


func can_fast_travel(building_id: String) -> bool:
	return fast_travel_unlocked.get(building_id, false)


func set_district(district_id: String) -> void:
	if district_id == current_district:
		return
	current_district = district_id
	EventBus.district_changed.emit(district_id)


func save_state() -> void:
	var data := {
		"spawn_position": {"x": spawn_position.x, "y": spawn_position.y},
		"current_district": current_district,
		"ftue_seen": ftue_seen,
		"fast_travel_unlocked": fast_travel_unlocked,
	}
	var f := FileAccess.open(SAVE_FILE, FileAccess.WRITE)
	if f == null:
		push_warning("PlayerState: could not write save file (%d)." % FileAccess.get_open_error())
		return
	f.store_string(JSON.stringify(data, "\t"))
	f.close()


func load_state() -> void:
	if not FileAccess.file_exists(SAVE_FILE):
		return
	var parsed: Variant = JSON.parse_string(FileAccess.get_file_as_string(SAVE_FILE))
	if typeof(parsed) != TYPE_DICTIONARY:
		return
	var pos: Variant = parsed.get("spawn_position", null)
	if typeof(pos) == TYPE_DICTIONARY:
		spawn_position = Vector2(float(pos.get("x", 0.0)), float(pos.get("y", 0.0)))
	current_district = String(parsed.get("current_district", current_district))
	ftue_seen = bool(parsed.get("ftue_seen", false))
	var unlocked: Variant = parsed.get("fast_travel_unlocked", {})
	if typeof(unlocked) == TYPE_DICTIONARY:
		fast_travel_unlocked = unlocked
