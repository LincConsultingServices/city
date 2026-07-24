import { useEffect, useMemo, useRef, useState } from "react";
import { api, ApiError } from "@/framework/api";
import { CLIENT_VERSION } from "@/framework/config/appConfig";
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
      events.emit("activity_completed", resp);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't submit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const body = useMemo(() => {
    if (response) return <ResultView response={response} onClose={onClose} />;
    if (content?.kind === "sim")
      return <MiniSimRenderer content={content} activityId={activity.id} onChange={setResult} />;
    if (content?.kind === "mcq") return <McqRenderer content={content} onChange={setResult} />;
    if (content?.kind === "budget")
      return <BudgetRenderer content={content} onChange={setResult} />;
    if (content?.kind === "drag_match")
      return <DragMatchRenderer content={content} onChange={setResult} />;
    if (content?.kind === "sort_order")
      return <SortOrderRenderer content={content} onChange={setResult} />;
    if (content?.kind === "decision_tree")
      return <DecisionTreeRenderer content={content} onChange={setResult} />;
    return (
      <p className="text-muted">
        No client content authored for <code className="text-gold">{activity.id}</code> yet — its{" "}
        <code className="text-gold">{activity.activityType}</code> renderer/content lands next in
        F1.
      </p>
    );
  }, [response, content, activity, onClose]);

  return (
    <Modal onClose={onClose}>
      <div className="flex items-center justify-between border-b border-line pb-3">
        <div>
          <h2 className="font-display text-xl font-semibold text-text">{activity.title}</h2>
          <p className="text-xs text-muted">
            {venueName} · {activity.competencyCode} · {activity.level} · {activity.activityType}
          </p>
        </div>
        <button onClick={onClose} className="text-muted hover:text-text" aria-label="Quit">
          ✕
        </button>
      </div>

      <div className="py-5">{body}</div>

      {!response && (
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

function ResultView({ response, onClose }: { response: SubmitResponse; onClose: () => void }) {
  return (
    <div className="text-center">
      <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-gold/15 text-3xl">
        {response.passed ? "🎉" : "💪"}
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
        <p className="mt-2 text-sm text-gold">
          🏅 {response.badgesAwarded.map((b) => b.name).join(", ")}
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

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      className="absolute inset-0 z-30 grid place-items-center bg-ink/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-line bg-surface p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
