// SORT_ORDER → order. Reorder with up/down (accessible). Always buildable — the
// current arrangement is the result: { order: { sequence: [itemKeys] } }.

import { useEffect, useState } from 'react';
import type { RendererProps } from './types';
import type { SortOrderContent } from '@/activities/content/types';

export function SortOrderRenderer({ content, onResultChange }: RendererProps<SortOrderContent>) {
  const [order, setOrder] = useState<string[]>(() => content.items.map((i) => i.key));

  // The arrangement is always a valid result; report it on mount and each change.
  useEffect(() => {
    onResultChange({ order: { sequence: order } });
  }, [order, onResultChange]);

  const labelFor = (key: string) => content.items.find((i) => i.key === key);

  function move(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= order.length) return;
    const next = order.slice();
    [next[index], next[target]] = [next[target]!, next[index]!];
    setOrder(next);
  }

  return (
    <div>
      <p className="mb-4 text-sm text-white/80">{content.prompt}</p>
      <ol className="space-y-2">
        {order.map((key, i) => {
          const item = labelFor(key);
          return (
            <li
              key={key}
              className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2"
            >
              <span className="grid h-6 w-6 place-items-center rounded-full bg-white/10 text-xs text-white/70">
                {i + 1}
              </span>
              <span className="text-lg" aria-hidden="true">
                {item?.emoji}
              </span>
              <span className="flex-1 text-sm text-white/90">{item?.label}</span>
              <div className="flex flex-col gap-0.5">
                <button
                  type="button"
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  aria-label={`Move ${item?.label} up`}
                  className="rounded px-2 text-white/60 hover:bg-white/10 disabled:opacity-30"
                >
                  ▲
                </button>
                <button
                  type="button"
                  onClick={() => move(i, 1)}
                  disabled={i === order.length - 1}
                  aria-label={`Move ${item?.label} down`}
                  className="rounded px-2 text-white/60 hover:bg-white/10 disabled:opacity-30"
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
