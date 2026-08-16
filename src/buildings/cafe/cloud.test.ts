import { describe, it, expect } from "vitest";
import {
  CLOUD_PAD_X,
  CLOUD_PAD_Y,
  OVAL,
  TAIL_H_MAX,
  TAIL_H_MIN,
  cloudOval,
  ovalRim,
  ovalSteps,
} from "./cloud";

/**
 * The range a tracker line actually occupies at 13px: "decide" at one end,
 * "tell Priya where you landed" at the other, plus the extremes either side so
 * the arithmetic is held past what the content happens to contain today. The
 * widest is a wrapped reply at the label's own wrap width.
 */
const LABEL_WIDTHS = [24, 40, 58, 76, 94, 120, 160, 240];
const LABEL_HEIGHTS = [12, 16, 20];
const LABEL_HEIGHT = 16;

const cloudFor = (labelW: number, labelH = LABEL_HEIGHT) =>
  cloudOval(labelW + CLOUD_PAD_X * 2, labelH + CLOUD_PAD_Y * 2);

/** Where a point sits relative to the curve: 1 is on it, under 1 is inside. */
const onCurve = (oval: { a: number; b: number; cy: number }, x: number, y: number) =>
  (x * x) / (oval.a * oval.a) + ((y - oval.cy) * (y - oval.cy)) / (oval.b * oval.b);

describe("the callout balloon's oval", () => {
  it("puts the padded box's corners exactly on the curve", () => {
    // The whole of the sizing. Anything under 1 is an oval bigger than it needs
    // to be; anything over 1 is a corner outside the balloon.
    for (const labelW of LABEL_WIDTHS) {
      for (const labelH of LABEL_HEIGHTS) {
        const oval = cloudFor(labelW, labelH);
        const p = labelW / 2 + CLOUD_PAD_X;
        const q = labelH / 2 + CLOUD_PAD_Y;
        expect(onCurve(oval, p, oval.cy + q), `${labelW}×${labelH}`).toBeCloseTo(1, 9);
      }
    }
  });

  it("stands √2 off that box on both axes", () => {
    // Stated separately from the test above because it is the fact the file is
    // built on, and because a mistake that scaled only one axis would still land
    // a corner on some curve.
    for (const labelW of LABEL_WIDTHS) {
      const oval = cloudFor(labelW);
      expect(oval.a / (labelW / 2 + CLOUD_PAD_X), `${labelW}px wide`).toBeCloseTo(OVAL, 9);
      expect(oval.b / (LABEL_HEIGHT / 2 + CLOUD_PAD_Y), `${labelW}px wide`).toBeCloseTo(OVAL, 9);
    }
  });

  it("clears the text itself by more than the padding", () => {
    // The one that would actually be seen. The corners are the closest the curve
    // comes, and they are `CLOUD_PAD` away by construction — so the text's own
    // corners have to sit strictly inside with room to spare.
    for (const labelW of LABEL_WIDTHS) {
      for (const labelH of LABEL_HEIGHTS) {
        const oval = cloudFor(labelW, labelH);
        const at = onCurve(oval, labelW / 2, oval.cy + labelH / 2);
        expect(at, `${labelW}×${labelH} text corner sits at ${at}`).toBeLessThan(1);
      }
    }
  });

  it("reads as the same object at every line length", () => {
    // A long line and a short one have to be one balloon seen twice, not two
    // shapes. Holding the axis ratio to the box's ratio is what says so: the
    // oval never changes its relationship to the text it is drawn around.
    for (const labelW of LABEL_WIDTHS) {
      const oval = cloudFor(labelW);
      const box = (labelW / 2 + CLOUD_PAD_X) / (LABEL_HEIGHT / 2 + CLOUD_PAD_Y);
      expect(oval.a / oval.b, `${labelW}px line`).toBeCloseTo(box, 9);
    }
  });

  it("puts the tail's point at the origin, below everything else", () => {
    const oval = cloudFor(94);
    expect(oval.base).toBe(-oval.tailH);
    expect(oval.top).toBeLessThan(oval.base);
    expect(oval.cy).toBeGreaterThan(oval.top);
    expect(oval.cy).toBeLessThan(oval.base);
    // Everything the balloon is made of is above the point it hangs from.
    expect(oval.mouth.y).toBeLessThan(0);
  });
});

