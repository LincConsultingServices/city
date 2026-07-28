// DECISION_TREE → trace. Beat by beat: a stage, three choices, a consequence,
// then the branch-specific follow-up. The result is the visited path of choice
// keys — `{ trace: { path: ["c", "a"] } }` — and it is only buildable once the
// tree runs out of beats, so a half-finished decision can never be submitted.
//
// SILENT TIER (docs/maison.md §11): this component renders no tier, score, star,
// tick, cross or "n/3". A consequence reports what happened; it never says
// whether it was the right call. The learner reads the world, not a verdict.
import { useEffect, useMemo, useState } from "react";
import {
  choicesAlong,
  isComplete,
  nodeAt,
  presentationOrder,
  type DecisionTreeContent,
} from "@/lib/decisionTree";
import type { ResultPayload } from "@/framework/api/schemas";

export function DecisionTreeRenderer({
  content,
  activityId,
  onChange,
}: {
  content: DecisionTreeContent;
  /** Seeds the per-beat choice shuffle so no option sits in the same slot twice. */
  activityId: string;
  onChange: (result: ResultPayload | null) => void;
}) {
  const [path, setPath] = useState<string[]>([]);

  const node = nodeAt(content, path);
  const done = isComplete(content, path);
  const taken = choicesAlong(content, path);
  // Authored weakest-first; shown shuffled, so position carries nothing (§9.1).
  const shown = useMemo(
    () => (node ? presentationOrder(activityId, path, node.choices) : []),
    [node, activityId, path],
  );

  // Submittable only once the tree has ended. An unfinished path would land on
  // no rubric terminal at all, so it must not reach the Submit button.
  useEffect(() => {
    onChange(done ? { trace: { path } } : null);
  }, [done, path, onChange]);

  return (
    <div>
      <p className="text-xs uppercase tracking-[0.18em] text-muted">
        {content.host} · {content.countdown}
      </p>

      {taken.map((choice, i) => (
        <div key={`${i}-${choice.key}`} className="mt-4 border-l-2 border-line pl-4">
          <p className="text-sm leading-relaxed text-muted">{choice.text}</p>
          {choice.consequence && (
            <p className="mt-2 text-sm leading-relaxed text-text" role="status" aria-live="polite">
              {choice.consequence}
            </p>
          )}
        </div>
      ))}

      {node && (
        <div className="mt-5">
          {node.stage.map((para, i) => (
            <p key={i} className="mb-3 text-sm leading-relaxed text-text">
              {para}
            </p>
          ))}
          <div className="mt-4 space-y-2">
            {shown.map((choice) => (
              <button
                key={choice.key}
                onClick={() => setPath((prev) => [...prev, choice.key])}
                className="w-full rounded-xl border border-line bg-surface-2 px-4 py-3 text-left text-sm leading-relaxed text-text transition hover:border-gold/50 hover:brightness-110"
              >
                {choice.text}
              </button>
            ))}
          </div>
        </div>
      )}

      {done && <p className="mt-5 text-sm text-muted">That is the season. Submit when ready.</p>}
    </div>
  );
}
