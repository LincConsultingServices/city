// MINI_SIM → metrics (T3 tier). The user allocates a budget across needs/wants;
// the client computes { needsCovered, savings } via pure sim math and reports it.
// The server bounds-checks and scores — the client never proposes a score.

import { useEffect, useState } from 'react';
import { clsx } from 'clsx';
import type { RendererProps } from './types';
import type { MiniSimContent } from '@/activities/content/types';
import { computeBudget } from '@/lib/budgetSim';

export function MiniSimRenderer({ content, onResultChange }: RendererProps<MiniSimContent>) {
  const [funded, setFunded] = useState<Record<string, boolean>>({});
  const cur = content.currency ?? '$';

  const summary = computeBudget(content.budget, content.needs, content.wants, funded);

  useEffect(() => {
    onResultChange({
      metrics: {
        values: { needsCovered: summary.needsCovered, savings: summary.savings },
        decisionLog: [{ funded: Object.keys(funded).filter((k) => funded[k]) }],
      },
    });
    // Report whenever the allocation changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [funded, onResultChange]);

  function toggle(key: string) {
    setFunded((f) => ({ ...f, [key]: !f[key] }));
  }

  const pct = Math.min(100, (summary.spent / content.budget) * 100);

  const Row = ({ item }: { item: MiniSimContent['needs'][number] }) => {
    const on = !!funded[item.key];
    const wouldOverspend = !on && summary.spent + item.cost > content.budget;
    return (
      <button
        type="button"
        onClick={() => toggle(item.key)}
        disabled={wouldOverspend}
        aria-pressed={on}
        className={clsx(
          'flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left text-sm transition',
          on
            ? 'border-accent bg-accent/15 text-white'
            : 'border-white/12 text-white/75 hover:bg-white/5',
          wouldOverspend && 'cursor-not-allowed opacity-40',
        )}
      >
        <span className="text-lg" aria-hidden="true">
          {item.emoji}
        </span>
        <span className="flex-1">{item.label}</span>
        <span className="tabular-nums text-white/60">
          {cur}
          {item.cost}
        </span>
        <span className={clsx('text-xs', on ? 'text-accent' : 'text-white/30')}>
          {on ? 'funded' : 'skip'}
        </span>
      </button>
    );
  };

  return (
    <div>
      <p className="mb-3 text-sm text-white/80">{content.prompt}</p>

      {/* Budget meter */}
      <div className="mb-4 rounded-lg border border-white/10 bg-black/20 p-3">
        <div className="mb-1 flex justify-between text-xs text-white/60">
          <span>
            Spent {cur}
            {summary.spent} of {cur}
            {content.budget}
          </span>
          <span className={summary.needsCovered ? 'text-accent' : 'text-white/60'}>
            Savings {cur}
            {summary.savings}
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-accent transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <p className="mb-2 text-xs uppercase tracking-wide text-white/40">
        Needs {summary.needsCovered ? '✓ covered' : '— cover all of these'}
      </p>
      <div className="mb-4 space-y-2">
        {content.needs.map((item) => (
          <Row key={item.key} item={item} />
        ))}
      </div>

      <p className="mb-2 text-xs uppercase tracking-wide text-white/40">Wants (optional)</p>
      <div className="space-y-2">
        {content.wants.map((item) => (
          <Row key={item.key} item={item} />
        ))}
      </div>

      {content.savingsGoalHint && (
        <p className="mt-4 text-xs text-white/45">{content.savingsGoalHint}</p>
      )}
    </div>
  );
}
