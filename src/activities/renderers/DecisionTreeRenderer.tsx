import { useState } from "react";
import type { DecisionChoice, DecisionTreeContent } from "@/activities/content";
import type { ResultPayload } from "@/framework/api/schemas";

// DECISION_TREE → trace (PRD §8.1; PRD_Cafe_Interior.md §6). A speaker delivers a
// staged prompt, the player picks one of 3 choices, a consequence plays, then the
// scene either chains to a follow-up node or ends. Tiers are carried in content
// for the server rubric only and are NEVER rendered — showing them would turn
// "make the call" into "pick the labeled right answer."
export function DecisionTreeRenderer({
  content,
  onChange,
}: {
  content: DecisionTreeContent;
  onChange: (result: ResultPayload | null) => void;
}) {
  const [nodeId, setNodeId] = useState(content.entryNodeId);
  const [pending, setPending] = useState<DecisionChoice | null>(null);
  const [path, setPath] = useState<string[]>([]);
  const [ended, setEnded] = useState(false);

  const node = content.nodes.find((n) => n.id === nodeId) ?? content.nodes[0];

  function pick(choice: DecisionChoice) {
    setPending(choice);
    onChange(null);
  }

  function advance() {
    if (!pending) return;
    const nextPath = [...path, pending.id];
    setPath(nextPath);
    if (pending.next) {
      const next = content.nodes.find((n) => n.id === pending.next);
      if (next) {
        setPending(null);
        setNodeId(next.id);
        return;
      }
    }
    // End of the scene — commit the trace and freeze on the final consequence.
    setEnded(true);
    onChange({ trace: { path: nextPath } });
  }

  return (
    <div>
      <div className="rounded-xl border border-line bg-surface-2 px-4 py-3">
        <p className="text-xs font-medium uppercase tracking-wide text-gold">{node.speaker}</p>
        <p className="mt-1.5 text-sm leading-relaxed text-text">{node.prompt}</p>
      </div>

      {!pending && (
        <div className="mt-4 space-y-2">
          {node.choices.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => pick(c)}
              className="w-full rounded-lg border border-line bg-surface-2 px-3.5 py-2.5 text-left text-sm text-text transition hover:border-gold/60 hover:bg-gold/5"
            >
              {c.text}
            </button>
          ))}
        </div>
      )}

      {pending && (
        <div className="mt-4 rounded-xl border border-gold/40 bg-gold/5 px-4 py-3">
          <p className="text-sm leading-relaxed text-text">{pending.consequence}</p>
          {ended ? (
            <p className="mt-3 text-sm text-muted">
              You've made your call. Submit when you're ready.
            </p>
          ) : (
            <button
              type="button"
              onClick={advance}
              className="mt-3 rounded-lg bg-gold px-4 py-1.5 text-sm font-medium text-ink hover:brightness-110"
            >
              Continue
            </button>
          )}
        </div>
      )}
    </div>
  );
}
