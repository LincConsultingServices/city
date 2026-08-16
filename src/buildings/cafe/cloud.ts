// The callout cloud's geometry — the shape of the thing that appears over
// somebody's head when the live objective is pointing at them.
//
// Pure, and separate from calloutView.ts for the reason room.ts is separate from
// scene.ts: the interesting part is the arithmetic, and arithmetic that needs a
// renderer to check is arithmetic nobody checks. calloutView.ts turns what is
// here into `Graphics` calls and adds nothing to it.
//
// It is an ellipse with a tapered tail cut into its underside. It used to be a
// run of overlapping circles whose scalloped rim read as a thought cloud; the
// art direction asked for the plain oval instead and the scallops went with it.
// What survives from that version is the contract, which everything downstream
// depends on: **the origin is the tail's point**, the shape is drawn above it,
// and every y here is negative.
//
// All of the sizing is one fact. The smallest ellipse around a rectangle is √2
// larger than it on both axes: put the rectangle's corner at (p, q) and the
// semi-axes at p√2 and q√2, and x²/a² + y²/b² comes to ½ + ½ = 1, so the corner
// lands exactly on the curve. `OVAL` below is that √2, and it is why the padding
// constants are smaller than the scalloped cloud's were — the √2 supplies most
// of the breathing room, and a pad added under it is a pad multiplied by √2.
//
// A consequence worth knowing before a line gets longer: an oval around a block
// of text is about twice its area, however the text is wrapped. Aspect is the
// only thing wrapping buys, not size.

/**
 * Clearance at the text's **corners**, which is where the curve comes closest to
 * it. Everywhere else the oval stands further off than this — at the text's
 * middle row it clears by `p(√2 − 1)`, which on a tracker line is over twenty
 * pixels. Small numbers on purpose; see the √2 note above.
 */
export const CLOUD_PAD_X = 6;
export const CLOUD_PAD_Y = 5;
/** How far the semi-axes stand off the corner of the box they must contain. */
export const OVAL = Math.SQRT2;
/**
 * The tail's drop to its point, floor and ceiling, and its share of the oval's
 * *minor* axis in between.
 *
 * It grows, where the old cloud's was a constant, because the balloon's own
 * range is enormous: a tracker line is 150px across and a wrapped reply is
 * nearly four hundred. A fixed 9px tail is right on the first and reads as a
 * drip hanging off the second. Minor axis rather than major, and damped to a
 * fraction of it, because the tail's job is to point at a head — a tail that
 * tracked the width would be a second balloon by the time the line wrapped.
 */
export const TAIL_H_MIN = 9;
export const TAIL_H_MAX = 20;
const TAIL_OF_B = 0.42;
/** Width at the mouth, as a share of the drop. Wider than tall, like the art. */
const TAIL_ASPECT = 4 / 3;
/** How far above the top of somebody's head the cloud's tail points. */
export const CLOUD_LIFT = 8;
/** Idle drift amplitude. Half the walk bob, so it drifts rather than bounces. */
export const CLOUD_FLOAT = 1.5;
/** Radians per second of that drift. */
export const CLOUD_FLOAT_HZ = 1.6;
/**
 * The tail's mouth may not eat more than this share of the horizontal semi-axis.
 * Only a degenerate cloud gets near it — a two-character line still runs about
 * 25px of semi-axis against a 6px half-mouth — but the mouth's y comes out of a
 * square root that goes imaginary once the mouth is wider than the oval.
 */
const MOUTH_MAX = 0.8;
/** One rim vertex per this many pixels of perimeter. */
const RIM_STEP_PX = 3;
const RIM_MIN = 24;
const RIM_MAX = 160;

export interface Point {
  x: number;
  y: number;
}

