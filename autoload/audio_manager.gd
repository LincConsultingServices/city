## AudioManager — the single audio surface (PRD §15). All playback goes through
## here; building scenes never spawn their own AudioStreamPlayers, they register
## ambience on these buses (PRD §7.3). Buses are created in code so the project
## has no fragile binary bus-layout resource to merge.
##
## F0 scope: the bus graph, per-bus volume, master mute, and local persistence
## are real and working. There are no CC0 audio assets in the F0 skeleton yet
## (that's F4), so play_* calls are safe no-ops when a stream isn't registered.
## The TTS narration channel (PRD §16) is reserved as a named bus now so it is
## never an afterthought.
extends Node

const SETTINGS_FILE := "user://audio.cfg"
const BUSES := ["Music", "Ambient", "SFX", "UI", "Narration"]

var _players := {}  # bus_name -> AudioStreamPlayer (for one-shot/looped playback)


func _ready() -> void:
	_ensure_buses()
	_load_settings()


# ── Public API ───────────────────────────────────────────────────────────────


func set_bus_volume_linear(bus_name: String, linear: float) -> void:
	var idx := AudioServer.get_bus_index(bus_name)
	if idx == -1:
		return
	AudioServer.set_bus_volume_db(idx, linear_to_db(clampf(linear, 0.0, 1.0)))
	_save_settings()


func get_bus_volume_linear(bus_name: String) -> float:
	var idx := AudioServer.get_bus_index(bus_name)
	if idx == -1:
		return 0.0
	return db_to_linear(AudioServer.get_bus_volume_db(idx))


func set_master_mute(muted: bool) -> void:
	AudioServer.set_bus_mute(AudioServer.get_bus_index("Master"), muted)
	_save_settings()


func is_master_muted() -> bool:
	return AudioServer.is_bus_mute(AudioServer.get_bus_index("Master"))


## Play a one-shot on a bus. No-op until real streams are registered (F4).
func play_sfx(stream: AudioStream, bus: String = "SFX") -> void:
	if stream == null:
		return
	var p: AudioStreamPlayer = _players.get(bus, null)
	if p == null:
		return
	p.stream = stream
	p.play()


# ── Internals ────────────────────────────────────────────────────────────────


func _ensure_buses() -> void:
	for bus_name in BUSES:
		if AudioServer.get_bus_index(bus_name) == -1:
			var idx := AudioServer.bus_count
			AudioServer.add_bus(idx)
			AudioServer.set_bus_name(idx, bus_name)
			AudioServer.set_bus_send(idx, "Master")
		# one reusable player per bus for framework-driven playback
		if not _players.has(bus_name):
			var p := AudioStreamPlayer.new()
			p.bus = bus_name
			add_child(p)
			_players[bus_name] = p


func _save_settings() -> void:
	var data := {"master_muted": is_master_muted()}
	for bus_name in BUSES:
		data[bus_name] = get_bus_volume_linear(bus_name)
	var f := FileAccess.open(SETTINGS_FILE, FileAccess.WRITE)
	if f == null:
		return
	f.store_string(JSON.stringify(data))
	f.close()


func _load_settings() -> void:
	if not FileAccess.file_exists(SETTINGS_FILE):
		return
	var parsed: Variant = JSON.parse_string(FileAccess.get_file_as_string(SETTINGS_FILE))
	if typeof(parsed) != TYPE_DICTIONARY:
		return
	set_master_mute(bool(parsed.get("master_muted", false)))
	for bus_name in BUSES:
		if parsed.has(bus_name):
			set_bus_volume_linear(bus_name, float(parsed[bus_name]))
