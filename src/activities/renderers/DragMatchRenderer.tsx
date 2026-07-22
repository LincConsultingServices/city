// DRAG_MATCH → objective. Tap-to-sort (accessible; dnd-kit polish is a later
// enhancement). Builds { objective: { answers: [{itemId, choice}] } } once every
// item is placed. itemId/choice use the exact server-graded keys.

import { useState } from 'react';
import { clsx } from 'clsx';
import type { RendererProps } from './types';
import type { DragMatchContent } from '@/activities/content/types';
import type { Result } from '@/framework/api/schemas';

export function DragMatchRenderer({ content, onResultChange }: RendererProps<DragMatchContent>) {
  const [assign, setAssign] = useState<Record<string, string>>({});

  function report(next: Record<string, string>) {
    const complete = content.items.every((i) => next[i.key]);
    const result: Result | null = complete
      ? {
          objective: {
            answers: content.items.map((i) => ({ itemId: i.key, choice: next[i.key]! })),
          },
        }
      : null;
    onResultChange(result);
  }

  function place(key: string, zone: string) {
    const next = { ...assign, [key]: zone };
    setAssign(next);
    report(next);
  }

  const placed = Object.keys(assign).length;

  return (
    <div>
      <p className="mb-1 text-sm text-white/80">{content.prompt}</p>
      <p className="mb-4 text-xs text-white/40">
        {placed} of {content.items.length} sorted
      </p>
      <div className="space-y-2">
        {content.items.map((item) => (
          <div
            key={item.key}
            className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2"
          >
            <span className="text-lg" aria-hidden="true">
              {item.emoji}
            </span>
            <span className="flex-1 text-sm text-white/90">{item.label}</span>
            <div className="flex gap-1.5" role="group" aria-label={`Sort ${item.label}`}>
              {content.zones.map((zone) => (
                <button
                  key={zone.id}
                  type="button"
                  onClick={() => place(item.key, zone.id)}
                  aria-pressed={assign[item.key] === zone.id}
                  className={clsx(
                    'rounded-md px-3 py-1 text-xs font-medium transition',
                    assign[item.key] === zone.id
                      ? 'bg-accent text-night'
                      : 'border border-white/15 text-white/70 hover:bg-white/5',
                  )}
                >
                  {zone.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
