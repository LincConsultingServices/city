import { describe, it, expect } from "vitest";
import { ACTIVITY_CONTENT } from "./content";

// Authored content must line up with the server's hidden answer/order keys — a
// typo in an itemId or option value silently scores 1/3 no matter how well the
// player does (we shipped exactly that bug once). These guards are structural:
// they can't check the answers (server-only), but they catch malformed keys.
describe("authored activity content", () => {
  const entries = Object.entries(ACTIVITY_CONTENT);

  it("keys every entry by a canonical registry id", () => {
    for (const [id] of entries) expect(id).toMatch(/^C\d-(BEG|MED|HARD)-\d{2}$/);
  });

  it("MCQ content uses q-numbered items with unique a–d options", () => {
    for (const [id, c] of entries) {
      if (c.kind !== "mcq") continue;
      expect(c.questions.length, `${id} question count`).toBeGreaterThan(0);
      const qids = c.questions.map((q) => q.id);
      expect(new Set(qids).size, `${id} duplicate question ids`).toBe(qids.length);
      for (const q of c.questions) {
        expect(q.id, `${id}.${q.id} id shape`).toMatch(/^q\d+$/);
        expect(q.text.length, `${id}.${q.id} empty text`).toBeGreaterThan(0);
        const values = q.options.map((o) => o.value);
        expect(new Set(values).size, `${id}.${q.id} duplicate option values`).toBe(values.length);
        for (const v of values) expect(v, `${id}.${q.id} option value`).toMatch(/^[a-d]$/);
      }
    }
  });

  it("drag-match content has unique item keys and only declared zones", () => {
    for (const [id, c] of entries) {
      if (c.kind !== "drag_match") continue;
      const keys = c.items.map((i) => i.key);
      expect(new Set(keys).size, `${id} duplicate item keys`).toBe(keys.length);
      const zoneIds = c.zones.map((z) => z.id);
      expect(new Set(zoneIds).size, `${id} duplicate zone ids`).toBe(zoneIds.length);
      expect(zoneIds.length, `${id} needs at least two zones`).toBeGreaterThan(1);
    }
  });

  it("sort-order content has unique item keys", () => {
    for (const [id, c] of entries) {
      if (c.kind !== "sort_order") continue;
      const keys = c.items.map((i) => i.key);
      expect(new Set(keys).size, `${id} duplicate item keys`).toBe(keys.length);
      expect(keys.length, `${id} needs at least two items`).toBeGreaterThan(1);
    }
  });

  it("budget content has unique keys, positive costs and at least one essential", () => {
    for (const [id, c] of entries) {
      if (c.kind !== "budget") continue;
      const keys = c.items.map((i) => i.key);
      expect(new Set(keys).size, `${id} duplicate item keys`).toBe(keys.length);
      expect(c.budget, `${id} budget`).toBeGreaterThan(0);
      expect(
        c.items.some((i) => i.essential),
        `${id} needs at least one essential`,
      ).toBe(true);
      for (const i of c.items) expect(i.cost, `${id}.${i.key} cost`).toBeGreaterThan(0);
    }
  });

  it("sim content declares a positive round count and starting cash", () => {
    for (const [id, c] of entries) {
      if (c.kind !== "sim") continue;
      expect(c.rounds, `${id} rounds`).toBeGreaterThan(0);
      expect(c.startingCash, `${id} startingCash`).toBeGreaterThan(0);
      expect(c.weather.length, `${id} weather flavor`).toBeGreaterThan(0);
    }
  });
});
