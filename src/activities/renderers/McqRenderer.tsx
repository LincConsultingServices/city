import { useState } from "react";
import type { McqContent } from "@/activities/content";
import type { ResultPayload } from "@/framework/api/schemas";

// MCQ_FEEDBACK renderer (objective kind). Reports a ResultPayload up to the shell
// (null until answered); the shell owns the Submit button (PRD §8.1).
export function McqRenderer({
  content,
  onChange,
}: {
  content: McqContent;
  onChange: (result: ResultPayload | null) => void;
}) {
  const [choice, setChoice] = useState<string | null>(null);

  function pick(optionId: string) {
    setChoice(optionId);
    onChange({ objective: { answers: [{ itemId: content.itemId, choice: optionId }] } });
  }

  return (
    <div>
      <p className="text-lg leading-relaxed text-text">{content.question}</p>
      <div className="mt-5 space-y-2">
        {content.options.map((o) => {
          const selected = choice === o.id;
          return (
            <button
              key={o.id}
              onClick={() => pick(o.id)}
              className={
                "flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition " +
                (selected
                  ? "border-gold bg-gold/10 text-text"
                  : "border-line bg-surface-2 text-muted hover:border-gold/60 hover:text-text")
              }
            >
              <span
                className={
                  "grid h-6 w-6 shrink-0 place-items-center rounded-full border text-xs font-semibold " +
                  (selected ? "border-gold bg-gold text-ink" : "border-line")
                }
              >
                {o.id.toUpperCase()}
              </span>
              <span>{o.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
