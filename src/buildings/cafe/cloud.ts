// The callout cloud's geometry — the shape of the thing that appears over
// somebody's head when the live objective is pointing at them.
//
// Pure, and separate from castView.ts for the reason room.ts is separate from
// scene.ts: the interesting part is the arithmetic, and arithmetic that needs a
// renderer to check is arithmetic nobody checks. castView.ts turns what is here
// into `Graphics` calls and adds nothing to it.
//
// The cloud is a run of equal circles whose centres are closer together than
// their diameter, so each pair intersects and the outline can take each circle's
// arc between its two intersections. For two circles of radius `r` with centres
// `d` apart, those intersections sit at ±`acos(d / 2r)` from the line joining
// the centres — that angle is the whole of it.
//
// A wider line grows *more* lobes rather than bigger ones, so a nine-word
// tracker line and a three-word one read as the same object at the same scale.

/** Horizontal breathing room between the text and the cloud's edge. */
export const CLOUD_PAD_X = 9;
/**
 * Vertical padding, deeper than a flat plate would need: the top is scalloped,
 * so the text has to clear the valleys between lobes rather than a straight
 * edge. `valleyDepth` is what says whether it does, and cloud.test.ts holds the
 * two numbers against each other.
 */
export const CLOUD_PAD_Y = 9;
export const TAIL_W = 10;
export const TAIL_H = 6;
/** Lobe radius ceiling, so long lines grow more lobes rather than bigger ones. */
export const LOBE_MAX = 12;
/**
 * Centre spacing as a multiple of the radius, and **exact** rather than a
 * ceiling — the radius is derived from it below, which is the whole reason the
 * layout works. Under 2 the lobes overlap; the closer to 2 the deeper the
 * valleys between them, and the valleys are what make this read as a cloud
 * instead of a rectangle with a rippled top.
 *
 * At 1.9 the deepest dip is 0.69 × the radius, which `CLOUD_PAD_Y` covers.
 */
export const LOBE_GAP = 1.9;
/** How far above the top of somebody's head the cloud's tail points. */
export const CLOUD_LIFT = 8;
/** Idle drift amplitude. Half the walk bob, so it drifts rather than bounces. */
export const CLOUD_FLOAT = 1.5;
/** Radians per second of that drift. */
export const CLOUD_FLOAT_HZ = 1.6;
/** Three is the fewest that reads as a cloud; two is a pill with a dent in it. */
const MIN_LOBES = 3;

export interface CloudLobes {
  /** Lobe radius. */
  r: number;
  /** The y every lobe centre sits on. */
  cy: number;
  /** The x of the leftmost lobe centre. */
  first: number;
  /** Centre-to-centre spacing. Zero when there is only one lobe. */
  d: number;
  count: number;
  /** Half-angle from the centre line to where two neighbours cross. */
  theta: number;
  /** The flat underside of the cloud, which the tail is cut into. */
  base: number;
  /** The highest point of the lobes. */
  top: number;
}

/**
 * Lay out the lobes for a cloud holding a `w` × `h` label. The origin is the
 * tail's point, so the cloud is drawn above it: `base` and `top` are negative.
 */
export function cloudLobes(w: number, h: number): CloudLobes {
  const base = -TAIL_H;
  const top = base - h;
  if (w <= 0 || h <= 0) {
    // Nothing to draw a cloud around. Unreachable from a real line — an empty
    // callout is hidden rather than drawn — but this is a plain exported
    // function and the arithmetic below divides by both.
    return { r: 0, cy: top, first: 0, d: 0, count: 1, theta: 0, base, top };
  }

  // How many lobes, from a wanted radius — then the radius comes back out of
  // the count. Deriving it in that order is what keeps the spacing at exactly
  // `LOBE_GAP × r` for every line length: pick the count first and the spacing
  // is whatever is left over, which on a short line collapses to a ripple.
  const wanted = Math.min(LOBE_MAX, h * 0.5);
  let count = Math.max(MIN_LOBES, Math.round((w - 2 * wanted) / (LOBE_GAP * wanted)) + 1);
  // r × (2 + LOBE_GAP × (count − 1)) spans the width exactly: a radius at each
  // end plus one gap between each pair.
  let r = w / (2 + LOBE_GAP * (count - 1));
  while (r > LOBE_MAX) {
    count += 1;
    r = w / (2 + LOBE_GAP * (count - 1));
  }
  const d = LOBE_GAP * r;

  return {
    r,
    cy: top + r,
    first: -w / 2 + r,
    d,
    count,
    // The clamp keeps `acos` in range against rounding at the boundary.
    theta: Math.acos(Math.min(1, d / (2 * r))),
    base,
    top,
  };
}

/**
 * How far below the cloud's highest point the deepest dip between two lobes
 * falls. Text starting above this line would sit outside the cloud.
 */
export function valleyDepth(lobes: CloudLobes): number {
  if (lobes.count < 2) return 0;
  const half = lobes.d / 2;
  return lobes.r - Math.sqrt(Math.max(0, lobes.r * lobes.r - half * half));
}

/**
 * Where one lobe's arc starts and ends, in radians. Angles run negative because
 * up is negative y: `-π` is due west of a centre, `-π/2` due north, `0` due
 * east. The end angle is always the greater, so the sweep goes over the top.
 *
 * The outermost lobes run all the way to due west and due east, which is where
 * the cloud's straight sides meet them.
 */
export function lobeArc(lobes: CloudLobes, i: number): { start: number; end: number } {
  return {
    start: i === 0 ? -Math.PI : lobes.theta - Math.PI,
    end: i === lobes.count - 1 ? 0 : -lobes.theta,
  };
}
