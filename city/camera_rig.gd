## CameraRig — fixed iso camera (PRD §6.2): follows the character with soft lag,
## 3 zoom steps (street ↔ block ↔ district), no rotation. Free-pan on drag is a
## small F0 convenience; it snaps back to the character on the next move.
extends Camera2D

const ZOOM_STEPS := [Vector2(1.0, 1.0), Vector2(0.7, 0.7), Vector2(0.5, 0.5)]  # street → district

var target: Node2D
var _zoom_idx := 0
var _pan_offset := Vector2.ZERO
var _dragging := false


func _ready() -> void:
	position_smoothing_enabled = true
	position_smoothing_speed = 6.0
	zoom = ZOOM_STEPS[_zoom_idx]


func _process(_delta: float) -> void:
	if target:
		global_position = target.global_position + _pan_offset


func _unhandled_input(event: InputEvent) -> void:
	if SceneRouter.has_overlay():
		return
	if event is InputEventMouseButton and event.pressed:
		match event.button_index:
			MOUSE_BUTTON_WHEEL_UP:
				_zoom_step(-1)
			MOUSE_BUTTON_WHEEL_DOWN:
				_zoom_step(1)
			MOUSE_BUTTON_MIDDLE, MOUSE_BUTTON_RIGHT:
				_dragging = true
	elif event is InputEventMouseButton and not event.pressed:
		if event.button_index == MOUSE_BUTTON_MIDDLE or event.button_index == MOUSE_BUTTON_RIGHT:
			_dragging = false
	elif event is InputEventMouseMotion and _dragging:
		# Leashed free-pan (PRD §6.2): clamp to ~1.5 screens from the character.
		_pan_offset -= event.relative / zoom
		var leash := get_viewport_rect().size * 1.5
		_pan_offset = _pan_offset.clamp(-leash, leash)


func snap_to_target() -> void:
	_pan_offset = Vector2.ZERO


func _zoom_step(dir: int) -> void:
	var new_idx := clampi(_zoom_idx + dir, 0, ZOOM_STEPS.size() - 1)
	if new_idx == _zoom_idx:
		return
	_zoom_idx = new_idx
	var tw := create_tween()
	tw.tween_property(self, "zoom", ZOOM_STEPS[_zoom_idx], 0.2)
