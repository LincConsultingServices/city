import { useEffect, useState } from "react";
import type { SortOrderContent } from "@/activities/content";
import type { ResultPayload } from "@/framework/api/schemas";

// SORT_ORDER → order (PRD §8.1). Reorder with up/down (accessible). Always
// buildable — the current arrangement is the result { order: { sequence } }.
// Ported and adapted to this codebase's renderer contract from the original scaffold.
export function SortOrderRenderer({
  content,
  onChange,
}: {
  content: SortOrderContent;
  onChange: (result: ResultPayload | null) => void;
}) {
  const [order, setOrder] = useState<string[]>(() => content.items.map((i) => i.key));

  // The arrangement is always a valid result; report it on mount and each change.
  useEffect(() => {
    onChange({ order: { sequence: order } });
  }, [order, onChange]);

  const itemFor = (key: string) => content.items.find((i) => i.key === key);

  function move(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= order.length) return;
    const next = order.slice();
    [next[index], next[target]] = [next[target], next[index]];
    setOrder(next);
  }

  return (
    <div>
      <p className="text-lg leading-relaxed text-text">{content.prompt}</p>
      <ol className="mt-4 space-y-2">
        {order.map((key, i) => {
          const item = itemFor(key);
          return (
            <li
              key={key}
              className="flex items-center gap-3 rounded-xl border border-line bg-surface-2 px-3 py-2.5"
            >
              <span className="grid h-6 w-6 place-items-center rounded-full bg-line/50 text-xs text-muted">
                {i + 1}
              </span>
              <span className="text-lg" aria-hidden="true">
                {item?.emoji}
              </span>
              <span className="flex-1 text-sm text-text">{item?.label}</span>
              <div className="flex flex-col gap-0.5">
                <button
                  type="button"
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  aria-label={`Move ${item?.label} up`}
                  className="rounded px-2 text-muted hover:bg-surface hover:text-text disabled:opacity-30"
                >
                  ▲
                </button>
                <button
                  type="button"
                  onClick={() => move(i, 1)}
                  disabled={i === order.length - 1}
                  aria-label={`Move ${item?.label} down`}
                  className="rounded px-2 text-muted hover:bg-surface hover:text-text disabled:opacity-30"
                >
                  ▼
                </button>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
