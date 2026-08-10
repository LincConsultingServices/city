// The mission tracker — top-centre, and nothing but where you are in the season.
//
// This is the most tempting surface in the building to put a score on, so what
// it may show is written down rather than left to taste (PRD §11.1):
//
//   * one objective at a time, in the room's own words;
//   * an ordinal, which is pacing information and not quality;
//   * the mission's own title, which is the same register as the ordinal — it
//     says which week you are in the middle of, not how it is going. Without it
//     the player knows the next micro-step and never the errand it belongs to;
//   * three pips, **identical to each other**, because a pip that looked
//     different for the transfer beat would tell the player which of the three
//     questions a model wrote.
//
// And what it may never show: a tick, a strike-through, a "3/9 complete", a
// proficiency, or any mark that distinguishes a good week from a bad one.
// Completed missions simply disappear.
//
// It sits centre-top rather than in the left-hand corner, where it used to
// compete with the venue name directly above it and got read as chrome.
//
// And it is not up when you walk in. Interior mounts it only once the player has
// worked something in the room (`missionWoken` in cafeStore), so arriving is
// arriving: you get the room, the light and whoever is in, and the week lands
// the moment you touch the first thing. Nothing about the season waits on this —
// objectives advance either way — so a player who crosses to the counter before
// being told to has simply got there first.
//
// Real focusable DOM with a polite live region, firing on objective change only
// and never per frame — a player who cannot see it still knows the line moved.
// The title is deliberately not announced: it changes strictly less often than
// the line, and reading both would double-speak every mission boundary.
import { useEffect, useRef, useState } from "react";
import { beatsBehind, trackerLine, trackerOrdinal, trackerTitle } from "./missionRunner";
import { useCafeStore } from "./cafeStore";

const BEATS = 3;

export function Tracker() {
  const progress = useCafeStore((s) => s.progress);
  const line = trackerLine(progress);
  const ordinal = trackerOrdinal(progress);
  const title = trackerTitle(progress);
  const done = beatsBehind(progress);

  // Announce the line only when it actually changes. The store updates on every
  // step of the chain and most of those leave the tracker saying the same thing.
  const [spoken, setSpoken] = useState("");
  const last = useRef<string | null>(null);
  useEffect(() => {
    if (line && line !== last.current) {
      last.current = line;
      setSpoken(line);
    }
  }, [line]);

  if (!line) return null;

  return (
    // Two elements, because the centring and the entrance are both transforms
    // and the animation would otherwise stamp on the -50% while it played. The
    // outer one places, the inner one arrives.
    //
    // `max-sm:top-20` drops it below the corner blocks on a narrow viewport,
    // where a centred 26rem panel would otherwise sit on top of the venue name
    // and the exit button.
    <div className="pointer-events-none absolute left-1/2 top-5 z-10 w-[min(26rem,90vw)] -translate-x-1/2 max-sm:top-20">
      <section
        aria-label="What you are doing"
        className="pointer-events-auto animate-slide-down rounded-xl border border-line/70 bg-surface/85 px-4 py-3 text-center backdrop-blur"
      >
        <p className="text-[10px] uppercase tracking-widest text-muted">{ordinal}</p>
        {title && <p className="mt-0.5 font-display text-base font-semibold text-gold">{title}</p>}
        <p className="mt-1 text-sm leading-snug text-text">{line}</p>

        {/* Three pips, one per beat. Same colour, same shape, same size — the
            only thing that changes is how many are filled. */}
        <div className="mt-2.5 flex justify-center gap-1.5" aria-hidden="true">
          {Array.from({ length: BEATS }, (_, i) => (
            <span
              key={i}
              className={`h-1.5 w-1.5 rounded-full transition-colors ${
                i < done ? "bg-gold" : "bg-line"
              }`}
            />
          ))}
        </div>

        <p aria-live="polite" className="sr-only">
          {spoken}
        </p>
      </section>
    </div>
  );
}