describe("the tail", () => {
  it("cuts its mouth into the curve, not through it", () => {
    for (const labelW of LABEL_WIDTHS) {
      const oval = cloudFor(labelW);
      expect(onCurve(oval, oval.mouth.x, oval.mouth.y), `${labelW}px line`).toBeCloseTo(1, 9);
      // Below the centre: the mouth belongs on the underside.
      expect(oval.mouth.y).toBeGreaterThan(oval.cy);
    }
  });

  it("grows with the balloon, between a floor and a ceiling", () => {
    // A tail fixed at the floor is right on a tracker line and reads as a drip
    // on a wrapped reply; one that scaled freely would be a second balloon.
    const heights = [12, 16, 20, 40, 70, 120].map((labelH) => cloudFor(94, labelH).tailH);
    for (let i = 1; i < heights.length; i++) {
      expect(heights[i]).toBeGreaterThanOrEqual(heights[i - 1]);
    }
    for (const t of heights) {
      expect(t).toBeGreaterThanOrEqual(TAIL_H_MIN);
      expect(t).toBeLessThanOrEqual(TAIL_H_MAX);
    }
    // Both ends of the clamp are actually reached across the range the room can
    // produce, or one of them is decoration.
    expect(heights[0]).toBe(TAIL_H_MIN);
    expect(heights[heights.length - 1]).toBe(TAIL_H_MAX);
  });

  it("narrows its mouth rather than overrunning a tiny oval", () => {
    // Unreachable from a real line, but the mouth's y is a square root that goes
    // imaginary the moment the mouth is wider than the oval it is cut into.
    const oval = cloudOval(TAIL_H_MIN / 2, TAIL_H_MIN / 2);
    expect(oval.mouth.x).toBeLessThan(oval.a);
    expect(Number.isFinite(oval.mouth.y)).toBe(true);
    expect(onCurve(oval, oval.mouth.x, oval.mouth.y)).toBeCloseTo(1, 9);
  });

  it("leans the point left and puts the weight on the right", () => {
    // What makes it a tail hanging off the balloon rather than a triangle stuck
    // under it. Both edges are displaced the *same* way — rightwards — off the
    // straight chord they would otherwise be, which flares the right edge
    // outward and pulls the left one in against it. The tail's mass ends up
    // right of the point, so the point reads as leaning left.
    const oval = cloudFor(94);
    const { left, right } = oval.tail;
    /** Where the straight chord from the point to a mouth corner is at `y`. */
    const chordX = (mx: number, c: { y: number }) => mx * (c.y / oval.mouth.y);
    const leftLean = left.x - chordX(-oval.mouth.x, left);
    const rightLean = right.x - chordX(oval.mouth.x, right);
    expect(leftLean, "left edge does not lean right").toBeGreaterThan(0);
    expect(rightLean, "right edge does not lean right").toBeGreaterThan(0);
    // The right edge is the one that flares; the left only hugs. Reversed, the
    // tail comes out fat on the wrong side and the lean goes with it.
    expect(rightLean).toBeGreaterThan(leftLean);
    // Both controls sit between the mouth and the point, never past either.
    for (const c of [left, right]) {
      expect(c.y).toBeGreaterThan(oval.mouth.y);
      expect(c.y).toBeLessThan(0);
      expect(Math.abs(c.x)).toBeLessThanOrEqual(oval.mouth.x);
    }
  });
});

