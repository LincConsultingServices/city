## Login screen (PRD §5.2, §10). Email + password → Firebase → bootstrap → city.
##
## Sign-up NEVER happens here (PRD non-negotiable). Two paths reach registration:
##   1. Firebase returns EMAIL_NOT_FOUND → the interstitial opens automatically.
##   2. A persistent "New to WarRoom? Register" link is ALWAYS visible — because
##      Firebase email-enumeration protection can report an unknown email as the
##      generic INVALID_LOGIN_CREDENTIALS, so we never rely on the code alone.
## Either way the register button opens AppConfig.register_url in a new tab; the
## backend never supplies a redirectUrl (it auto-provisions), so the URL is ours.
extends Control

var _email: LineEdit
var _password: LineEdit
var _remember: CheckBox
var _login_btn: Button
var _error: Label
var _interstitial: Control
var _busy := false


func _ready() -> void:
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	_build_backdrop()
	_build_card()
	_build_interstitial()
	if not AppConfig.is_configured():
		_show_error("Set the Firebase web API key in config/app_config.json to enable sign-in.")


# ── Actions ──────────────────────────────────────────────────────────────────


func _on_login_pressed() -> void:
	if _busy:
		return
	var email := _email.text.strip_edges()
	var password := _password.text
	if email.is_empty() or password.is_empty():
		_show_error("Enter your email and password.")
		return
	_set_busy(true)
	_clear_error()
	var outcome := await Session.login(email, password, _remember.button_pressed)
	_set_busy(false)

	match String(outcome.get("status", "error")):
		"ok":
			SceneRouter.goto_city()
		"unregistered":
			_show_interstitial()
		_:
			_show_error(String(outcome.get("message", "Sign-in failed.")))


func _open_register() -> void:
	var url := AppConfig.register_url
	if OS.has_feature("web"):
		JavaScriptBridge.eval('window.open("%s", "_blank")' % url, true)
	else:
		OS.shell_open(url)


func _show_interstitial() -> void:
	_interstitial.visible = true


func _hide_interstitial() -> void:
	_interstitial.visible = false


# ── UI construction (code-built for skeleton robustness — see F0_STATUS) ─────


func _build_backdrop() -> void:
	var bg := ColorRect.new()
	bg.color = Color(0.10, 0.12, 0.18)
	bg.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	bg.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(bg)
	# Placeholder "city skyline" band (PRD §5.2). Real art lands in F0 art pass.
	var skyline := ColorRect.new()
	skyline.color = Color(0.16, 0.20, 0.30)
	skyline.anchor_top = 0.62
	skyline.anchor_right = 1.0
	skyline.anchor_bottom = 1.0
	skyline.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(skyline)


