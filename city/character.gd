## Character — the player's avatar (PRD §6.3). Click-to-move over the navmesh,
## WASD as direct drive that overrides the click target. Movement is a
## CharacterBody2D so building collision physically prevents walking through
## walls; the navmesh gives the path, and a straight-line fallback guarantees the
## character NEVER deadlocks if the nav map isn't ready or a point is off-mesh.
##
## The visual is a gray-box capsule for F0; the layered SKIN+HAT sprite
## composition (PRD §14.3) drops in by replacing _build_visual().
extends CharacterBody2D

const SPEED := 230.0  # tuned so a district crossing is brisk (PRD §6.3)
const ARRIVE_DIST := 10.0

var _agent: NavigationAgent2D
var _target := Vector2.ZERO
var _has_target := false
var _facing := 1.0
var _body_poly: Polygon2D


func _ready() -> void:
	motion_mode = CharacterBody2D.MOTION_MODE_FLOATING
	collision_layer = 1
	collision_mask = 2  # collide with buildings
	_build_collision()
	_build_visual()
	_agent = NavigationAgent2D.new()
	_agent.path_desired_distance = 8.0
	_agent.target_desired_distance = ARRIVE_DIST
	add_child(_agent)


func move_to(world_pos: Vector2) -> void:
	_target = world_pos
	_has_target = true
	_agent.target_position = world_pos


func _physics_process(_delta: float) -> void:
	var kb := _keyboard_vector()
	if kb != Vector2.ZERO:
		_has_target = false  # WASD overrides click (PRD §6.3)
		_drive(kb)
		return
	if not _has_target:
		velocity = Vector2.ZERO
		return
	if global_position.distance_to(_target) <= ARRIVE_DIST:
		_arrive()
		return
	var next := _agent.get_next_path_position()
	# Fallback: nav map not ready / point off-mesh → head straight for the target.
	if global_position.distance_to(next) < 1.0:
		next = _target
	_drive((next - global_position).normalized())


func _drive(dir: Vector2) -> void:
	velocity = dir * SPEED
	move_and_slide()
	if absf(dir.x) > 0.05:
		_facing = signf(dir.x)
		_body_poly.scale.x = _facing


func _arrive() -> void:
	_has_target = false
	velocity = Vector2.ZERO
	PlayerState.spawn_position = global_position


func _keyboard_vector() -> Vector2:
	var v := Input.get_vector("move_left", "move_right", "move_up", "move_down")
	return v.normalized() if v.length() > 1.0 else v


# ── Gray-box visual + collision ──────────────────────────────────────────────


func _build_collision() -> void:
	var cs := CollisionShape2D.new()
	var circle := CircleShape2D.new()
	circle.radius = 16.0
	cs.shape = circle
	cs.position = Vector2(0, -16)
	add_child(cs)


func _build_visual() -> void:
	# Soft ground shadow.
	var shadow := Polygon2D.new()
	shadow.polygon = _ellipse(26, 12)
	shadow.color = Color(0, 0, 0, 0.22)
	add_child(shadow)

	# Body capsule (drawn as a rounded column via a Polygon2D).
	_body_poly = Polygon2D.new()
	_body_poly.polygon = PackedVector2Array(
		[
			Vector2(-12, -18),
			Vector2(12, -18),
			Vector2(12, -52),
			Vector2(6, -64),
			Vector2(-6, -64),
			Vector2(-12, -52),
		]
	)
	_body_poly.color = Color(0.85, 0.5, 0.35)
	add_child(_body_poly)

	var head := Polygon2D.new()
	head.polygon = _ellipse(9, 9, Vector2(0, -72))
	head.color = Color(0.96, 0.82, 0.68)
	add_child(head)


func _ellipse(rx: float, ry: float, center: Vector2 = Vector2.ZERO, segments: int = 20) -> PackedVector2Array:
	var pts := PackedVector2Array()
	for i in segments:
		var a := TAU * float(i) / float(segments)
		pts.append(center + Vector2(cos(a) * rx, sin(a) * ry))
	return pts
