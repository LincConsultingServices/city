// Day/night cycle math — pure and testable. The city loops through a full day
// every DAY_LENGTH_S seconds; `ambient` is a multiplicative tint applied to the
// world containers (Pixi Container.tint), clamped so no channel ever drops below
// MIN_CHANNEL of full — the palette stays readable at deepest night.

export const DAY_LENGTH_S = 240;
/** Boot offset: start mid-day so players get ~1 min of full daylight first. */
export const BOOT_PHASE_OFFSET_S = DAY_LENGTH_S * 0.2;
/** Floor on the ambient tint so night never crushes to black. Raised the
 * darkness once lamp/window glows became real art worth contrasting against. */
export const MIN_CHANNEL = 0.45;

export type DayLabel = "day" | "dusk" | "night" | "dawn";

export interface DayPhase {
  /** 0..1 through the full cycle. */
  t: number;
  /** 0xRRGGBB multiplicative world tint. */
  ambient: number;
  /** 0 = full day … 1 = deepest night (drives lamp/window glows). */
  nightness: number;
  label: DayLabel;
}

/** Per-channel linear interpolation between two 0xRRGGBB colors. */
export function lerpColor(a: number, b: number, t: number): number {
  const ar = (a >> 16) & 0xff;
  const ag = (a >> 8) & 0xff;
  const ab = a & 0xff;
  const br = (b >> 16) & 0xff;
  const bg = (b >> 8) & 0xff;
  const bb = b & 0xff;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return (r << 16) | (g << 8) | bl;
}

// Keyframes over the cycle: [t, ambient, nightness]. Day holds through t≈0.45,
// dusk warms, night cools and holds, dawn re-warms back to day at wrap.
const STOPS: Array<[number, number, number]> = [
  [0.0, 0xffffff, 0],
  [0.45, 0xffffff, 0],
  [0.55, 0xffd9b4, 0.35],
  [0.65, 0xb4bedf, 1],
  [0.85, 0xb4bedf, 1],
  [0.93, 0xffe8c9, 0.3],
  [1.0, 0xffffff, 0],
];

function labelFor(t: number): DayLabel {
  if (t < 0.5) return "day";
  if (t < 0.62) return "dusk";
  if (t < 0.88) return "night";
  return "dawn";
}

function clampAmbient(color: number): number {
  const floor = Math.round(255 * MIN_CHANNEL);
  const r = Math.max(floor, (color >> 16) & 0xff);
  const g = Math.max(floor, (color >> 8) & 0xff);
  const b = Math.max(floor, color & 0xff);
  return (r << 16) | (g << 8) | b;
}

export function dayPhase(elapsedS: number): DayPhase {
  const t = (((elapsedS / DAY_LENGTH_S) % 1) + 1) % 1;
  let ambient = 0xffffff;
  let nightness = 0;
  for (let i = 0; i < STOPS.length - 1; i++) {
    const [t0, c0, n0] = STOPS[i];
    const [t1, c1, n1] = STOPS[i + 1];
    if (t >= t0 && t <= t1) {
      const k = t1 === t0 ? 0 : (t - t0) / (t1 - t0);
      ambient = lerpColor(c0, c1, k);
      nightness = n0 + (n1 - n0) * k;
      break;
    }
  }
  return { t, ambient: clampAmbient(ambient), nightness, label: labelFor(t) };
}