func _build_card() -> void:
	var card := PanelContainer.new()
	card.custom_minimum_size = Vector2(420, 0)
	card.set_anchors_and_offsets_preset(Control.PRESET_CENTER)
	add_child(card)

	var pad := MarginContainer.new()
	for side in ["left", "right", "top", "bottom"]:
		pad.add_theme_constant_override("margin_" + side, 28)
	card.add_child(pad)

	var box := VBoxContainer.new()
	box.add_theme_constant_override("separation", 12)
	pad.add_child(box)

	var title := Label.new()
	title.text = "THE CITY"
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	title.add_theme_font_size_override("font_size", 40)
	title.add_theme_color_override("font_color", Color(0.95, 0.86, 0.55))
	box.add_child(title)

	var subtitle := Label.new()
	subtitle.text = "Sign in with your WarRoom account"
	subtitle.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	subtitle.add_theme_color_override("font_color", Color(0.78, 0.80, 0.86))
	box.add_child(subtitle)

	box.add_child(_spacer(8))

	_email = LineEdit.new()
	_email.placeholder_text = "Email"
	_email.custom_minimum_size = Vector2(0, 44)  # ≥40px hit target (PRD §5.4)
	box.add_child(_email)

	_password = LineEdit.new()
	_password.placeholder_text = "Password"
	_password.secret = true
	_password.custom_minimum_size = Vector2(0, 44)
	_password.text_submitted.connect(func(_t): _on_login_pressed())
	box.add_child(_password)

	_remember = CheckBox.new()
	_remember.text = "Remember me on this device"
	box.add_child(_remember)

	_login_btn = Button.new()
	_login_btn.text = "Enter the city"
	_login_btn.custom_minimum_size = Vector2(0, 46)
	_login_btn.pressed.connect(_on_login_pressed)
	box.add_child(_login_btn)

	_error = Label.new()
	_error.add_theme_color_override("font_color", Color(0.95, 0.55, 0.5))
	_error.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_error.visible = false
	box.add_child(_error)

	box.add_child(HSeparator.new())

	var register_row := HBoxContainer.new()
	register_row.alignment = BoxContainer.ALIGNMENT_CENTER
	box.add_child(register_row)
	var prompt := Label.new()
	prompt.text = "New to WarRoom?"
	prompt.add_theme_color_override("font_color", Color(0.78, 0.80, 0.86))
	register_row.add_child(prompt)
	var register_link := Button.new()
	register_link.text = "Register"
	register_link.flat = true
	register_link.add_theme_color_override("font_color", Color(0.6, 0.78, 1.0))
	register_link.pressed.connect(_show_interstitial)
	register_row.add_child(register_link)


func _build_interstitial() -> void:
	_interstitial = Control.new()
	_interstitial.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	_interstitial.visible = false
	add_child(_interstitial)

	var dim := ColorRect.new()
	dim.color = Color(0.05, 0.06, 0.09, 0.85)
	dim.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	_interstitial.add_child(dim)

	var card := PanelContainer.new()
	card.custom_minimum_size = Vector2(480, 0)
	card.set_anchors_and_offsets_preset(Control.PRESET_CENTER)
	_interstitial.add_child(card)

	var pad := MarginContainer.new()
	for side in ["left", "right", "top", "bottom"]:
		pad.add_theme_constant_override("margin_" + side, 28)
	card.add_child(pad)

	var box := VBoxContainer.new()
	box.add_theme_constant_override("separation", 14)
	pad.add_child(box)

	var heading := Label.new()
	heading.text = "Your WarRoom account is your ticket into the city"
	heading.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	heading.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	heading.add_theme_font_size_override("font_size", 22)
	heading.add_theme_color_override("font_color", Color(0.95, 0.86, 0.55))
	box.add_child(heading)

	var body := Label.new()
	body.text = (
		"We couldn't find an account for that email. Registration happens on the main "
		+ "WarRoom site — set up your account there, then come back and sign in."
	)
	body.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	body.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	body.add_theme_color_override("font_color", Color(0.82, 0.84, 0.9))
	box.add_child(body)

	box.add_child(_spacer(6))

	var open_btn := Button.new()
	open_btn.text = "Open registration ↗"
	open_btn.custom_minimum_size = Vector2(0, 46)
	open_btn.pressed.connect(_open_register)
	box.add_child(open_btn)

	var retry_btn := Button.new()
	retry_btn.text = "I've registered — try again"
	retry_btn.custom_minimum_size = Vector2(0, 44)
	retry_btn.pressed.connect(_hide_interstitial)
	box.add_child(retry_btn)

	var back_btn := Button.new()
	back_btn.text = "Back"
	back_btn.flat = true
	back_btn.pressed.connect(_hide_interstitial)
	box.add_child(back_btn)


# ── Helpers ──────────────────────────────────────────────────────────────────


func _set_busy(busy: bool) -> void:
	_busy = busy
	_login_btn.disabled = busy
	_login_btn.text = "Signing in…" if busy else "Enter the city"


func _show_error(msg: String) -> void:
	_error.text = msg
	_error.visible = true


func _clear_error() -> void:
	_error.visible = false


func _spacer(h: int) -> Control:
	var c := Control.new()
	c.custom_minimum_size = Vector2(0, h)
	return c
