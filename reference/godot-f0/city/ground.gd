## Ground — the gray-box isometric floor (PRD §6, F0). Draws a checkered diamond
## grid so the iso projection and click-to-move read clearly before any real
## TileMapLayer art exists. Replaced wholesale by an atlased TileMapLayer in the
## art pass; nothing else depends on how the floor is drawn.
extends Node2D

var cols := 20
var rows := 20


func configure(c: int, r: int) -> void:
	cols = c
	rows = r
	queue_redraw()


func _draw() -> void:
	var line_c := Color(0.6, 0.64, 0.7, 0.5)
	for y in rows:
		for x in cols:
			var poly := Iso.tile_polygon(Vector2(x, y))
			var checker := (x + y) % 2 == 0
			var fill := Color(0.82, 0.85, 0.89) if checker else Color(0.77, 0.81, 0.86)
			draw_colored_polygon(poly, fill)
			var closed := poly.duplicate()
			closed.append(poly[0])
			draw_polyline(closed, line_c, 1.0, true)