export interface CloudOval {
  /** Semi-axes. */
  a: number;
  b: number;
  /** The y of the ellipse's centre — where the text is centred too. */
  cy: number;
  /** The highest point of the oval. */
  top: number;
  /** The lowest, which is where the tail is cut in — and so also `-tailH`. */
  base: number;
  /** This balloon's tail, sized off `b`. Constant only within a given line. */
  tailH: number;
  /**
   * The right-hand corner of the tail's mouth, on the curve. The left-hand one
   * is its mirror, so it is not stored.
   */
  mouth: Point;
  /**
   * Quadratic control points for the two edges of the tail, walked in path
   * order: `left` shapes the run from the left mouth down to the point, `right`
   * the run from the point back up to the right mouth.
   *
   * They are not mirrors of each other. The left edge is pulled inside its chord
   * and the right edge outside it, which leans the point to the left and puts
   * the tail's weight on its right — a tail hanging off the shape rather than a
   * triangle stuck under it.
   */
  tail: { left: Point; right: Point };
}

/**
 * Lay out the oval that contains a `w` × `h` box of text-plus-padding. The
 * origin is the tail's point, so the oval sits above it and `top`, `base` and
 * `cy` are all negative.
 */
export function cloudOval(w: number, h: number): CloudOval {
  // Degenerate is not unreachable: `w` and `h` come from a rasterised label, and
  // a label with no glyphs in it measures zero. A zero oval draws nothing, which
  // is the right answer — but it has to do it without handing the renderer a NaN
  // out of the mouth's square root below.
  const a = w > 0 ? (w / 2) * OVAL : 0;
  const b = h > 0 ? (h / 2) * OVAL : 0;

  // The oval's lowest point is where the tail is cut in, and the tail drops from
  // there to the origin.
  const tailH = Math.min(TAIL_H_MAX, Math.max(TAIL_H_MIN, b * TAIL_OF_B));
  const base = -tailH;
  const cy = base - b;
  const top = cy - b;

  const mx = Math.min((tailH * TAIL_ASPECT) / 2, a * MOUTH_MAX);
  const my = a > 0 ? cy + b * Math.sqrt(Math.max(0, 1 - (mx * mx) / (a * a))) : cy;
  const mouth = { x: mx, y: my };

  return {
    a,
    b,
    cy,
    top,
    base,
    tailH,
    mouth,
    // Both are expressed as fractions of the mouth so the tail keeps its shape
    // whatever the mouth had to shrink to. `my` is negative, so a fraction of it
    // is a point between the mouth and the origin.
    tail: {
      left: { x: -mx * 0.3, y: my * 0.62 },
      right: { x: mx * 0.95, y: my * 0.14 },
    },
  };
}

/**
 * The oval's rim as a polyline, from the **right** corner of the tail's mouth,
 * over the top, to the left one — so the tail's mouth is the one stretch of the
 * curve it does not cover, and calloutView.ts can close the path through the
 * tail instead.
 *
 * Angles run the way the screen does: `t` is the ellipse's parameter, `sin t` is
 * positive downwards, so the sweep **decreases** from the mouth through `0` (due
 * east), `-π/2` (the top) and `-π` (due west) to the mirrored mouth.
 */
export function ovalRim(oval: CloudOval, steps: number): Point[] {
  const { a, b, cy, mouth } = oval;
  // Where on the curve the mouth's corner sits. Between 0 and π/2: east of
  // centre and below it.
  const t0 = a > 0 && b > 0 ? Math.atan2((mouth.y - cy) / b, mouth.x / a) : 0;
  const t1 = -Math.PI - t0;

  const n = Math.max(2, Math.round(steps));
  const out: Point[] = [];
  for (let i = 0; i <= n; i++) {
    const t = t0 + ((t1 - t0) * i) / n;
    out.push({ x: a * Math.cos(t), y: cy + b * Math.sin(t) });
  }
  return out;
}

/**
 * How many segments that rim needs. Proportional to the perimeter rather than
 * fixed, because a fixed count that looks smooth on a tracker line facets
 * visibly on a five-row reply, and one that looks smooth on the reply is a lot
 * of vertices for a two-word one.
 */
export function ovalSteps(oval: CloudOval): number {
  const perimeter = Math.PI * (oval.a + oval.b);
  return Math.min(RIM_MAX, Math.max(RIM_MIN, Math.round(perimeter / RIM_STEP_PX)));
}
