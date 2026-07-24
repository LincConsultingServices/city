import { useQuery } from "@tanstack/react-query";
import { api, ApiError } from "@/framework/api";
import type { EarnedBadge, CompetencyProfile } from "@/framework/api/schemas";

// Trophy Hall (PRD §9.4) — the first F2 surface that needs NO new backend work:
// GET /api/v1/badges and GET /api/v1/profile are both live. Earned badges stand
// as trophies; an empty shelf shows silhouettes and points at where to earn them.
// The board below shows per-competency P-levels.
export function TrophyHall({ onClose }: { onClose: () => void }) {
  const badgesQ = useQuery({
    queryKey: ["badges"],
    queryFn: () => api.getBadges(),
    staleTime: 60_000,
  });
  const profileQ = useQuery({
    queryKey: ["profile"],
    queryFn: () => api.getProfile(),
    staleTime: 60_000,
  });

  const badges = badgesQ.data?.badges ?? [];
  const competencies = profileQ.data?.competencies ?? [];

  return (
    <div
      className="absolute inset-0 z-20 grid place-items-center bg-ink/75 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-line bg-surface p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-display text-3xl font-semibold text-gold">Trophy Hall</h2>
            <p className="mt-1 text-xs text-muted">
              {badges.length > 0
                ? `${badges.length} badge${badges.length === 1 ? "" : "s"} earned`
                : "Your shelves are waiting"}
            </p>
          </div>
          <button onClick={onClose} className="text-muted hover:text-text" aria-label="Leave">
            ✕
          </button>
        </div>

        {/* ── Shelves ─────────────────────────────────────────────────────── */}
        <section className="mt-5">
          {badgesQ.isLoading && <p className="text-sm text-muted">Opening the cabinet…</p>}
          {badgesQ.isError && (
            <p className="text-sm text-danger">
              {badgesQ.error instanceof ApiError
                ? badgesQ.error.message
                : "Couldn't load your badges."}
            </p>
          )}
          {badgesQ.isSuccess &&
            (badges.length > 0 ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {badges.map((b) => (
                  <Trophy key={b.id} badge={b} />
                ))}
              </div>
            ) : (
              <EmptyShelf />
            ))}
          <div className="mt-3 h-1 rounded-full bg-gradient-to-r from-transparent via-line to-transparent" />
        </section>

        {/* ── Progress board ──────────────────────────────────────────────── */}
        <section className="mt-6">
          <h3 className="font-display text-lg font-semibold text-text">Progress board</h3>
          <p className="text-xs text-muted">Where you stand in each competency.</p>
          <div className="mt-3 space-y-1.5">
            {profileQ.isLoading && <p className="text-sm text-muted">Reading the board…</p>}
            {profileQ.isError && (
              <p className="text-sm text-danger">
                {profileQ.error instanceof ApiError
                  ? profileQ.error.message
                  : "Couldn't load progress."}
              </p>
            )}
            {competencies.map((c) => (
              <ProgressRow key={c.code} c={c} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

const TIER_STYLE: Record<string, string> = {
  GOLD: "border-gold/70 bg-gold/10 text-gold",
  SILVER: "border-muted/60 bg-muted/10 text-text",
  BRONZE: "border-[#b06a2c]/70 bg-[#b06a2c]/10 text-[#d08a4c]",
  META: "border-accent/70 bg-accent/10 text-accent",
};

function Trophy({ badge }: { badge: EarnedBadge }) {
  const tier = (badge.tier ?? "").toUpperCase();
  const style = TIER_STYLE[tier] ?? "border-line bg-surface-2 text-text";
  const awarded = badge.awardedAt ? new Date(badge.awardedAt) : null;
  return (
    <div className={"rounded-xl border p-3 text-center " + style} title={badge.description ?? ""}>
      <div className="text-2xl" aria-hidden="true">
        {tier === "META" ? "🏆" : "🏅"}
      </div>
      <p className="mt-1 text-sm font-semibold leading-tight">{badge.name}</p>
      <p className="mt-0.5 text-[11px] opacity-70">
        {[badge.competencyCode, badge.level].filter(Boolean).join(" · ") || tier || "Badge"}
      </p>
      {awarded && !isNaN(awarded.getTime()) && (
        <p className="mt-1 text-[10px] opacity-60">{awarded.toLocaleDateString()}</p>
      )}
    </div>
  );
}

function EmptyShelf() {
  return (
    <div>
      <div className="grid grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="grid h-24 place-items-center rounded-xl border border-dashed border-line bg-surface-2/50"
          >
            <span className="text-2xl opacity-20" aria-hidden="true">
              🏅
            </span>
          </div>
        ))}
      </div>
      <p className="mt-3 text-center text-sm text-muted">
        No badges yet. Complete a level at any venue — the Ice Cream Cart is a good first stop.
      </p>
    </div>
  );
}

function ProgressRow({ c }: { c: CompetencyProfile }) {
  const pct = c.totalSeeded > 0 ? Math.round((c.completed / c.totalSeeded) * 100) : 0;
  return (
    <div className="flex items-center gap-3 rounded-lg border border-line bg-surface-2 px-3 py-2">
      <span className="w-8 shrink-0 font-mono text-xs text-muted">{c.code}</span>
      <span className="min-w-0 flex-1 truncate text-sm text-text">{c.name}</span>
      <div className="h-1.5 w-24 shrink-0 overflow-hidden rounded-full bg-line/60">
        <div className="h-full rounded-full bg-gold" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-14 shrink-0 text-right text-xs tabular-nums text-muted">
        {c.completed}/{c.totalSeeded}
      </span>
      <span
        className={
          "w-8 shrink-0 rounded px-1 py-0.5 text-center text-[11px] font-semibold " +
          (c.category ? "bg-gold/15 text-gold" : "bg-line/40 text-muted")
        }
      >
        {c.category || "—"}
      </span>
    </div>
  );
}
