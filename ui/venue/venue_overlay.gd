## VenueOverlay — the framework's overlay-mode venue interior (PRD §7.1). A venue
## whose manifest sets interiorScene = null runs its activity list here instead
## of in a bespoke scene, so a small venue needs zero scene work to be enterable.
##
## F0 shows the venue's framing + its hostedActivities from the manifest, proving
## the manifest → activity-list binding (PRD §7.2). The live activity list (bound
## to registry/progress) and the activity player itself land in F1 (§8).
extends Control

signal exit_requested

var manifest: Dictionary


func _ready() -> void:
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	mouse_filter = Control.MOUSE_FILTER_STOP
	_build()


func _unhandled_input(event: InputEvent) -> void:
	if event.is_action_pressed("cancel_panel"):
		_leave()
		get_viewport().set_input_as_handled()


func _leave() -> void:
	exit_requested.emit()


func _build() -> void:
	var dim := ColorRect.new()
	dim.color = Color(0.06, 0.07, 0.1, 0.9)
	dim.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	add_child(dim)

	var card := PanelContainer.new()
	card.custom_minimum_size = Vector2(560, 0)
	card.set_anchors_and_offsets_preset(Control.PRESET_CENTER)
	add_child(card)

	var pad := MarginContainer.new()
	for s in ["left", "right", "top", "bottom"]:
		pad.add_theme_constant_override("margin_" + s, 28)
	card.add_child(pad)

	var box := VBoxContainer.new()
	box.add_theme_constant_override("separation", 12)
	pad.add_child(box)

	var title := Label.new()
	title.text = String(manifest.get("displayName", "Venue"))
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	title.add_theme_font_size_override("font_size", 30)
	title.add_theme_color_override("font_color", Color(0.95, 0.86, 0.55))
	box.add_child(title)

	var subtitle := Label.new()
	subtitle.text = "Choose an activity"
	subtitle.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	subtitle.add_theme_color_override("font_color", Color(0.8, 0.82, 0.88))
	box.add_child(subtitle)

	box.add_child(HSeparator.new())

	var hosted: Array = manifest.get("hostedActivities", [])
	if hosted.is_empty():
		box.add_child(_muted("This venue has no activities listed yet."))
	else:
		for activity_id in hosted:
			box.add_child(_activity_row(String(activity_id)))

	box.add_child(HSeparator.new())

	var note := Label.new()
	note.text = "The activity player (all 13 types) arrives in F1."
	note.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	note.add_theme_color_override("font_color", Color(0.62, 0.66, 0.74))
	box.add_child(note)

	var leave := Button.new()
	leave.text = "Leave (Esc)"
	leave.custom_minimum_size = Vector2(0, 46)
	leave.pressed.connect(_leave)
	box.add_child(leave)


func _activity_row(activity_id: String) -> Control:
	var row := PanelContainer.new()
	var pad := MarginContainer.new()
	for s in ["left", "right", "top", "bottom"]:
		pad.add_theme_constant_override("margin_" + s, 10)
	row.add_child(pad)
	var hb := HBoxContainer.new()
	pad.add_child(hb)
	var id_label := Label.new()
	id_label.text = activity_id
	id_label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	hb.add_child(id_label)
	var chip := Label.new()
	chip.text = "Coming in F1"
	chip.add_theme_color_override("font_color", Color(0.7, 0.74, 0.82))
	hb.add_child(chip)
	return row


func _muted(text: String) -> Label:
	var l := Label.new()
	l.text = text
	l.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	l.add_theme_color_override("font_color", Color(0.7, 0.74, 0.82))
	return l
