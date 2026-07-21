## BuildingExterior — the framework's identical-for-every-venue exterior (PRD
## §6.5, §7.3). Renders a gray-box iso block + sign + door from the manifest, and
## owns approach → prompt → enter. Buildings never implement any of this; they
## only ship the manifest and (later) real exterior art.
##
## F0 renders a gray box; the real §14 sprite drops in by swapping _draw for a
## Sprite2D without touching interaction. Depth uses the parent's Y-sort, so this
## node's `position` is its footprint centroid and it draws relative to that.
extends Node2D

signal enter_requested(manifest: Dictionary)

const BUILDING_HEIGHT := 130.0
const INTERACT_RANGE := 96.0

var manifest: Dictionary
var _state := "open"  # open | new | locked (PRD §6.5)
var _entrance_world := Vector2.ZERO
var _in_range := false
var _player: Node2D
var _prompt: Label

# Floor-diamond corners (world space) and centroid, cached for _draw + collision.
var _corners: PackedVector2Array
var _centroid := Vector2.ZERO


func setup(m: Dictionary, player: Node2D) -> void:
	manifest = m
	_player = player
	_state = "locked" if not bool(m.get("enabled", true)) else "open"
	_compute_geometry()
	position = _centroid
	_build_collision()
	_build_door()
	_build_labels()
	queue_redraw()


# ── Geometry ─────────────────────────────────────────────────────────────────


func _compute_geometry() -> void:
	var cells := BuildingManifest.footprint_cells(manifest)
	var min_c := Vector2i(cells[0])
	var max_c := Vector2i(cells[0])
	for c in cells:
		min_c.x = mini(min_c.x, c.x)
		min_c.y = mini(min_c.y, c.y)
		max_c.x = maxi(max_c.x, c.x)
		max_c.y = maxi(max_c.y, c.y)
	var hw := Iso.TILE_W * 0.5
	var hh := Iso.TILE_H * 0.5
	var top := Iso.map_to_world_i(Vector2i(min_c.x, min_c.y)) + Vector2(0, -hh)
	var right := Iso.map_to_world_i(Vector2i(max_c.x, min_c.y)) + Vector2(hw, 0)
	var bottom := Iso.map_to_world_i(Vector2i(max_c.x, max_c.y)) + Vector2(0, hh)
	var left := Iso.map_to_world_i(Vector2i(min_c.x, max_c.y)) + Vector2(-hw, 0)
	_corners = PackedVector2Array([top, right, bottom, left])
	_centroid = (top + right + bottom + left) * 0.25
	_entrance_world = Iso.map_to_world_i(BuildingManifest.entrance_cell(manifest))


func _local(world_pt: Vector2) -> Vector2:
	return world_pt - _centroid


# ── Drawing (gray-box; replace with a Sprite2D for real art) ─────────────────


func _draw() -> void:
	var up := Vector2(0, -BUILDING_HEIGHT)
	var floor_c := _corners
	var roof := PackedVector2Array()
	for p in floor_c:
		roof.append(_local(p) + up)
	var l_floor := PackedVector2Array()
	for p in floor_c:
		l_floor.append(_local(p))

	var pal := _palette()
	var c_floor: Color = pal["floor"]
	var c_left: Color = pal["left"]
	var c_right: Color = pal["right"]
	var c_roof: Color = pal["roof"]
	var c_line: Color = pal["line"]
	# Floor diamond
	draw_colored_polygon(l_floor, c_floor)
	# Left face  (left → bottom)
	draw_colored_polygon(PackedVector2Array([l_floor[3], l_floor[2], roof[2], roof[3]]), c_left)
	# Right face (bottom → right)
	draw_colored_polygon(PackedVector2Array([l_floor[2], l_floor[1], roof[1], roof[2]]), c_right)
	# Roof
	draw_colored_polygon(roof, c_roof)
	# Outlines for readability
	_outline(l_floor, c_line)
	_outline(roof, c_line)
	draw_line(l_floor[1], roof[1], c_line, 1.5)
	draw_line(l_floor[2], roof[2], c_line, 1.5)
	draw_line(l_floor[3], roof[3], c_line, 1.5)


