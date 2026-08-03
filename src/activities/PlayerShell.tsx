import { useEffect, useMemo, useRef, useState } from "react";
import { api, ApiError } from "@/framework/api";
import { CLIENT_VERSION, devWorldBypass } from "@/framework/config/appConfig";
import { events } from "@/framework/events";
import { useEconomyStore } from "@/framework/economy/economyStore";
import type { LevelActivity, ResultPayload, SubmitResponse } from "@/framework/api/schemas";
import { ACTIVITY_CONTENT } from "./content";
import { McqRenderer } from "./renderers/McqRenderer";
import { MiniSimRenderer } from "./renderers/MiniSimRenderer";
import { DragMatchRenderer } from "./renderers/DragMatchRenderer";
import { SortOrderRenderer } from "./renderers/SortOrderRenderer";
import { BudgetRenderer } from "./renderers/BudgetRenderer";
import { DecisionTreeRenderer } from "./renderers/DecisionTreeRenderer";
import { Icon } from "@/ui/Icon";
import { Modal } from "@/ui/Modal";

/**
 * Content kinds that run under the SILENT-TIER contract (docs/maison.md §11):
 * the venue never shows a tier, a star, a proficiency number or a pass/fail. The
 * score still happens — the server owns it and coins still land — but a scenario
 * is read off the world it changed, and the tier vocabulary appears exactly once,
 * in that venue's end-of-journey report.
 */
const SILENT_TIER_KINDS = new Set<string>(["decision_tree"]);

