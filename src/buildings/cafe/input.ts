// Which key presses the room acts on.
//
// Pulled out of Interior.tsx so the guards are testable without mounting a
// canvas, and so there is one place that says what "press E" means indoors. The
// vocabulary is the city's: `E` enters a venue on the street (ui/CityScreen.tsx)
// and `E` works whatever is in reach in here, with `Enter` alongside it because
// a keyboard-only player arrives at the room through buttons.
//
// Both guards exist because of a real failure mode rather than a hypothetical:
//
//   * **locked** — a panel is up, so the room is not listening. Without it a
//     second press opens a second overlay on top of the first.
//   * **repeat** — the key is being held and the browser is auto-repeating.
//     Without it, holding E beside the counter flap toggles the flap every
//     repeat, because a gate is the one action that sets no lock. One physical
//     press is one action.
//
// Escape takes the same repeat guard: held down, it would close the dialogue,
// then the panel, then walk you out of the building, all inside a second.

/** What the room answers to. `Enter` for the keyboard-only path. */
export const INTERACT_KEYS: readonly string[] = ["e", "E", "Enter"];

export const CANCEL_KEY = "Escape";

/** The half of a `KeyboardEvent` this decision needs. */
export interface KeyPress {
  key: string;
  repeat?: boolean;
}

/** Should this press run the interaction ladder? */
export function wantsInteract(press: KeyPress, inputLocked: boolean): boolean {
  if (!INTERACT_KEYS.includes(press.key)) return false;
  if (inputLocked) return false;
  return !press.repeat;
}

/**
 * Should this press unwind one layer? Not gated on `inputLocked` — a panel being
 * up is the usual reason to press it, and it is how the player gets out.
 */
export function wantsCancel(press: KeyPress): boolean {
  return press.key === CANCEL_KEY && !press.repeat;
}
