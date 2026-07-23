## Boot — the main scene. Decides where a fresh tab lands: straight into the city
## if a remembered session can be silently restored (PRD §10), otherwise the
## login screen. Also the place the branded loader would live on the web
## (index.html handles the pre-engine loader; this covers the post-engine gap).
extends Control

var _status: Label


func _ready() -> void:
	AppConfig.ensure_loaded()
	_build_ui()
	# Give the engine one frame so the loader is actually painted before we block
	# on the network.
	await get_tree().process_frame

	_status.text = "Entering the city…"
	var logged_in := await Session.restore_session()
	if logged_in:
		SceneRouter.goto_city()
	else:
		SceneRouter.goto_login()


func _build_ui() -> void:
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	var bg := ColorRect.new()
	bg.color = Color(0.11, 0.13, 0.19)
	bg.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	bg.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(bg)

	var box := VBoxContainer.new()
	box.set_anchors_and_offsets_preset(Control.PRESET_CENTER)
	box.alignment = BoxContainer.ALIGNMENT_CENTER
	add_child(box)

	var title := Label.new()
	title.text = "THE CITY"
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	title.add_theme_font_size_override("font_size", 42)
	title.add_theme_color_override("font_color", Color(0.95, 0.86, 0.55))
	box.add_child(title)

	_status = Label.new()
	_status.text = "Loading…"
	_status.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_status.add_theme_font_size_override("font_size", 16)
	_status.add_theme_color_override("font_color", Color(0.8, 0.82, 0.88))
	box.add_child(_status)
