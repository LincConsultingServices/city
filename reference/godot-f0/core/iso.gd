## Iso — the one isometric projection (PRD §6.2: fixed 2:1 diamond, no rotation).
## Keeping the transform in a single static helper is what keeps the art pipeline
## sane (PRD §14): every tile, footprint, and draw call agrees on one mapping.
##
## World space is pixels (what Camera2D/Node2D use). Map space is diamond cells.
class_name Iso
extends RefCounted

const TILE_W := 256.0  # diamond width  (PRD §14.2 example)
const TILE_H := 128.0  # diamond height (2:1)


## Cell (col, row) → world pixel at the cell's CENTER.
static func map_to_world(cell: Vector2) -> Vector2:
	return Vector2((cell.x - cell.y) * (TILE_W * 0.5), (cell.x + cell.y) * (TILE_H * 0.5))


static func map_to_world_i(cell: Vector2i) -> Vector2:
	return map_to_world(Vector2(cell))


## World pixel → fractional cell. Round for the nearest tile.
static func world_to_map(pos: Vector2) -> Vector2:
	var a := pos.x / (TILE_W * 0.5)
	var b := pos.y / (TILE_H * 0.5)
	return Vector2((a + b) * 0.5, (b - a) * 0.5)


static func world_to_cell(pos: Vector2) -> Vector2i:
	var c := world_to_map(pos)
	return Vector2i(roundi(c.x), roundi(c.y))


## The 4 corner points (world space) of a cell's diamond — for _draw().
static func tile_polygon(cell: Vector2) -> PackedVector2Array:
	var c := map_to_world(cell)
	var hw := TILE_W * 0.5
	var hh := TILE_H * 0.5
	return PackedVector2Array(
		[
			c + Vector2(0, -hh),  # top
			c + Vector2(hw, 0),  # right
			c + Vector2(0, hh),  # bottom
			c + Vector2(-hw, 0),  # left
		]
	)
