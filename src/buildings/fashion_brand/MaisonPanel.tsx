// MAISON — the season board, in OVERLAY MODE.
//
// This is no longer the venue's main surface: MAISON registers an interior, so
// walking in gets you the room (§3) and the beats arrive at their stations (§8).
// The framework still renders this whenever a scenario venue has no interior to
// open — `enabled: false`, a failed lazy load, or a future scenario building
// that ships without a room — so it stays the honest fallback rather than dead
// code, and it keeps saying in words everything the room says in geometry.
//
// SILENT TIER (§11): no tier, star, proficiency or pass/fail appears on this
// board. A decided beat says "decided", not how well. The tier vocabulary lives
// in the lookbook and nowhere else in this building.
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/framework/api";
import type { LevelActivity } from "@/framework/api/schemas";
import { devWorldBypass } from "@/framework/config/appConfig";
import { Modal, ModalClose } from "@/ui/Modal";
import type { CityBuilding } from "@/world/cityMap";
import { Lookbook } from "./Lookbook";
import { useMaisonStore } from "./maisonStore";
import {
  BEATS,
  MAISON_LEVELS,
  STATION_NAME,
  TRACK_FRAMING,
  TRACK_LEVEL,
  type Track,
} from "./season";
import { describeAtelier, describeCash, describePress, describeRail, railContents } from "./world";

/**
 * Eighteen level lists, because a scenario spans nine competencies × two tracks.
 * One missing row must not blank the season — an unseeded beat simply is not
 * open yet (§0.4) — so failures are dropped rather than thrown.
 */
async function fetchSeasonActivities(): Promise<Map<string, LevelActivity>> {
  const byId = new Map<string, LevelActivity>();

  // Dev-world only: seed the beats the live registry does not have yet (§0.4),
  // FIRST, so any real row overwrites the placeholder rather than the reverse.
  // Dynamically imported so a production build never pulls the chunk in.
  if (devWorldBypass) {
    const { MAISON_DEV_ACTIVITIES } = await import("./devFixture");
    for (const a of MAISON_DEV_ACTIVITIES) byId.set(a.id, a);
  }

  const settled = await Promise.allSettled(
    MAISON_LEVELS.map((l) => api.getLevel(l.competency, l.level)),
  );
  for (const outcome of settled) {
    if (outcome.status !== "fulfilled") continue;
    for (const a of outcome.value.activities) byId.set(a.id, a);
  }
  return byId;
}

export function MaisonPanel({
  venue,
  onPlay,
  onClose,
}: {
  venue: CityBuilding;
  onPlay: (activity: LevelActivity) => void;
  onClose: () => void;
}) {
  // A decided beat moves the house — see attachMaisonWorldSync() in the store,
  // which listens at module scope because this panel is unmounted while the
  // activity player is open, which is exactly when the submit happens.
  const track = useMaisonStore((s) => s.track);

  return (
    <Modal onClose={onClose} width="lg" labelledBy="maison-title">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted">Market Street</p>
          <h2 id="maison-title" className="font-display text-3xl font-semibold text-gold">
            {venue.displayName}
          </h2>
        </div>
        <ModalClose onClose={onClose} label="Leave" />
      </div>

      {track === null ? <Threshold /> : <Season track={track} onPlay={onPlay} />}
    </Modal>
  );
}

/**
 * The threshold question (§14) — asked once, on the way in. It picks the track
 * for the whole season, and it is a framing choice rather than a difficulty
 * setting, so neither answer is presented as the harder or the better one.
 */
function Threshold() {
  const chooseTrack = useMaisonStore((s) => s.chooseTrack);
  return (
    <>
      <p className="mt-4 text-sm leading-relaxed text-text">
        The door is heavy and it does not have a bell. Four metres of polished floor, a single rail
        under one hard light, and a staircase at the back where you can see the atelier working.
      </p>
      <p className="mt-4 text-sm leading-relaxed text-muted">
        Élise looks up from her bench, holds it a beat longer than is comfortable, and asks the
        question she asks everyone once.
      </p>
      <p className="mt-3 font-display text-lg text-gold">
        “Is MAISON the label you&apos;re starting, or the one you&apos;re taking over?”
      </p>
      <div className="mt-5 space-y-2">
        {(["A", "B"] as Track[]).map((t) => (
          <button
            key={t}
            onClick={() => chooseTrack(t)}
            className="w-full rounded-xl border border-line bg-surface-2 px-4 py-3 text-left text-sm leading-relaxed text-text transition hover:border-gold/50 hover:brightness-110"
          >
            {TRACK_FRAMING[t]}
          </button>
        ))}
      </div>
    </>
  );
}

