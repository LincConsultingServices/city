## City — the world scene orchestrator (PRD §6, §12.2). Builds the gray-box world
## entirely from code + manifests: ground grid, a single-quad navmesh, a Y-sorted
## world holding the character and every manifest-spawned building, the iso
## camera, and the HUD. The scene tree contains NO hardcoded building nodes.
##
## Click anywhere to move (PRD §6.3); the framework routes doors via proximity.
extends Node2D

const GRID_COLS := 22
const GRID_ROWS := 22

const GroundScript := preload("res://city/ground.gd")
const CharacterScript := preload("res://city/character.gd")
const CameraScript := preload("res://city/camera_rig.gd")
const BuildingManagerScript := preload("res://city/building_manager.gd")
const HudScene := preload("res://ui/hud/hud.tscn")

var _character: CharacterBody2D
var _camera: Camera2D
var _world: Node2D


func _ready() -> void:
	_build_ground()
	_build_navmesh()
	_build_world()
	_build_camera()
	_build_hud()
	PlayerState.set_district("civic_center")  # spawn plaza (PRD §6.1)


func _unhandled_input(event: InputEvent) -> void:
	if SceneRouter.has_overlay():
		return
	if event is InputEventMouseButton and event.pressed and event.button_index == MOUSE_BUTTON_LEFT:
		var world_pos := get_global_mouse_position()
		_character.move_to(world_pos)
		if _camera.has_method("snap_to_target"):
			_camera.snap_to_target()
		_spawn_click_marker(world_pos)


# ── World construction ───────────────────────────────────────────────────────


func _build_ground() -> void:
	var ground := Node2D.new()
	ground.set_script(GroundScript)
	add_child(ground)
	ground.call("configure", GRID_COLS, GRID_ROWS)


func _build_navmesh() -> void:
	# A single convex quad covering the whole grid. Buildings are solid via
	# collision, so this rock-solid walkable region is enough for F0; carving
	# footprint holes for true path-around routing is a fast-follow once it can
	# be smoke-tested in the editor (see docs/F0_STATUS.md).
	var region := NavigationRegion2D.new()
	var np := NavigationPolygon.new()
	np.vertices = _grid_corners()
	np.add_polygon(PackedInt32Array([0, 1, 2, 3]))
	region.navigation_polygon = np
	add_child(region)


func _build_world() -> void:
	_world = Node2D.new()
	_world.y_sort_enabled = true
	add_child(_world)

	_character = CharacterBody2D.new()
	_character.set_script(CharacterScript)
	_world.add_child(_character)
	var spawn := PlayerState.spawn_position
	if spawn == Vector2.ZERO:
		spawn = Iso.map_to_world(Vector2(GRID_COLS / 2.0, GRID_ROWS / 2.0))
	_character.global_position = spawn
	PlayerState.spawn_position = spawn

	var mgr := Node.new()
	mgr.set_script(BuildingManagerScript)
	add_child(mgr)
	mgr.call("spawn_all", _character, _world)


func _build_camera() -> void:
	_camera = Camera2D.new()
	_camera.set_script(CameraScript)
	add_child(_camera)
	_camera.set("target", _character)
	_camera.make_current()


func _build_hud() -> void:
	add_child(HudScene.instantiate())


# ── Helpers ──────────────────────────────────────────────────────────────────


func _grid_corners() -> PackedVector2Array:
	var hw := Iso.TILE_W * 0.5
	var hh := Iso.TILE_H * 0.5
	return PackedVector2Array(
		[
			Iso.map_to_world(Vector2(0, 0)) + Vector2(0, -hh),  # top
			Iso.map_to_world(Vector2(GRID_COLS - 1, 0)) + Vector2(hw, 0),  # right
			Iso.map_to_world(Vector2(GRID_COLS - 1, GRID_ROWS - 1)) + Vector2(0, hh),  # bottom
			Iso.map_to_world(Vector2(0, GRID_ROWS - 1)) + Vector2(-hw, 0),  # left
		]
	)


func _spawn_click_marker(pos: Vector2) -> void:
	var marker := Line2D.new()
	marker.width = 3.0
	marker.default_color = Color(1, 1, 1, 0.9)
	var pts := PackedVector2Array()
	for i in 24:
		var a := TAU * float(i) / 24.0
		pts.append(Vector2(cos(a), sin(a)) * 18.0)
	pts.append(pts[0])
	marker.points = pts
	marker.position = pos
	add_child(marker)
	var tw := create_tween()
	tw.tween_property(marker, "scale", Vector2(1.6, 1.6), 0.35)
	tw.parallel().tween_property(marker, "modulate:a", 0.0, 0.35)
	tw.tween_callback(marker.queue_free)
