## SceneRouter — the single owner of top-level flow and transitions (PRD §12.1):
## boot ↔ login ↔ city, plus venue enter/exit. Every transition fades (PRD §2
## "nothing pops"). UI and world code never call get_tree().change_scene_* directly.
##
## Venue model for F0: the placeholder venue has interiorScene = null, so the
## framework runs it as an OVERLAY over the city (PRD §7.1) rather than a scene
## swap. That means "exit → same spot" (PRD §7.2) is free: the city never
## unloaded, the character never moved.
extends Node

const LOGIN_SCENE := "res://ui/login/login.tscn"
const CITY_SCENE := "res://city/city.tscn"
const VENUE_OVERLAY := preload("res://ui/venue/venue_overlay.gd")

const FADE_TIME := 0.35

var _fade_layer: CanvasLayer
var _fade_rect: ColorRect
var _current_overlay: Control = null


func _ready() -> void:
	_build_fade_layer()
	# Central auth-loss handling (PRD §8.3, §10): any session_lost — token expiry
	# ApiClient couldn't refresh, or an explicit logout — returns to login.
	EventBus.session_lost.connect(_on_session_lost)


func _on_session_lost(_reason: String) -> void:
	if _current_overlay != null:
		exit_building()
	goto_login()


func goto_login() -> void:
	await _change_scene(LOGIN_SCENE)


func goto_city() -> void:
	await _change_scene(CITY_SCENE)


## Open a venue as an overlay above the live city (F0). `manifest` is the parsed
## building.json (see core/building_manifest.gd).
func enter_building(manifest: Dictionary) -> void:
	if _current_overlay != null:
		return
	var building_id := String(manifest.get("id", ""))
	PlayerState.current_venue = building_id
	EventBus.building_entered.emit(building_id)

	var overlay := VENUE_OVERLAY.new()
	overlay.manifest = manifest
	_current_overlay = overlay
	_fade_layer.add_child(overlay)
	_fade_layer.move_child(overlay, 0)  # sit under the fade rect so fades still cover it
	overlay.exit_requested.connect(exit_building)


func exit_building() -> void:
	if _current_overlay == null:
		return
	var building_id := PlayerState.current_venue
	_current_overlay.queue_free()
	_current_overlay = null
	PlayerState.current_venue = ""
	PlayerState.mark_venue_visited(building_id)  # unlock fast travel after first visit (PRD §6.6)
	EventBus.building_exited.emit(building_id)


func has_overlay() -> bool:
	return _current_overlay != null


# ── Fade machinery ───────────────────────────────────────────────────────────


func _change_scene(path: String) -> void:
	await fade_out()
	var err := get_tree().change_scene_to_file(path)
	if err != OK:
		push_error("SceneRouter: failed to load %s (%d)." % [path, err])
	await get_tree().process_frame
	await fade_in()


func fade_out() -> void:
	_fade_rect.visible = true
	var tw := create_tween()
	tw.tween_property(_fade_rect, "color:a", 1.0, FADE_TIME)
	await tw.finished


func fade_in() -> void:
	var tw := create_tween()
	tw.tween_property(_fade_rect, "color:a", 0.0, FADE_TIME)
	await tw.finished
	_fade_rect.visible = false


func _build_fade_layer() -> void:
	_fade_layer = CanvasLayer.new()
	_fade_layer.layer = 128  # above everything
	add_child(_fade_layer)
	_fade_rect = ColorRect.new()
	_fade_rect.color = Color(0.05, 0.06, 0.09, 0.0)
	_fade_rect.set_anchors_preset(Control.PRESET_FULL_RECT)
	_fade_rect.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_fade_rect.visible = false
	_fade_layer.add_child(_fade_rect)
