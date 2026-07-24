import { useState } from "react";
import type { DragMatchContent } from "@/activities/content";
import type { ResultPayload } from "@/framework/api/schemas";

// DRAG_MATCH → objective (PRD §8.1). Tap-to-sort (accessible; dnd-kit polish is a
// later enhancement). Reports { objective: { answers: [{itemId, choice}] } } once
// every item is placed; itemId/choice use the server-graded keys. Ported and
// adapted to this codebase's renderer contract from the original scaffold.
export function DragMatchRenderer({
  content,
  onChange,
}: {
  content: DragMatchContent;
  onChange: (result: ResultPayload | null) => void;
}) {
  const [assign, setAssign] = useState<Record<string, string>>({});

  function place(key: string, zone: string) {
    const next = { ...assign, [key]: zone };
    setAssign(next);
    const complete = content.items.every((i) => next[i.key]);
    onChange(
      complete
        ? {
            objective: {
              answers: content.items.map((i) => ({ itemId: i.key, choice: next[i.key] })),
            },
          }
        : null,
    );
  }

  const placed = Object.keys(assign).length;
  const manyZones = content.zones.length > 4;

  return (
    <div>
      <p className="text-lg leading-relaxed text-text">{content.prompt}</p>
      <p className="mt-1 text-xs text-muted">
        {placed} of {content.items.length} sorted
      </p>
      <div className="mt-4 space-y-2">
        {content.items.map((item) => (
          <div
            key={item.key}
            className="flex items-center gap-3 rounded-xl border border-line bg-surface-2 px-3 py-2.5"
          >
            <span className="text-lg" aria-hidden="true">
              {item.emoji}
            </span>
            <span className="flex-1 text-sm text-text">{item.label}</span>
            {/* Many zones (e.g. 8 price tags) would make a button row unusable. */}
            {manyZones ? (
              <select
                value={assign[item.key] ?? ""}
                onChange={(e) => place(item.key, e.target.value)}
                aria-label={`Match ${item.label}`}
                className={
                  "rounded-md border px-2 py-1 text-xs font-medium outline-none " +
                  (assign[item.key]
                    ? "border-gold bg-gold/10 text-gold"
                    : "border-line bg-surface text-muted")
                }
              >
                <option value="" disabled>
                  Pick…
                </option>
                {content.zones.map((zone) => (
                  <option key={zone.id} value={zone.id}>
                    {zone.label}
                  </option>
                ))}
              </select>
            ) : (
              <div className="flex gap-1.5" role="group" aria-label={`Sort ${item.label}`}>
                {content.zones.map((zone) => {
                  const on = assign[item.key] === zone.id;
                  return (
                    <button
                      key={zone.id}
                      type="button"
                      onClick={() => place(item.key, zone.id)}
                      aria-pressed={on}
                      className={
                        "rounded-md px-3 py-1 text-xs font-medium transition " +
                        (on
                          ? "bg-gold text-ink"
                          : "border border-line text-muted hover:bg-surface hover:text-text")
                      }
                    >
                      {zone.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
