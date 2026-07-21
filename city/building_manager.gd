## BuildingManager — instances venues from manifests at city load (PRD §12.2).
## The city scene holds NO hardcoded building nodes; this reads buildings/*/
## building.json via BuildingManifest and spawns one BuildingExterior each,
## parented into the city's Y-sorted world so depth is correct. That is the whole
## plug-in contract in practice: drop a folder, get a building.
extends Node

const BuildingExteriorScript := preload("res://city/building_exterior.gd")

var manifests: Array = []  # exposed so the navmesh could carve footprints later


## Spawn every valid manifest into `world_parent` (the Y-sorted container), with
## `player` for proximity detection.
func spawn_all(player: Node2D, world_parent: Node2D) -> void:
	manifests = BuildingManifest.load_all()
	if manifests.is_empty():
		push_warning("BuildingManager: no valid building manifests under res://buildings/.")
	for m in manifests:
		var ext := Node2D.new()
		ext.set_script(BuildingExteriorScript)
		world_parent.add_child(ext)
		ext.setup(m, player)
		ext.enter_requested.connect(_on_enter_requested)


func _on_enter_requested(manifest: Dictionary) -> void:
	# The framework owns enter/exit (PRD §7.2). SceneRouter guards re-entry.
	SceneRouter.enter_building(manifest)
