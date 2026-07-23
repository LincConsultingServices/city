## Economy — mirrors of wallet / inventory / avatar, updated ONLY from server
## responses (PRD §9, §11.2). The client never invents coins or awards (PRD §8.2).
##
## F0 STATUS (see docs/F0_STATUS.md): the live backend has NO wallet / shop /
## inventory / avatar routes and its submit response carries NO coinsEarned /
## coinBalance yet — the whole economy is a §11.3 future extension. So this
## autoload is a WIRED-BUT-UNFED seam: the plumbing (apply_submit_response →
## EventBus) is complete and unit-testable, and it starts feeding the moment the
## backend returns those fields (F1/F2). It deliberately holds no fake data.
extends Node

const UNKNOWN_BALANCE := -1

var coin_balance := UNKNOWN_BALANCE  # -1 until the first server response
var inventory: Array = []  # owned cosmetics (GET /inventory — future)
var equipped := {}  # { SKIN, HAT, BACKGROUND, PET } (GET /avatar — future)


func has_balance() -> bool:
	return coin_balance != UNKNOWN_BALANCE


## Fold a submit response into the mirrors and announce changes. Server is the
## only source (PRD §8.2). Safe to call with today's response (no coin fields) —
## it simply emits nothing for coins and whatever badges the server did award.
func apply_submit_response(resp: Dictionary) -> void:
	if resp.has("coinBalance"):
		var new_balance := int(resp["coinBalance"])
		var delta := int(resp.get("coinsEarned", 0))
		coin_balance = new_balance
		EventBus.coins_changed.emit(new_balance, delta)
	for badge in resp.get("badgesAwarded", []):
		if typeof(badge) == TYPE_DICTIONARY:
			EventBus.badge_awarded.emit(badge)


## Direct wallet set (from a future GET /me or GET /wallet response).
func set_balance(balance: int) -> void:
	coin_balance = balance
	EventBus.coins_changed.emit(balance, 0)


func reset() -> void:
	coin_balance = UNKNOWN_BALANCE
	inventory = []
	equipped = {}