function Season({ track, onPlay }: { track: Track; onPlay: (a: LevelActivity) => void }) {
  const world = useMaisonStore((s) => s.world);
  const decided = useMaisonStore((s) => s.decided);
  const resetSeason = useMaisonStore((s) => s.resetSeason);
  const [lookbookOpen, setLookbookOpen] = useState(false);

  const q = useQuery({
    queryKey: ["maison-season"],
    queryFn: fetchSeasonActivities,
    staleTime: 60_000,
  });

  const rail = useMemo(() => railContents(world), [world]);
  const level = TRACK_LEVEL[track];
  const decidedIds = useMemo(() => new Set(decided.map((d) => d.id)), [decided]);
  // §13 unlock: every beat on this track decided. The lookbook has been on the
  // desk all along; this is the season that makes it worth opening.
  const seasonOver = BEATS.every((b) => decidedIds.has(b[track].id));

  if (lookbookOpen) {
    return <Lookbook track={track} activities={q.data} onClose={() => setLookbookOpen(false)} />;
  }

  return (
    <>
      {/* The rail: the building's primary readout, and the only one that matters. */}
      <div className="mt-5 rounded-xl border border-gold/25 bg-surface-2 p-4">
        <p className="text-xs uppercase tracking-[0.18em] text-muted">The rail</p>
        <p className="mt-2 text-sm leading-relaxed text-text" role="status" aria-live="polite">
          {describeRail(world)}
        </p>
        <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="What is on the rail">
          {rail.map((piece, i) => (
            <li
              key={i}
              className="rounded-md border border-line px-2 py-0.5 text-xs text-muted"
              title={`${piece.label} · ${piece.price} · ${piece.neck}`}
            >
              {piece.label} · {piece.price}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs leading-relaxed text-muted">
          {describeAtelier(world)} {describeCash(world)} {describePress(world)}
        </p>
      </div>

      <p className="mt-5 text-xs uppercase tracking-[0.18em] text-muted">
        The season · {decided.length} of {BEATS.length} decided
      </p>

      <ol className="mt-3 space-y-2">
        {BEATS.map((beat) => {
          const id = beat[track].id;
          const activity = q.data?.get(id);
          const isDecided = decidedIds.has(id);
          return (
            <li
              key={beat.competency}
              className="flex items-center gap-3 rounded-xl border border-line bg-surface-2 px-4 py-3"
            >
              <span className="w-20 shrink-0 text-xs tabular-nums text-muted">
                {beat.countdown}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-text">{beat[track].title}</p>
                <p className="truncate text-xs text-muted">
                  {STATION_NAME[beat.station] ?? beat.station} · {beat.host} · {beat.competencyName}
                </p>
              </div>
              {isDecided && <span className="shrink-0 text-xs text-muted">decided</span>}
              {activity ? (
                <button
                  onClick={() => onPlay(activity)}
                  className="shrink-0 rounded-lg bg-gold px-4 py-1.5 text-sm font-medium text-ink hover:brightness-110"
                >
                  {isDecided ? "Again" : "Open"}
                </button>
              ) : (
                <span className="shrink-0 rounded-lg border border-line px-3 py-1.5 text-xs text-muted">
                  {q.isLoading ? "…" : "not yet"}
                </span>
              )}
            </li>
          );
        })}
      </ol>

      {seasonOver && (
        <button
          onClick={() => setLookbookOpen(true)}
          className="mt-4 w-full rounded-xl border border-gold/40 bg-surface-2 px-4 py-3 text-left transition hover:brightness-110"
        >
          <span className="block font-display text-lg text-gold">The lookbook is printed</span>
          <span className="block text-xs text-muted">
            It has been on the desk all season. Open it.
          </span>
        </button>
      )}

      <div className="mt-5 flex items-center justify-between border-t border-line pt-3">
        <p className="text-xs text-muted">
          {level} · {TRACK_FRAMING[track]}
        </p>
        <button
          onClick={resetSeason}
          className="shrink-0 rounded-lg border border-line px-3 py-1.5 text-xs text-muted transition hover:text-text"
        >
          Start the collection over
        </button>
      </div>
    </>
  );
}