describe("the rim that draws it", () => {
  it("runs from one corner of the mouth to the other", () => {
    for (const labelW of LABEL_WIDTHS) {
      const oval = cloudFor(labelW);
      const rim = ovalRim(oval, ovalSteps(oval));
      const first = rim[0];
      const last = rim[rim.length - 1];
      expect(first.x, `${labelW}px line`).toBeCloseTo(oval.mouth.x, 6);
      expect(first.y, `${labelW}px line`).toBeCloseTo(oval.mouth.y, 6);
      expect(last.x, `${labelW}px line`).toBeCloseTo(-oval.mouth.x, 6);
      expect(last.y, `${labelW}px line`).toBeCloseTo(oval.mouth.y, 6);
    }
  });

  it("goes over the top and never back under the mouth", () => {
    // The direction matters as much as the endpoints. A sweep the other way
    // would walk the short underside instead, and the tail would be drawn across
    // the balloon rather than hanging off it.
    for (const labelW of LABEL_WIDTHS) {
      const oval = cloudFor(labelW);
      const rim = ovalRim(oval, ovalSteps(oval));
      const ys = rim.map((p) => p.y);
      // Within a pixel rather than exactly, here and below: the top and the two
      // sides are points *on* the sweep, not necessarily vertices of it — no
      // sample is obliged to land on any of them.
      expect(Math.min(...ys), `${labelW}px line misses the top`).toBeLessThan(oval.top + 1);
      // The far end, though, is a vertex by construction: the rim stops on the
      // mouth's corner and nothing on it may hang below that.
      expect(Math.max(...ys), `${labelW}px line dips past the mouth`).toBeCloseTo(oval.mouth.y, 6);
      const xs = rim.map((p) => p.x);
      expect(Math.min(...xs), `${labelW}px line misses due west`).toBeLessThan(-oval.a + 1);
      expect(Math.max(...xs), `${labelW}px line misses due east`).toBeGreaterThan(oval.a - 1);
    }
  });

  it("keeps every vertex on the curve", () => {
    for (const labelW of LABEL_WIDTHS) {
      const oval = cloudFor(labelW);
      for (const p of ovalRim(oval, ovalSteps(oval))) {
        expect(onCurve(oval, p.x, p.y), `${labelW}px line strays at ${p.x},${p.y}`).toBeCloseTo(
          1,
          9,
        );
      }
    }
  });

  it("spends its vertices on the balloons that need them", () => {
    // A count fixed across the range would either facet a wrapped reply or spend
    // a hundred and sixty vertices on the word "decide".
    const counts = LABEL_WIDTHS.map((labelW) => ovalSteps(cloudFor(labelW)));
    for (let i = 1; i < counts.length; i++) {
      expect(
        counts[i],
        `${LABEL_WIDTHS[i]}px got fewer than a shorter line`,
      ).toBeGreaterThanOrEqual(counts[i - 1]);
    }
    expect(Math.max(...counts)).toBeGreaterThan(Math.min(...counts));
  });

  it("strays under a tenth of a pixel from the curve it stands in for", () => {
    // Chord *length* is the wrong thing to hold: on a wrapped reply the oval is
    // ten times wider than it is tall, and its longest chords sit along the flat
    // top where the curve is nearly straight and a long chord costs nothing. How
    // far the chord's middle falls from the curve is what would be seen, and it
    // is a different number entirely — three pixels of chord up there is under a
    // hundredth of a pixel of sag.
    for (const labelW of LABEL_WIDTHS) {
      const oval = cloudFor(labelW);
      const rim = ovalRim(oval, ovalSteps(oval));
      let worst = 0;
      for (let i = 1; i < rim.length; i++) {
        const mid = { x: (rim[i].x + rim[i - 1].x) / 2, y: (rim[i].y + rim[i - 1].y) / 2 };
        // The curve point nearest that midpoint, near enough: scale the
        // midpoint's offset from the centre out onto the ellipse.
        const k = Math.sqrt(onCurve(oval, mid.x, mid.y));
        worst = Math.max(worst, Math.hypot(mid.x, mid.y - oval.cy) * (1 / k - 1));
      }
      expect(worst, `${labelW}px line sags ${worst}px`).toBeLessThan(0.1);
    }
  });

  it("still draws something for a balloon with no size", () => {
    // A label with no glyphs in it measures zero, and `cloudOval` is a plain
    // exported function besides. A degenerate call must not hand the renderer a
    // NaN vertex or a zero-length loop.
    const oval = cloudOval(0, 0);
    expect(oval.a).toBe(0);
    expect(oval.b).toBe(0);
    expect(oval.tailH).toBe(TAIL_H_MIN);
    expect(oval.mouth).toEqual({ x: 0, y: -TAIL_H_MIN });
    const rim = ovalRim(oval, ovalSteps(oval));
    expect(rim.length).toBeGreaterThan(2);
    for (const p of rim) {
      expect(Number.isFinite(p.x) && Number.isFinite(p.y), `${p.x},${p.y}`).toBe(true);
    }
  });
});
