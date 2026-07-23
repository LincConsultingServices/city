import { useQuery } from "@tanstack/react-query";
import { api, ApiError } from "@/framework/api";
import type { LevelActivity } from "@/framework/api/schemas";
import type { CityBuilding } from "@/world/cityMap";

// Framework activity-list (PRD §7.2): hostedActivities × live per-activity status
// from the registry/progress APIs. This binds to the LIVE backend (GET
// /registry/{comp}/{level}).
export function ActivityListPanel({
  venue,
  onPlay,
  onClose,
}: {
  venue: CityBuilding;
  onPlay: (activity: LevelActivity) => void;
  onClose: () => void;
}) {
  const comp = venue.competency ?? "";
  const level = venue.level ?? "BEGINNER";
  const q = useQuery({
    queryKey: ["level", comp, level],
    queryFn: () => api.getLevel(comp, level),
    enabled: comp !== "",
    staleTime: 60_000,
  });

  // A venue with explicit hostedActivities filters to them; otherwise the whole
  // competency level is offered.
  const hosted = new Set(venue.hostedActivities);
  const all = q.data?.activities ?? [];
  const activities = venue.hostedActivities.length > 0 ? all.filter((a) => hosted.has(a.id)) : all;

  return (
    <div
      className="absolute inset-0 z-20 grid place-items-center bg-ink/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-line bg-surface p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl font-semibold text-gold">{venue.displayName}</h2>
          <button onClick={onClose} className="text-muted hover:text-text" aria-label="Leave">
            ✕
          </button>
        </div>
        <p className="mt-1 text-xs text-muted">Choose an activity</p>

        <div className="mt-5 space-y-2">
          {q.isLoading && <p className="text-sm text-muted">Loading activities…</p>}
          {q.isError && (
            <p className="text-sm text-danger">
              {q.error instanceof ApiError ? q.error.message : "Couldn't load activities."}
            </p>
          )}
          {q.isSuccess && activities.length === 0 && (
            <p className="text-sm text-muted">
              No hosted activities resolved from the registry yet (seeding — PRD §21 BE-12).
            </p>
          )}
          {activities.map((a) => (
            <div
              key={a.id}
              className="flex items-center gap-3 rounded-xl border border-line bg-surface-2 px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-text">{a.title}</p>
                <p className="text-xs text-muted">
                  {a.activityType} · {a.id}
                </p>
              </div>
              <StatusChip status={a.status} best={a.bestProficiency ?? null} />
              <button
                onClick={() => onPlay(a)}
                className="rounded-lg bg-gold px-4 py-1.5 text-sm font-medium text-ink hover:brightness-110"
              >
                Play
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatusChip({ status, best }: { status: string; best: number | null }) {
  if (status === "COMPLETED")
    return (
      <span className="rounded-full bg-success/15 px-2 py-0.5 text-xs text-success">
        {best ? `★ ${best}/3` : "done"}
      </span>
    );
  if (status === "IN_PROGRESS")
    return (
      <span className="rounded-full bg-accent/15 px-2 py-0.5 text-xs text-accent">resume</span>
    );
  return <span className="rounded-full bg-line/40 px-2 py-0.5 text-xs text-muted">new</span>;
}
