// Easter egg registry + konami-sequence matcher — pure so it's trivially
// testable. Discovery state lives in eggStore (persisted); visible payoffs live
// in the world (CityCanvas/ambient) and the DOM (Toaster).

export type EggId =
  "konami" | "golden_taxi" | "wishmaker" | "cat_friend" | "founders_plaque" | "night_owl";

export const EGGS: Record<EggId, { title: string; hint: string }> = {
  konami: { title: "Block Party", hint: "Some codes never die. ↑↑↓↓…" },
  golden_taxi: { title: "The Golden Fare", hint: "Once in a while, a cab gleams. Catch it." },
  wishmaker: { title: "Wishmaker", hint: "Five wishes deep in the fountain." },
  cat_friend: { title: "Street Cat's Choice", hint: "Someone on campus chooses their own humans." },
  founders_plaque: { title: "City Historian", hint: "Every city remembers how it started." },
  night_owl: { title: "Night Owl", hint: "Stay out past the streetlights." },
};

export const EGG_COUNT = Object.keys(EGGS).length;

/** Lower-cased KeyboardEvent.key values, in order. */
export const KONAMI: readonly string[] = [
  "arrowup",
  "arrowup",
  "arrowdown",
  "arrowdown",
  "arrowleft",
  "arrowright",
  "arrowleft",
  "arrowright",
  "b",
  "a",
];

/**
 * Advance the konami matcher: given how many keys have matched so far and the
 * next key, return the new match length (=== KONAMI.length means fired — the
 * caller resets to 0). On mismatch, falls back to the longest suffix of the
 * typed keys that is still a prefix of the code (so ↑↑↑ stays at 2, not 0).
 */
export function konamiStep(progress: number, key: string): number {
  const seq = [...KONAMI.slice(0, Math.min(progress, KONAMI.length)), key];
  for (let len = Math.min(seq.length, KONAMI.length); len > 0; len--) {
    const suffix = seq.slice(seq.length - len);
    if (suffix.every((k, i) => k === KONAMI[i])) return len;
  }
  return 0;
}

/** Type guard for the persisted discovery list. */
export function isEggIdArray(v: unknown): v is EggId[] {
  return Array.isArray(v) && v.every((x) => typeof x === "string" && x in EGGS);
}
