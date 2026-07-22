// MCQ_FEEDBACK → objective. Builds { objective: { answers: [{itemId:q, choice}] } }
// once every question is answered. choice = the option value the server grades.

import { useState } from 'react';
import { clsx } from 'clsx';
import type { RendererProps } from './types';
import type { McqContent } from '@/activities/content/types';

export function McqRenderer({ content, onResultChange }: RendererProps<McqContent>) {
  const [answers, setAnswers] = useState<Record<string, string>>({});

  function pick(qid: string, value: string) {
    const next = { ...answers, [qid]: value };
    setAnswers(next);
    const complete = content.questions.every((q) => next[q.id]);
    onResultChange(
      complete
        ? {
            objective: {
              answers: content.questions.map((q) => ({ itemId: q.id, choice: next[q.id]! })),
            },
          }
        : null,
    );
  }

  const answered = Object.keys(answers).length;

  return (
    <div>
      {content.prompt && <p className="mb-1 text-sm text-white/80">{content.prompt}</p>}
      <p className="mb-4 text-xs text-white/40">
        {answered} of {content.questions.length} answered
      </p>
      <ol className="space-y-5">
        {content.questions.map((q, qi) => (
          <li key={q.id}>
            <p className="mb-2 text-sm font-medium text-white/90">
              {qi + 1}. {q.text}
            </p>
            <div className="grid gap-1.5" role="radiogroup" aria-label={q.text}>
              {q.options.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  role="radio"
                  aria-checked={answers[q.id] === opt.value}
                  onClick={() => pick(q.id, opt.value)}
                  className={clsx(
                    'rounded-lg border px-3 py-2 text-left text-sm transition',
                    answers[q.id] === opt.value
                      ? 'border-accent bg-accent/15 text-white'
                      : 'border-white/12 text-white/75 hover:bg-white/5',
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
