import { describe, it, expect } from "vitest";
import {
  CLOUD_PAD_X,
  CLOUD_PAD_Y,
  LOBE_GAP,
  LOBE_MAX,
  TAIL_H,
  cloudLobes,
  lobeArc,
  valleyDepth,
} from "./cloud";

/**
 * The range a tracker line actually occupies at 13px: "decide" at one end,
 * "tell Priya where you landed" at the other, plus the extremes either side so
 * the arithmetic is held past what the content happens to contain today.
 */
const LABEL_WIDTHS = [24, 40, 58, 76, 94, 120, 160, 240];
const LABEL_HEIGHT = 16;

const cloudFor = (labelW: number, labelH = LABEL_HEIGHT) =>
  cloudLobes(labelW + CLOUD_PAD_X * 2, labelH + CLOUD_PAD_Y * 2);

describe("the callout cloud's lobes", () => {
  it("keeps every lobe overlapping its neighbour", () => {
    // At or past 2r the circles stop crossing, `acos` has nothing to return and
    // the outline breaks into separate bumps with gaps between them.
    for (const labelW of LABEL_WIDTHS) {
      const lobes = cloudFor(labelW);
      if (lobes.count < 2) continue;
      expect(lobes.d, `${labelW}px line spaced ${lobes.d} against r=${lobes.r}`).toBeLessThan(
        2 * lobes.r,
      );
    }
  });

  it("spaces them at exactly the gap, whatever the line", () => {
    // The radius is derived from the count for this reason. Choosing the count
    // first and letting the spacing be the remainder is what the first version
    // did, and on a short line the remainder collapsed to about a fifth of the
    // radius: the cloud came out as a rectangle with a rippled top.
    for (const labelW of LABEL_WIDTHS) {
      const lobes = cloudFor(labelW);
      if (lobes.count < 2) continue;
      expect(lobes.d / lobes.r, `${labelW}px line`).toBeCloseTo(LOBE_GAP, 9);
    }
  });

  it("cuts valleys of the same depth relative to the lobes", () => {
    // What actually makes it read as a cloud. A depth that drifted with the line
    // length would mean a long tracker line and a short one are different
    // objects over two different people's heads.
    const ratios = LABEL_WIDTHS.map((labelW) => {
      const lobes = cloudFor(labelW);
      return valleyDepth(lobes) / lobes.r;
    });
    for (const ratio of ratios) expect(ratio).toBeCloseTo(ratios[0], 9);
    expect(ratios[0], "valleys too shallow to read as lobes").toBeGreaterThan(0.5);
  });

  it("grows more lobes rather than bigger ones", () => {
    // A long line and a short one have to read as the same object. If the radius
    // scaled with the text, they would not.
    const counts = LABEL_WIDTHS.map((labelW) => cloudFor(labelW).count);
    for (let i = 1; i < counts.length; i++) {
      expect(
        counts[i],
        `${LABEL_WIDTHS[i]}px has fewer lobes than a shorter line`,
      ).toBeGreaterThanOrEqual(counts[i - 1]);
    }
    const radii = LABEL_WIDTHS.map((labelW) => cloudFor(labelW).r);
    for (const r of radii) expect(r).toBeLessThanOrEqual(LOBE_MAX);
    expect(Math.max(...counts)).toBeGreaterThan(Math.min(...counts));
  });

  it("spans exactly the width it was given", () => {
    for (const labelW of LABEL_WIDTHS) {
      const w = labelW + CLOUD_PAD_X * 2;
      const lobes = cloudFor(labelW);
      const left = lobes.first - lobes.r;
      const right = lobes.first + lobes.d * (lobes.count - 1) + lobes.r;
      expect(left, `${labelW}px line starts at ${left}`).toBeCloseTo(-w / 2, 6);
      expect(right, `${labelW}px line ends at ${right}`).toBeCloseTo(w / 2, 6);
    }
  });

  it("puts the tail's point at the origin, below everything else", () => {
    const lobes = cloudFor(94);
    expect(lobes.base).toBe(-TAIL_H);
    expect(lobes.top).toBeLessThan(lobes.base);
    expect(lobes.cy).toBeGreaterThan(lobes.top);
    expect(lobes.cy).toBeLessThan(lobes.base);
  });
});

/**
 * The one that would actually be seen. The text is bottom-aligned with
 * `CLOUD_PAD_Y` under it, so its top edge sits `CLOUD_PAD_Y` below the cloud's
 * highest point — and the dips between lobes come down from that same point. Cut
 * the valleys deeper than the padding and the line pokes out through the top of
 * the cloud.
 */
describe("the text stays inside the cloud", () => {
  it("never lets a valley reach the top of the line", () => {
    for (const labelW of LABEL_WIDTHS) {
      for (const labelH of [12, 16, 20]) {
        const depth = valleyDepth(cloudFor(labelW, labelH));
        expect(
          depth,
          `${labelW}×${labelH} dips ${depth} into ${CLOUD_PAD_Y} of padding`,
        ).toBeLessThan(CLOUD_PAD_Y);
      }
    }
  });
});

describe("the arcs that draw it", () => {
  it("always sweeps over the top", () => {
    // Pixi draws an arc in increasing angle, and up is negative y, so an end
    // that is not greater than its start would carve the arc through the middle
    // of the cloud instead of around its rim.
    for (const labelW of LABEL_WIDTHS) {
      const lobes = cloudFor(labelW);
      for (let i = 0; i < lobes.count; i++) {
        const { start, end } = lobeArc(lobes, i);
        expect(end, `lobe ${i} of ${lobes.count} sweeps backwards`).toBeGreaterThan(start);
        expect(start).toBeGreaterThanOrEqual(-Math.PI);
        expect(end).toBeLessThanOrEqual(0);
      }
    }
  });

  it("runs the outer lobes out to the straight sides", () => {
    // Due west and due east: where the cloud's vertical sides meet it. Anything
    // else leaves a step in the outline.
    for (const labelW of LABEL_WIDTHS) {
      const lobes = cloudFor(labelW);
      expect(lobeArc(lobes, 0).start).toBe(-Math.PI);
      expect(lobeArc(lobes, lobes.count - 1).end).toBe(0);
    }
  });

  it("still draws something for a cloud with no width", () => {
    // Unreachable from a real line — the radius is capped at a quarter of the
    // width, so there are always at least three lobes — but `cloudLobes` is a
    // plain exported function and a degenerate call must not hand the renderer
    // a NaN angle or a zero-lobe loop.
    const lobes = cloudLobes(0, 2 * LOBE_MAX);
    expect(lobes.count).toBe(1);
    expect(lobes.theta).toBe(0);
    expect(valleyDepth(lobes)).toBe(0);
    expect(lobeArc(lobes, 0)).toEqual({ start: -Math.PI, end: 0 });
  });

  it("reads as a cloud even at the shortest line in the building", () => {
    // "decide" is the shortest tracker line there is. Two lobes would read as a
    // pill with a dent in it.
    expect(cloudFor(24).count).toBeGreaterThanOrEqual(3);
  });
});
