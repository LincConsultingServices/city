// ActivityPlayer — orchestrates one activity: start → renderer builds a result →
// submit → server-scored celebration (PRD §8.2). Server-authoritative: the
// client submits a structured result and renders exactly what the server returns.

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CLIENT_VERSION } from '@/config/appConfig';
import { api } from '@/framework/api/client';
import { ApiError } from '@/framework/api/errorEnvelope';
import type { ActivitySummary, Result, SubmitResponse } from '@/framework/api/schemas';
import { economy } from '@/framework/economy/economy';
import { events } from '@/framework/events';
import { PlayerShell } from './PlayerShell';
import { getActivityContent } from './content';
import { getRenderer } from './renderers';

interface Props {
  activity: ActivitySummary;
  onExit: () => void;
}

export function ActivityPlayer({ activity, onExit }: Props) {
  const content = getActivityContent(activity.id);
  const Renderer = getRenderer(activity.activityType);
  const queryClient = useQueryClient();

  const [result, setResult] = useState<Result | null>(null);
  const [response, setResponse] = useState<SubmitResponse | null>(null);
  const startedAt = useRef<number>(Date.now());

  // Best-effort start; ignore failures (the loop still works).
  useEffect(() => {
    api.startActivity(activity.id).catch(() => {});
  }, [activity.id]);

  const onResultChange = useCallback((r: Result | null) => setResult(r), []);

  const submit = useMutation({
    mutationFn: (r: Result) =>
      api.submit(activity.id, {
        clientVersion: CLIENT_VERSION,
        durationSec: Math.max(0, Math.round((Date.now() - startedAt.current) / 1000)),
        hintsUsed: 0,
        result: r,
      }),
    onSuccess: (resp) => {
      economy.applySubmitResponse(resp);
      setResponse(resp);
      void queryClient.invalidateQueries({ queryKey: ['progress'] });
      void queryClient.invalidateQueries({ queryKey: ['venueActivities'] });
    },
    onError: (err) => {
      const message = err instanceof ApiError ? err.message : 'Could not submit — try again.';
      events.emit('toast_requested', { message, level: 'error' });
    },
  });

  const meta = [activity.competencyCode, activity.level].filter(Boolean).join(' · ');

  if (response) {
    return (
      <PlayerShell
        title={activity.title}
        competency={activity.competencyCode}
        level={activity.level}
        onQuit={onExit}
      >
        <Celebration
          response={response}
          onReplay={() => {
            setResponse(null);
            setResult(null);
            startedAt.current = Date.now();
          }}
          onExit={onExit}
        />
      </PlayerShell>
    );
  }

  return (
    <PlayerShell
      title={activity.title}
      competency={activity.competencyCode}
      level={activity.level}
      onQuit={onExit}
    >
      <div className="flex h-full flex-col">
        <div className="min-h-0 flex-1 overflow-auto pr-1">
          {content && Renderer ? (
            <Renderer content={content} onResultChange={onResultChange} />
          ) : (
            <p className="text-sm text-white/50">
              This activity ({activity.activityType}) doesn&apos;t have content yet — coming soon.
            </p>
          )}
        </div>
        <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-4">
          <span className="text-xs text-white/40">{meta}</span>
          <button
            type="button"
            disabled={!result || submit.isPending}
            onClick={() => result && submit.mutate(result)}
            className="rounded-lg bg-accent px-5 py-2 text-sm font-semibold text-night transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {submit.isPending ? 'Scoring…' : 'Submit'}
          </button>
        </div>
      </div>
    </PlayerShell>
  );
}

function Celebration({
  response,
  onReplay,
  onExit,
}: {
  response: SubmitResponse;
  onReplay: () => void;
  onExit: () => void;
}) {
  const p = response.proficiency;
  return (
    <div className="flex h-full flex-col items-center justify-center text-center">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 18 }}
        className="mb-2 flex gap-1 text-4xl"
        aria-label={`Proficiency ${p} of 3`}
      >
        {[1, 2, 3].map((s) => (
          <span key={s} className={s <= p ? 'text-accent' : 'text-white/15'}>
            ★
          </span>
        ))}
      </motion.div>
      <h3 className="font-display text-2xl text-white">
        {response.passed ? 'Passed!' : 'Not yet — keep going'}
      </h3>
      <p className="mt-1 text-sm text-white/60">Proficiency level {p} of 3</p>
      {response.feedback && (
        <p className="mt-3 max-w-sm text-sm text-white/75">{response.feedback}</p>
      )}
      {response.graded === 'fallback' && (
        <p className="mt-2 text-xs text-white/40">Scored offline — your result is saved.</p>
      )}
      {response.badgesAwarded.length > 0 && (
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {response.badgesAwarded.map((b) => (
            <span
              key={b.id}
              className="rounded-full border border-accent/40 bg-accent/15 px-3 py-1 text-xs text-accent"
            >
              🏅 {b.name ?? b.id}
            </span>
          ))}
        </div>
      )}
      <div className="mt-7 flex gap-3">
        <button
          type="button"
          onClick={onReplay}
          className="rounded-lg border border-white/15 px-4 py-2 text-sm text-white/85 hover:bg-white/5"
        >
          Play again
        </button>
        <button
          type="button"
          onClick={onExit}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-night hover:brightness-105"
        >
          Back to venue
        </button>
      </div>
    </div>
  );
}
