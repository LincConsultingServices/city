import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { ACTIVITY_CONTENT } from "./content";

// Dev-mode cross-check (PRD §8.2): the authored content keys and the result kind
// each renderer produces MUST match the backend's hidden rubric, or submissions
// silently misscore / 400. This reads the real registry pack from the co-located
// academy-backend repo and self-skips when it isn't present (e.g. in CI).
const packPath = resolve(__dirname, "../../../academy-backend/internal/registry/content/c4.json");
const havePack = existsSync(packPath);

// content.kind → the result kind the renderer submits (must equal rubric.kind).
const RESULT_KIND: Record<string, string> = {
  drag_match: "objective",
  mcq: "objective",
  sort_order: "order",
  sim: "metrics",
  budget: "metrics",
};

describe.skipIf(!havePack)("content ⇄ backend rubric alignment (dev cross-check)", () => {
  const pack = JSON.parse(readFileSync(packPath, "utf8"));
  const byId: Record<string, { type: string; rubric: Record<string, unknown> }> =
    Object.fromEntries(pack.levels.BEGINNER.activities.map((a: { id: string }) => [a.id, a]));

  for (const [id, c] of Object.entries(ACTIVITY_CONTENT)) {
    if (!id.startsWith("C4-BEG-")) continue;
    it(`${id}: result kind + keys match the server rubric`, () => {
      const a = byId[id];
      expect(a, `${id} exists in the pack`).toBeTruthy();
      const rubric = a.rubric as {
        kind: string;
        answerKey?: Record<string, string>;
        orderKey?: string[];
      };

      // 1) the kind we submit must match what the server scores.
      expect(RESULT_KIND[c.kind], `${id} result kind`).toBe(rubric.kind);

      // 2) objective/order key alignment (metrics rubrics are checked in sim/budget tests).
      if (c.kind === "drag_match") {
        const items = Object.keys(rubric.answerKey!);
        expect(new Set(c.items.map((i) => i.key)), `${id} item keys`).toEqual(new Set(items));
        const zones = c.zones.map((z) => z.id);
        for (const choice of new Set(Object.values(rubric.answerKey!))) {
          expect(zones, `${id} offers choice "${choice}"`).toContain(choice);
        }
      } else if (c.kind === "mcq") {
        const items = Object.keys(rubric.answerKey!);
        expect(new Set(c.questions.map((q) => q.id)), `${id} question ids`).toEqual(new Set(items));
        for (const q of c.questions) {
          expect(
            q.options.map((o) => o.value),
            `${id}.${q.id} offers the correct choice`,
          ).toContain(rubric.answerKey![q.id]);
        }
      } else if (c.kind === "sort_order") {
        expect(new Set(c.items.map((i) => i.key)), `${id} order keys`).toEqual(
          new Set(rubric.orderKey!),
        );
      }
    });
  }
});