func _outline(poly: PackedVector2Array, c: Color) -> void:
	var closed := poly.duplicate()
	closed.append(poly[0])
	draw_polyline(closed, c, 1.5, true)


func _palette() -> Dictionary:
	match _state:
		"locked":
			return {
				"floor": Color(0.55, 0.56, 0.6),
				"left": Color(0.45, 0.46, 0.5),
				"right": Color(0.5, 0.51, 0.55),
				"roof": Color(0.6, 0.61, 0.65),
				"line": Color(0.3, 0.31, 0.34, 0.7)
			}
		_:
			return {
				"floor": Color(0.7, 0.62, 0.5),
				"left": Color(0.52, 0.56, 0.66),
				"right": Color(0.62, 0.66, 0.76),
				"roof": Color(0.82, 0.72, 0.5),
				"line": Color(0.25, 0.26, 0.3, 0.7)
			}


# ── Collision + door + labels ────────────────────────────────────────────────


func _build_collision() -> void:
	var body := StaticBody2D.new()
	body.collision_layer = 2  # buildings
	body.collision_mask = 0
	add_child(body)
	var shape := CollisionPolygon2D.new()
	var local_poly := PackedVector2Array()
	for p in _corners:
		local_poly.append(_local(p))
	shape.polygon = local_poly
	body.add_child(shape)


func _build_door() -> void:
	# Door is a proximity trigger only. Movement is handled centrally by the city
	# (ground click), so the door doesn't consume clicks — avoiding double-routing.
	var door := Area2D.new()
	door.collision_layer = 0
	door.collision_mask = 1  # detects the player
	door.input_pickable = false
	door.position = _local(_entrance_world)
	add_child(door)
	var cs := CollisionShape2D.new()
	var circle := CircleShape2D.new()
	circle.radius = INTERACT_RANGE
	cs.shape = circle
	door.add_child(cs)
	door.body_entered.connect(_on_body_entered)
	door.body_exited.connect(_on_body_exited)


func _build_labels() -> void:
	var sign_label := Label.new()
	sign_label.text = String(manifest.get("displayName", "Venue"))
	sign_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	sign_label.add_theme_font_size_override("font_size", 18)
	sign_label.add_theme_color_override("font_color", Color(0.15, 0.16, 0.2))
	sign_label.add_theme_color_override("font_outline_color", Color(1, 1, 1, 0.8))
	sign_label.add_theme_constant_override("outline_size", 4)
	sign_label.position = Vector2(-90, -BUILDING_HEIGHT - 44)
	sign_label.custom_minimum_size = Vector2(180, 0)
	add_child(sign_label)

	if _state == "locked":
		var lock := Label.new()
		lock.text = "🔒 Coming soon"
		lock.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		lock.position = Vector2(-90, -BUILDING_HEIGHT - 22)
		lock.custom_minimum_size = Vector2(180, 0)
		add_child(lock)

	_prompt = Label.new()
	_prompt.text = "Press E or click to enter"
	_prompt.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_prompt.add_theme_color_override("font_color", Color(1, 1, 1))
	_prompt.add_theme_color_override("font_outline_color", Color(0, 0, 0, 0.8))
	_prompt.add_theme_constant_override("outline_size", 5)
	_prompt.position = Vector2(-90, 8)
	_prompt.custom_minimum_size = Vector2(180, 0)
	_prompt.visible = false
	add_child(_prompt)


# ── Interaction ──────────────────────────────────────────────────────────────


func _process(_delta: float) -> void:
	if _in_range and not SceneRouter.has_overlay() and Input.is_action_just_pressed("interact"):
		_try_enter()


func _on_body_entered(body: Node2D) -> void:
	if body == _player and _state != "locked":
		_in_range = true
		_prompt.visible = true


func _on_body_exited(body: Node2D) -> void:
	if body == _player:
		_in_range = false
		if _prompt:
			_prompt.visible = false


func _try_enter() -> void:
	if _state == "locked":
		EventBus.toast_requested.emit("%s isn't open yet." % manifest.get("displayName", "This venue"), "info")
		return
	enter_requested.emit(manifest)
