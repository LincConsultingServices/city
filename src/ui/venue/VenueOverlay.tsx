// VenueOverlay (PRD §7.2) — the framework venue for an overlay-mode building.
// Lists the venue's hostedActivities with live status from the registry, and
// launches the ActivityPlayer. Esc/Leave returns to the same spot in the city.

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { getManifestById } from '@/framework/building';
import { api } from '@/framework/api/client';
import type { ActivitySummary } from '@/framework/api/schemas';
import { exitBuilding } from '@/framework/venue';
import { hasContent } from '@/activities/content';
import { ActivityPlayer } from '@/activities/ActivityPlayer';
import { Button } from '@/ui/design-system/Button';

const LEVEL_MAP: Record<string, string> = { BEG: 'BEGINNER', MED: 'MEDIUM', HARD: 'HARD' };
const TYPE_LABEL: Record<string, string> = {
  DRAG_MATCH: 'Sort',
  MCQ_FEEDBACK: 'Quiz',
  SORT_ORDER: 'Sequence',
  MINI_SIM: 'Simulation',
  BUDGET_SLIDER: 'Simulation',
};

function parseActivityId(id: string): { comp: string; level: string } | null {
  const m = /^([A-Z]\d+)-(BEG|MED|HARD)-\d+$/.exec(id);
  if (!m) return null;
  return { comp: m[1]!, level: LEVEL_MAP[m[2]!]! };
}

/** Fetch the needed (comp, level) lists once and return the hosted activities. */
async function fetchVenueActivities(hosted: string[]): Promise<ActivitySummary[]> {
  const pairs = new Map<string, { comp: string; level: string }>();
  for (const id of hosted) {
    const p = parseActivityId(id);
    if (p) pairs.set(`${p.comp}/${p.level}`, p);
  }
  const levels = await Promise.all([...pairs.values()].map((p) => api.getLevel(p.comp, p.level)));
  const byId = new Map<string, ActivitySummary>();
  for (const lvl of levels) for (const a of lvl.activities) byId.set(a.id, a);
  return hosted
    .map((id) => byId.get(id))
    .filter((a): a is ActivitySummary => Boolean(a))
    .sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
}

export function VenueOverlay({ buildingId }: { buildingId: string }) {
  const manifest = getManifestById(buildingId);
  const [selected, setSelected] = useState<ActivitySummary | null>(null);
  const selectedRef = useRef(selected);
  selectedRef.current = selected;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (selectedRef.current)
        setSelected(null); // back to list
      else exitBuilding();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const hosted = manifest?.hostedActivities ?? [];
  const query = useQuery({
    queryKey: ['venueActivities', buildingId, hosted.join(',')],
    queryFn: () => fetchVenueActivities(hosted),
    enabled: hosted.length > 0,
  });

  if (!manifest) return null;

  return (
    <motion.div
      className="absolute inset-0 z-30 flex items-center justify-center bg-black/55 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !selected) exitBuilding();
      }}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={manifest.displayName}
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.96, opacity: 0 }}
        transition={{ duration: 0.25 }}
        className="flex h-[min(88vh,640px)] w-[min(96vw,720px)] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#141826] text-white shadow-2xl"
      >
        {selected ? (
          <ActivityPlayer activity={selected} onExit={() => setSelected(null)} />
        ) : (
          <div className="flex h-full flex-col p-7">
            <p className="text-xs uppercase tracking-[0.2em] text-accent/80">{manifest.district}</p>
            <h2 className="font-display text-3xl">{manifest.displayName}</h2>
            <p className="mt-2 text-sm text-white/55">
              Pick an activity to play. Your score comes from the server.
            </p>

            <div className="mt-5 min-h-0 flex-1 space-y-2 overflow-auto pr-1">
              {query.isLoading && <p className="text-sm text-white/40">Loading activities…</p>}
              {query.isError && (
                <p className="text-sm text-red-300">Couldn&apos;t load activities. Try again.</p>
              )}
              {query.data?.map((a) => (
                <ActivityCard key={a.id} activity={a} onPlay={() => setSelected(a)} />
              ))}
              {query.data?.length === 0 && (
                <p className="text-sm text-white/40">No activities here yet.</p>
              )}
            </div>

            <div className="mt-5 flex justify-end">
              <Button variant="ghost" onClick={() => exitBuilding()}>
                Leave (Esc)
              </Button>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

function ActivityCard({ activity, onPlay }: { activity: ActivitySummary; onPlay: () => void }) {
  const playable = hasContent(activity.id);
  const status = activity.status ?? 'NOT_STARTED';
  const best = activity.bestProficiency;
  const chip =
    status === 'COMPLETED' && best
      ? `★ P${best}`
      : status === 'IN_PROGRESS'
        ? 'In progress'
        : 'New';

  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium text-white/90">
            {activity.title || activity.id}
          </span>
          <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] uppercase text-white/50">
            {TYPE_LABEL[activity.activityType] ?? activity.activityType}
          </span>
        </div>
        <span className="text-xs text-white/40">
          {activity.id} · {chip}
        </span>
      </div>
      {playable ? (
        <button
          type="button"
          onClick={onPlay}
          className="rounded-lg bg-accent px-4 py-1.5 text-sm font-semibold text-night hover:brightness-105"
        >
          Play
        </button>
      ) : (
        <span className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white/40">
          Coming soon
        </span>
      )}
    </div>
  );
}
