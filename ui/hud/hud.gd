## HUD — the persistent, minimal overlay (PRD §9.1): avatar chip (top-left),
## coin balance (top-right), map button (bottom-right), toast lane (top-center).
## Source of truth for coins is the last server response via Economy/EventBus —
## the HUD never computes a balance (PRD §8.2).
##
## F0: coins render "—" because the backend has no wallet yet (see F0_STATUS);
## the coins_changed wiring is live and starts animating the moment a submit
## response carries coinBalance. Customization + map open toasts (F2 / later).
extends CanvasLayer

var _coin_label: Label
var _toast_lane: VBoxContainer


func _ready() -> void:
	_build()
	EventBus.coins_changed.connect(_on_coins_changed)
	EventBus.badge_awarded.connect(_on_badge_awarded)
	EventBus.toast_requested.connect(_show_toast)
	EventBus.network_error.connect(func(msg): _show_toast(msg, "error"))
	_refresh_coins()


# ── Build ────────────────────────────────────────────────────────────────────


func _build() -> void:
	var root := Control.new()
	root.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	root.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(root)

	_build_avatar_chip(root)
	_build_coin_pill(root)
	_build_map_button(root)
	_build_toast_lane(root)


func _build_avatar_chip(root: Control) -> void:
	var chip := Button.new()
	chip.flat = true
	chip.position = Vector2(16, 16)
	chip.custom_minimum_size = Vector2(0, 48)
	var player_name := Session.display_name
	if player_name.strip_edges().is_empty():
		player_name = Session.user_email
	if player_name.strip_edges().is_empty():
		player_name = "Player"
	chip.text = "  ◍  %s" % player_name
	chip.add_theme_font_size_override("font_size", 16)
	chip.pressed.connect(func(): _show_toast("Character customization opens in F2.", "info"))
	root.add_child(chip)

	var logout := Button.new()
	logout.text = "Log out"
	logout.flat = true
	logout.position = Vector2(16, 64)
	logout.add_theme_color_override("font_color", Color(0.8, 0.82, 0.88))
	logout.pressed.connect(func(): Session.logout())
	root.add_child(logout)


func _build_coin_pill(root: Control) -> void:
	var pill := PanelContainer.new()
	pill.set_anchors_and_offsets_preset(Control.PRESET_TOP_RIGHT)
	pill.position = Vector2(-150, 16)
	root.add_child(pill)

	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 8)
	pill.add_child(row)

	var pad := MarginContainer.new()
	for s in ["left", "right", "top", "bottom"]:
		pad.add_theme_constant_override("margin_" + s, 10)
	row.add_child(pad)

	var inner := HBoxContainer.new()
	inner.add_theme_constant_override("separation", 8)
	pad.add_child(inner)

	var coin := Label.new()
	coin.text = "🪙"
	coin.add_theme_font_size_override("font_size", 20)
	inner.add_child(coin)

	_coin_label = Label.new()
	_coin_label.add_theme_font_size_override("font_size", 20)
	_coin_label.tooltip_text = "Coins arrive from server-scored activities (F1+)."
	inner.add_child(_coin_label)


func _build_map_button(root: Control) -> void:
	var map := Button.new()
	map.text = "🗺  Map"
	map.set_anchors_and_offsets_preset(Control.PRESET_BOTTOM_RIGHT)
	map.position = Vector2(-120, -56)
	map.custom_minimum_size = Vector2(104, 44)
	map.pressed.connect(func(): _show_toast("The city map opens in a later phase.", "info"))
	root.add_child(map)


func _build_toast_lane(root: Control) -> void:
	_toast_lane = VBoxContainer.new()
	_toast_lane.alignment = BoxContainer.ALIGNMENT_BEGIN
	_toast_lane.set_anchors_and_offsets_preset(Control.PRESET_CENTER_TOP)
	_toast_lane.position = Vector2(-180, 16)
	_toast_lane.custom_minimum_size = Vector2(360, 0)
	_toast_lane.mouse_filter = Control.MOUSE_FILTER_IGNORE
	root.add_child(_toast_lane)


# ── Reactions ────────────────────────────────────────────────────────────────


func _refresh_coins() -> void:
	_coin_label.text = str(Economy.coin_balance) if Economy.has_balance() else "—"


func _on_coins_changed(balance: int, delta: int) -> void:
	_coin_label.text = str(balance)
	var tw := create_tween()
	tw.tween_property(_coin_label, "scale", Vector2(1.25, 1.25), 0.12)
	tw.tween_property(_coin_label, "scale", Vector2.ONE, 0.12)
	if delta > 0:
		_show_toast("+%d coins" % delta, "reward")


func _on_badge_awarded(badge: Dictionary) -> void:
	_show_toast("🏅 Badge earned: %s" % badge.get("name", "New badge"), "reward")


func _show_toast(text: String, kind: String) -> void:
	var panel := PanelContainer.new()
	panel.modulate.a = 0.0
	var pad := MarginContainer.new()
	for s in ["left", "right", "top", "bottom"]:
		pad.add_theme_constant_override("margin_" + s, 10)
	panel.add_child(pad)
	var label := Label.new()
	label.text = text
	label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	label.add_theme_color_override("font_color", _toast_color(kind))
	pad.add_child(label)
	_toast_lane.add_child(panel)

	var tw := create_tween()
	tw.tween_property(panel, "modulate:a", 1.0, 0.2)
	tw.tween_interval(2.6)
	tw.tween_property(panel, "modulate:a", 0.0, 0.4)
	tw.tween_callback(panel.queue_free)


func _toast_color(kind: String) -> Color:
	match kind:
		"error":
			return Color(0.98, 0.6, 0.55)
		"reward":
			return Color(0.98, 0.86, 0.5)
		_:
			return Color(0.92, 0.94, 0.98)