// Player shell (PRD §8) — header + one renderer + server-driven result. F1 wires the
// objective loop (start → play → submit → server result/celebration) end-to-end.
export function PlayerShell({
  activity,
  venueName,
  onClose,
}: {
  activity: LevelActivity;
  venueName: string;
  onClose: () => void;
}) {
  const content = ACTIVITY_CONTENT[activity.id];
  const [result, setResult] = useState<ResultPayload | null>(null);
  const [response, setResponse] = useState<SubmitResponse | null>(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  /** Dev world only: submitted, but there was no backend to score it. */
  const [unscored, setUnscored] = useState(false);
  const startedAt = useRef<number>(Date.now());
  const applyCoinBalance = useEconomyStore((s) => s.applyCoinBalance);

  useEffect(() => {
    startedAt.current = Date.now();
    // Mark IN_PROGRESS (idempotent); non-blocking.
    void api.startActivity(activity.id).catch(() => {});
  }, [activity.id]);

  async function onSubmit() {
    if (!result || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      const resp = await api.submit(activity.id, {
        clientVersion: CLIENT_VERSION,
        durationSec: Math.max(0, Math.round((Date.now() - startedAt.current) / 1000)),
        hintsUsed: 0,
        result,
      });
      setResponse(resp);
      applyCoinBalance(resp.coinBalance);
      if (typeof resp.coinBalance === "number") events.emit("coins_changed", resp.coinBalance);
      resp.badgesAwarded?.forEach((b) => events.emit("badge_awarded", b));
      events.emit("activity_completed", {
        response: resp,
        silent: SILENT_TIER_KINDS.has(content?.kind ?? ""),
      });
      // The choice itself, for venues whose world moves on what you decided.
      events.emit("activity_submitted", { activityId: activity.id, result, response: resp });
    } catch (e) {
      // Dev world has no backend (docs/maison.md §0.4). The decision still
      // happened, so a scenario venue's world can still move off the trace —
      // but nothing about the SCORE is invented, here or anywhere: no
      // proficiency, no pass, no coins, and the close says so.
      if (devWorldBypass) {
        setUnscored(true);
        events.emit("activity_submitted", { activityId: activity.id, result });
        return;
      }
      setError(e instanceof ApiError ? e.message : "Couldn't submit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const body = useMemo(() => {
    if (unscored) return <UnscoredView onClose={onClose} />;
    if (response)
      return SILENT_TIER_KINDS.has(content?.kind ?? "") ? (
        <SilentResultView onClose={onClose} />
      ) : (
        <ResultView response={response} onClose={onClose} />
      );
    if (content?.kind === "decision_tree")
      return (
        <DecisionTreeRenderer content={content} activityId={activity.id} onChange={setResult} />
      );
    if (content?.kind === "sim")
      return <MiniSimRenderer content={content} activityId={activity.id} onChange={setResult} />;
    if (content?.kind === "mcq") return <McqRenderer content={content} onChange={setResult} />;
    if (content?.kind === "budget")
      return <BudgetRenderer content={content} onChange={setResult} />;
    if (content?.kind === "drag_match")
      return <DragMatchRenderer content={content} onChange={setResult} />;
    if (content?.kind === "sort_order")
      return <SortOrderRenderer content={content} onChange={setResult} />;
    return (
      <p className="text-muted">
        This activity isn't playable yet — its content is still being written.
      </p>
    );
  }, [unscored, response, content, activity, onClose]);

  return (
    <Modal onClose={onClose} width="md" z={30}>
      <div className="flex items-center justify-between border-b border-line pb-3">
        <div>
          <h2 className="font-display text-xl font-semibold text-text">{activity.title}</h2>
          <p className="text-xs text-muted">
            {venueName} · {activity.competencyCode} · {activity.level} · {activity.activityType}
          </p>
        </div>
        <button
          onClick={onClose}
          className="grid h-8 w-8 place-items-center rounded-lg text-muted transition hover:bg-surface-2 hover:text-text"
          aria-label="Quit"
        >
          <Icon name="cross" className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="py-5">{body}</div>

      {!response && !unscored && (
        <div className="flex items-center justify-between border-t border-line pt-3">
          {error ? <span className="text-sm text-danger">{error}</span> : <span />}
          <button
            onClick={onSubmit}
            disabled={!result || submitting}
            className="rounded-lg bg-gold px-5 py-2 font-medium text-ink transition hover:brightness-110 disabled:opacity-50"
          >
            {submitting ? "Submitting…" : "Submit"}
          </button>
        </div>
      )}
    </Modal>
  );
}

/**
 * Dev world only: the decision was made and there was no server to score it.
 * Says exactly that, and nothing about how it went — the point of the dev
 * fixture is to make the venue walkable, not to pretend it was graded.
 */
function UnscoredView({ onClose }: { onClose: () => void }) {
  return (
    <div className="text-center">
      <h3 className="font-display text-2xl font-semibold text-text">Decided.</h3>
      <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
        Dev world — there is no backend here, so this was not scored. The world moved on what you
        chose.
      </p>
      <button
        onClick={onClose}
        className="mt-6 rounded-lg bg-gold px-5 py-2 font-medium text-ink hover:brightness-110"
      >
        Back to the venue
      </button>
    </div>
  );
}

/**
 * The silent-tier close (§11). No icon of judgement, no proficiency, no
 * pass/fail, and none of the server's feedback prose — the decision was the
 * whole thing, and the world reports what it cost. The submission itself is
 * unchanged; only the view is.
 */
function SilentResultView({ onClose }: { onClose: () => void }) {
  return (
    <div className="text-center">
      <h3 className="font-display text-2xl font-semibold text-text">Recorded.</h3>
      <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
        What you decided is on the rail. Nobody is going to tell you what it was worth.
      </p>
      <button
        onClick={onClose}
        className="mt-6 rounded-lg bg-gold px-5 py-2 font-medium text-ink hover:brightness-110"
      >
        Back to the floor
      </button>
    </div>
  );
}

function ResultView({ response, onClose }: { response: SubmitResponse; onClose: () => void }) {
  return (
    <div className="text-center">
      <div
        className={`mx-auto grid h-16 w-16 place-items-center rounded-full ${
          response.passed ? "bg-success/15 text-success" : "bg-accent/15 text-accent"
        }`}
      >
        <Icon name={response.passed ? "trophy" : "star"} className="h-8 w-8" />
      </div>
      <h3 className="mt-3 font-display text-2xl font-semibold text-text">
        {response.passed ? "Passed!" : "Not yet — keep going"}
      </h3>
      <p className="mt-1 text-sm text-muted">
        Proficiency {response.proficiency}/3 · best {response.bestProficiency}/3
        {response.graded === "fallback" && " · scored offline"}
      </p>
      {response.feedback && <p className="mt-3 text-sm text-text">{response.feedback}</p>}
      {typeof response.coinsEarned === "number" && (
        <p className="mt-3 font-medium text-coin">+{response.coinsEarned} coins</p>
      )}
      {response.badgesAwarded && response.badgesAwarded.length > 0 && (
        <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-gold">
          <Icon name="medal" className="h-4 w-4" />
          {response.badgesAwarded.map((b) => b.name).join(", ")}
        </p>
      )}
      <button
        onClick={onClose}
        className="mt-6 rounded-lg bg-gold px-5 py-2 font-medium text-ink hover:brightness-110"
      >
        Back to the venue
      </button>
    </div>
  );
}
