import { useState } from "react";
import type { McqContent } from "@/activities/content";
import type { ResultPayload } from "@/framework/api/schemas";

// MCQ_FEEDBACK → objective (PRD §8.1). The real C4 activities carry EIGHT
// questions each (server itemIds q1..q8, choices "a".."d"), so this renders the
// whole set and only reports a result once every question is answered. Question
// ids and option values must match the server's hidden answer key.
export function McqRenderer({
  content,
  onChange,
}: {
  content: McqContent;
  onChange: (result: ResultPayload | null) => void;
}) {
  const [answers, setAnswers] = useState<Record<string, string>>({});

  function pick(questionId: string, value: string) {
    const next = { ...answers, [questionId]: value };
    setAnswers(next);
    const complete = content.questions.every((q) => next[q.id]);
    onChange(
      complete
        ? {
            objective: {
              answers: content.questions.map((q) => ({ itemId: q.id, choice: next[q.id] })),
            },
          }
        : null,
    );
  }

  const answered = Object.keys(answers).length;

  return (
    <div>
      {content.prompt && <p className="text-sm leading-relaxed text-muted">{content.prompt}</p>}
      <p className="mt-1 text-xs text-muted">
        {answered} of {content.questions.length} answered
      </p>

      <div className="mt-4 space-y-5">
        {content.questions.map((q, qi) => (
          <fieldset key={q.id}>
            <legend className="text-sm leading-relaxed text-text">
              <span className="mr-1.5 text-muted">{qi + 1}.</span>
              {q.text}
            </legend>
            <div className="mt-2 space-y-1.5">
              {q.options.map((o) => {
                const selected = answers[q.id] === o.value;
                return (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => pick(q.id, o.value)}
                    aria-pressed={selected}
                    className={
                      "flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left text-sm transition " +
                      (selected
                        ? "border-gold bg-gold/10 text-text"
                        : "border-line bg-surface-2 text-muted hover:border-gold/60 hover:text-text")
                    }
                  >
                    <span
                      className={
                        "grid h-5 w-5 shrink-0 place-items-center rounded-full border text-[11px] font-semibold " +
                        (selected ? "border-gold bg-gold text-ink" : "border-line")
                      }
                    >
                      {o.value.toUpperCase()}
                    </span>
                    <span>{o.label}</span>
                  </button>
                );
              })}
            </div>
          </fieldset>
        ))}
      </div>
    </div>
  );
}
