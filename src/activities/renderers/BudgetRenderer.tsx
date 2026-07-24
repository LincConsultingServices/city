import { useState } from "react";
import type { BudgetContent } from "@/activities/content";
import { summarizeBudget } from "@/lib/budget";
import type { ResultPayload } from "@/framework/api/schemas";

// Budget allocation → `metrics`. Pick what to spend on within a budget. Which
// items are essential is deliberately NOT shown — working that out IS the
// exercise (needs vs wants / party essentials). Overspending is allowed and
// simply scores lower, so the meter turning red is the lesson.
export function BudgetRenderer({
  content,
  onChange,
}: {
  content: BudgetContent;
  onChange: (result: ResultPayload | null) => void;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const cur = (n: number) => `${content.currency}${n}`;

  function toggle(key: string) {
    const next = selected.includes(key) ? selected.filter((k) => k !== key) : [...selected, key];
    setSelected(next);
    if (next.length === 0) {
      onChange(null); // nothing chosen yet — not submittable
      return;
    }
    const s = summarizeBudget(content.budget, content.items, next);
    onChange({ metrics: { values: s.values, decisionLog: s.decisionLog } });
  }

  const s = summarizeBudget(content.budget, content.items, selected);
  const left = content.budget - s.values.totalCost;

  return (
    <div>
      <p className="text-sm leading-relaxed text-muted">{content.intro}</p>

      {/* Budget meter */}
      <div className="mt-4 flex items-center justify-between rounded-xl border border-line bg-surface-2 px-4 py-3">
        <Meter label="Budget" value={cur(content.budget)} />
        <Meter label="Spent" value={cur(s.values.totalCost)} />
        <Meter
          label={left >= 0 ? "Left" : "Over"}
          value={cur(Math.abs(left))}
          tone={left < 0 ? "danger" : "coin"}
        />
      </div>
      {s.values.overBudget && (
        <p className="mt-2 text-center text-xs text-danger">
          That's more than you have — take something out.
        </p>
      )}
      {content.goalHint && !s.values.overBudget && (
        <p className="mt-2 text-center text-xs text-muted">{content.goalHint}</p>
      )}

      {/* Items */}
      <div className="mt-4 space-y-2">
        {content.items.map((item) => {
          const on = selected.includes(item.key);
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => toggle(item.key)}
              aria-pressed={on}
              className={
                "flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition " +
                (on ? "border-gold bg-gold/10" : "border-line bg-surface-2 hover:border-gold/50")
              }
            >
              <span
                className={
                  "grid h-5 w-5 shrink-0 place-items-center rounded border text-[11px] " +
                  (on ? "border-gold bg-gold text-ink" : "border-line text-transparent")
                }
                aria-hidden="true"
              >
                ✓
              </span>
              <span className="text-lg" aria-hidden="true">
                {item.emoji}
              </span>
              <span className={"flex-1 text-sm " + (on ? "text-text" : "text-muted")}>
                {item.label}
              </span>
              <span className="text-sm tabular-nums text-muted">{cur(item.cost)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Meter({ label, value, tone }: { label: string; value: string; tone?: "coin" | "danger" }) {
  const color = tone === "danger" ? "text-danger" : tone === "coin" ? "text-coin" : "text-text";
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-muted">{label}</p>
      <p className={"text-lg font-semibold tabular-nums " + color}>{value}</p>
    </div>
  );
}
