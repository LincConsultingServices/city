import { describe, it, expect } from "vitest";
import {
  DAY_LENGTH_S,
  MIN_CHANNEL,
  clockMinutes,
  dayPhase,
  formatHour,
  lerpColor,
} from "./daycycle";

describe("clock", () => {
  it("puts noon mid-day, midnight at deepest night, dusk at 6 pm", () => {
    expect(formatHour(clockMinutes(0.25))).toBe("12 pm");
    expect(formatHour(clockMinutes(0.75))).toBe("12 am");
    expect(formatHour(clockMinutes(0.5))).toBe("6 pm");
    expect(formatHour(clockMinutes(0))).toBe("6 am");
  });

  it("stays within one day", () => {
    for (let i = 0; i < 1000; i++) {
      const m = clockMinutes(i / 1000);
      expect(m).toBeGreaterThanOrEqual(0);
      expect(m).toBeLessThan(1440);
    }
  });

  it("shows the hour only, 12-hour with am/pm", () => {
    expect(formatHour(0)).toBe("12 am");
    expect(formatHour(59)).toBe("12 am");
    expect(formatHour(60)).toBe("1 am");
    expect(formatHour(11 * 60 + 59)).toBe("11 am");
    expect(formatHour(12 * 60)).toBe("12 pm");
    expect(formatHour(17 * 60 + 30)).toBe("5 pm");
    expect(formatHour(23 * 60 + 59)).toBe("11 pm");
  });
});

describe("lerpColor", () => {
  it("interpolates per channel", () => {
    expect(lerpColor(0x000000, 0xffffff, 0)).toBe(0x000000);
    expect(lerpColor(0x000000, 0xffffff, 1)).toBe(0xffffff);
    expect(lerpColor(0x000000, 0xffffff, 0.5)).toBe(0x808080);
    expect(lerpColor(0xff0000, 0x00ff00, 0.5)).toBe(0x808000);
  });
});

describe("dayPhase", () => {
  it("starts and holds full day", () => {
    for (const t of [0, 0.2, 0.44]) {
      const p = dayPhase(t * DAY_LENGTH_S);
      expect(p.label).toBe("day");
      expect(p.ambient).toBe(0xffffff);
      expect(p.nightness).toBe(0);
    }
  });

  it("reaches deepest night mid-cycle", () => {
    const p = dayPhase(0.75 * DAY_LENGTH_S);
    expect(p.label).toBe("night");
    expect(p.nightness).toBe(1);
  });

  it("never dims any channel below the clamp floor", () => {
    const floor = Math.round(255 * MIN_CHANNEL);
    for (let i = 0; i <= 200; i++) {
      const { ambient } = dayPhase((i / 200) * DAY_LENGTH_S);
      expect((ambient >> 16) & 0xff).toBeGreaterThanOrEqual(floor);
      expect((ambient >> 8) & 0xff).toBeGreaterThanOrEqual(floor);
      expect(ambient & 0xff).toBeGreaterThanOrEqual(floor);
    }
  });

  it("wraps: t is periodic and negatives are safe", () => {
    const a = dayPhase(10);
    const b = dayPhase(10 + DAY_LENGTH_S);
    expect(b.t).toBeCloseTo(a.t, 10);
    expect(b.ambient).toBe(a.ambient);
    const neg = dayPhase(-1);
    expect(neg.t).toBeGreaterThanOrEqual(0);
    expect(neg.t).toBeLessThan(1);
  });

  it("nightness rises monotonically through dusk", () => {
    let prev = -1;
    for (let i = 45; i <= 65; i++) {
      const { nightness } = dayPhase((i / 100) * DAY_LENGTH_S);
      expect(nightness).toBeGreaterThanOrEqual(prev);
      prev = nightness;
    }
    expect(prev).toBeCloseTo(1, 10);
  });

  it("labels the four phases in order", () => {
    expect(dayPhase(0.3 * DAY_LENGTH_S).label).toBe("day");
    expect(dayPhase(0.55 * DAY_LENGTH_S).label).toBe("dusk");
    expect(dayPhase(0.7 * DAY_LENGTH_S).label).toBe("night");
    expect(dayPhase(0.9 * DAY_LENGTH_S).label).toBe("dawn");
  });
});
