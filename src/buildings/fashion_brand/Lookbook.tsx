// MAISON — the end-of-journey report (docs/maison.md §13). The season's lookbook,
// on the desk where it has been all along, now printed.
//
// This is the ONE place in this building where tier vocabulary is allowed to
// appear (§11, §13.3) — and only where the server has actually said something.
// The client holds no rubric, so if the backend has no proficiency for a beat,
// the lookbook says the beat was decided and stops. It never fills the gap in.
//
// Tone: a lookbook is a document a house makes about itself. No grades, no
// percentiles, no praise — a record of a season and what it revealed, written by
// someone who was in the building.
import { useMemo } from "react";
import type { LevelActivity } from "@/framework/api/schemas";
import { useAuth } from "@/framework/auth/AuthProvider";
import { choicesAlong, type DecisionTreeContent } from "@/lib/decisionTree";
import { Modal, ModalClose } from "@/ui/Modal";
import { whereNext } from "./whereNext";
import { maisonContent } from "./content";
import { useMaisonStore } from "./maisonStore";
import { BEATS, TRACK_FRAMING, type Track } from "./season";
import { describePress, describeRail, railContents } from "./world";

export function Lookbook({
  track,
  activities,
  onClose,
}: {
  track: Track;
  /** Registry rows, for the one thing only the server can say: the tier. */
  activities: Map<string, LevelActivity> | undefined;
  onClose: () => void;
}) {
  const opening = useMaisonStore((s) => s.opening);
  const world = useMaisonStore((s) => s.world);
  const decided = useMaisonStore((s) => s.decided);

  const byId = useMemo(() => new Map(decided.map((d) => [d.id, d])), [decided]);
  const rail = railContents(world);
  const next = useMemo(() => whereNext(track, activities), [track, activities]);
  const { user } = useAuth();
  // §13.6 — the cover plate. The one place in the city a player sees the
  // character they built presented as a person rather than a sprite. The full
  // cosmetic composition is master PRD §14.3 and does not exist yet, so this is
  // the same chip the HUD carries, framed as a designer's headshot.
  const designer = user?.displayName || user?.email?.split("@")[0] || "the designer";
  const initial = designer.charAt(0).toUpperCase();

  return (
    <Modal onClose={onClose} width="lg" labelledBy="lookbook-title">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span
            className="grid h-12 w-12 shrink-0 place-items-center rounded-lg border border-gold/40 bg-surface-2 font-display text-xl text-gold"
            aria-hidden="true"
          >
            {initial}
          </span>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted">{designer}</p>
            <h2 id="lookbook-title" className="font-display text-3xl font-semibold text-gold">
              The Lookbook
            </h2>
          </div>
        </div>
        <ModalClose onClose={onClose} label="Close the lookbook" />
      </div>

      {/* 1 — the collection, and the version you started with. The diff is the season. */}
      <section className="mt-5 rounded-xl border border-gold/25 bg-surface-2 p-4">
        <h3 className="text-xs uppercase tracking-[0.18em] text-muted">The collection</h3>
        <p className="mt-2 text-sm leading-relaxed text-text">{describeRail(world)}</p>
        <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="The collection as it finished">
          {rail.map((piece, i) => (
            <li key={i} className="rounded-md border border-line px-2 py-0.5 text-xs text-muted">
              {piece.label} · {piece.price} · {piece.neck}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs leading-relaxed text-muted">
          You started with: {describeRail(opening)}
        </p>
      </section>

      {/* 2 — the press file. Coverage, never quality. */}
      <section className="mt-4">
        <h3 className="text-xs uppercase tracking-[0.18em] text-muted">The press file</h3>
        <p className="mt-2 text-sm leading-relaxed text-text">{describePress(world)}</p>
      </section>

      {/* 3 + 4 — the record and the consequence trail, one row per beat. */}
      <section className="mt-5">
        <h3 className="text-xs uppercase tracking-[0.18em] text-muted">The season, decided</h3>
        <ol className="mt-3 space-y-3">
          {BEATS.map((beat) => {
            const id = beat[track].id;
            const decision = byId.get(id);
            const content = maisonContent[id] as DecisionTreeContent | undefined;
            const taken = decision && content ? choicesAlong(content, decision.path) : [];
            const best = activities?.get(id)?.bestProficiency ?? null;
            return (
              <li key={beat.competency} className="border-l-2 border-line pl-4">
                <p className="text-xs text-muted">
                  {beat.countdown} · {beat.competencyName}
                  {typeof best === "number" && ` · the server recorded ${best} of 3`}
                </p>
                <p className="text-sm text-text">{beat[track].title}</p>
                {taken.length === 0 ? (
                  <p className="mt-1 text-sm text-muted">Not decided this season.</p>
                ) : (
                  <>
                    <p className="mt-1 text-sm leading-relaxed text-muted">
                      What you chose: {taken.map((c) => c.text).join(" Then: ")}
                    </p>
                    {taken[taken.length - 1]?.consequence && (
                      <p className="mt-1 text-sm leading-relaxed text-text">
                        {taken[taken.length - 1].consequence}
                      </p>
                    )}
                  </>
                )}
              </li>
            );
          })}
        </ol>
      </section>

      {/* 5 — consistency: the seed/follow-up shape made legible. */}
      <section className="mt-5 rounded-xl border border-line bg-surface-2 p-4">
        <h3 className="text-xs uppercase tracking-[0.18em] text-muted">The shape of it</h3>
        <p className="mt-2 text-sm leading-relaxed text-text">{consistencyLine(decided.length)}</p>
        <p className="mt-2 text-xs text-muted">{TRACK_FRAMING[track]}</p>
      </section>

      {/* 7 — where next. Only ever built from what the server actually said. */}
      {next.length > 0 && (
        <section className="mt-5">
          <h3 className="text-xs uppercase tracking-[0.18em] text-muted">Where next</h3>
          <ul className="mt-3 space-y-2">
            {next.map((s) => (
              <li key={s.competency} className="flex items-baseline gap-3 text-sm">
                <span className="text-text">{s.venueName}</span>
                <span className="text-xs text-muted">
                  presses on {s.competencyName.toLowerCase()}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="mt-5 text-xs leading-relaxed text-muted">
        A lookbook is a document a house makes about itself. This one is honest: it is a record of a
        season and what it revealed, and it is the only page in this building that repeats anything
        a score said.
      </p>
    </Modal>
  );
}

/**
 * §13.5 — the seed/follow-up shape, read back. It describes the season's SHAPE,
 * never its quality: how much of it you finished and whether you stayed with it,
 * which the client can see. Whether any of it was wise is the server's business
 * and, mostly, the player's.
 */
function consistencyLine(count: number): string {
  if (count >= BEATS.length) {
    return "You took every beat of the season and finished the collection you started. Whatever else the rail says, nothing on it happened without you.";
  }
  if (count >= BEATS.length - 2) {
    return "You decided almost all of it. The two the season made for you are on the rail alongside the ones you chose, and they do not look different from a distance.";
  }
  if (count >= 4) {
    return "You decided about half the season. The rest of the rail is what a house does when nobody is deciding, which is also a decision.";
  }
  return "Most of this season happened while you were somewhere else. The rail is a fair record of that.";
}
