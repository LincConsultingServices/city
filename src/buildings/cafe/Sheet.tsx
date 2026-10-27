// The room's own dialog shape — shared by every screen that is the room
// talking to you: a conversation, a decision, a typed question, a gate.
//
// Laid out like a visual novel: whoever is speaking stands behind a wide box
// at the foot of the screen, large, with their name on a tag at the box's
// corner, and what they say types itself out. The room stays visible above —
// these are people talking to you in it, not a page laid over it — and none of
// them offer a way to dismiss without answering.
//
// One component for every screen of this kind. QA, Gate and the decision sheet
// each used to carry their own copy of this markup and drifted apart (one with
// no height limit, one with no focus ring); a fix made here reaches all of them.
import { useEffect, useState, type ReactNode } from "react";
import { Portrait, type PortraitLook } from "@/ui/Portrait";
import { PLAYER_OUTFITS, playerOutfitFor, type CharacterLook } from "@/ui/characters";
import { useJourneyStore } from "./journeyStore";
import { prefersReducedMotion } from "@/lib/motion";

/** Who is talking: shown as the portrait behind the box and the tag on it. */
export interface Speaker {
  /** Their character id, so painted art in assets/characters replaces the drawing. */
  id?: string;
  name: string;
  role?: string;
  look: PortraitLook;
}

/** Characters per second for the typed line. Quick enough not to drag. */
const TYPE_CPS = 55;

/**
 * The bounded box. `head` is pinned while the rest scrolls, so the question
 * you are answering stays on screen while you read past the bottom of a long
 * option or a long piece of feedback.
 *
 * `line` is what the speaker says, and it types itself out; a click on the box
 * finishes it at once. The answers (`children`) come in when the line is done,
 * the way a visual novel shows its choices once the line has been read.
 *
 * `label` is what the dialog announces itself as, and every caller must pass
 * its own: the box being identical is the point, the screens being
 * indistinguishable to a screen reader would be a bug.
 */
export function Sheet({
  label,
  speaker = null,
  line,
  head,
  children,
}: {
  label: string;
  speaker?: Speaker | null;
  line?: string;
  head?: ReactNode;
  children: ReactNode;
}) {
  const shown = useTyped(line ?? "");
  const you = usePlayerLook();
  const typing = line !== undefined && shown.length < line.length;
  const finish = () => {
    if (typing) shown.finish();
  };

  return (
    <div className="pointer-events-none absolute inset-0 z-30 flex flex-col justify-end">
      {/* A soft darkening at the foot of the screen, so the box and the portrait
          read against any part of the room. */}
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-[62%] bg-gradient-to-t from-ink/85 via-ink/45 to-transparent"
      />

      <div className="relative mx-auto flex w-[min(62rem,100%)] flex-col px-4 pb-5">
        {/* The two of you, face to face over the box: whoever is speaking on the
            left, you on the right, turned toward them. Whoever has the floor is
            lit — them while their line types, you once it is your turn to answer. */}
        {speaker && (
          <div className="pointer-events-none relative z-0 -mb-10 flex items-end justify-between px-2 sm:px-8">
            <Portrait
              look={speaker.look}
              artId={speaker.id}
              className={`animate-slide-up h-[min(46vh,22rem)] w-auto drop-shadow-[0_18px_30px_rgb(0_0_0/0.55)] transition-[filter,transform] duration-300 ${
                typing ? "" : "brightness-[0.6] saturate-[0.8]"
              }`}
            />
            <Portrait
              look={you.look}
              artId={you.artId}
              className={`animate-slide-up hidden h-[min(42vh,20rem)] w-auto -scale-x-100 drop-shadow-[0_18px_30px_rgb(0_0_0/0.55)] transition-[filter] duration-300 sm:block ${
                typing ? "brightness-[0.6] saturate-[0.8]" : ""
              }`}
            />
          </div>
        )}

        <div
          role="dialog"
          aria-label={label}
          onClick={finish}
          className="animate-slide-up pointer-events-auto relative z-10 flex max-h-[min(56vh,30rem)] flex-col rounded-2xl border-2 border-[#d9c9a3]/60 bg-[#151a24]/95 shadow-[0_28px_60px_-24px_rgb(0_0_0/0.9)] ring-1 ring-inset ring-white/[0.06] backdrop-blur-md"
        >
          {speaker && (
            <div className="absolute -top-4 left-6 z-10 flex items-baseline gap-2 rounded-lg border-2 border-[#d9c9a3]/70 bg-gold px-4 py-1 shadow-lg">
              <span className="font-display text-base font-semibold text-ink">{speaker.name}</span>
              {speaker.role && <span className="text-[11px] text-ink/70">{speaker.role}</span>}
            </div>
          )}
          {speaker && !typing && (
            <div className="absolute -top-4 right-6 z-10 hidden rounded-lg border-2 border-[#d9c9a3]/70 bg-surface-2 px-4 py-1 shadow-lg sm:block">
              <span className="font-display text-base font-semibold text-gold">You</span>
            </div>
          )}

          <div className={`shrink-0 px-6 ${speaker ? "pt-7" : "pt-6"} pb-3`}>
            {head}
            {line !== undefined && (
              <p className="mt-1 min-h-[3rem] text-base leading-relaxed text-text">
                {/* The whole line for assistive tech at once; the typing is visual. */}
                <span className="sr-only">{line}</span>
                <span aria-hidden>
                  {shown.text}
                  {typing && (
                    <span className="ml-0.5 inline-block w-2 animate-pulse text-gold">▍</span>
                  )}
                </span>
              </p>
            )}
          </div>

          <div
            className={`min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pb-5 pt-1 transition-opacity duration-300 ${
              typing ? "pointer-events-none opacity-0" : "opacity-100"
            }`}
          >
            {children}
          </div>

          {typing && (
            <p
              aria-hidden
              className="pointer-events-none absolute bottom-2 right-4 text-[11px] text-muted"
            >
              click to skip
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * The player as they look in this room right now: dressed for their role, and
 * their painted art when there is some (`player.png`, `player_uniform.png`,
 * `player_professional.png`).
 */
function usePlayerLook(): { look: CharacterLook; artId: string } {
  const outfit = playerOutfitFor(useJourneyStore((s) => s.role));
  const artId = outfit === "casual" ? "player" : `player_${outfit}`;
  return { look: PLAYER_OUTFITS[outfit].look, artId };
}

/**
 * A line revealed a few characters at a time. Restarts when the line changes;
 * `finish()` shows it all now. Instant under reduced motion.
 */
function useTyped(text: string): { text: string; length: number; finish: () => void } {
  const [count, setCount] = useState(() => (prefersReducedMotion() ? text.length : 0));

  useEffect(() => {
    if (prefersReducedMotion()) {
      setCount(text.length);
      return;
    }
    setCount(0);
    const started = performance.now();
    const t = window.setInterval(() => {
      const n = Math.floor(((performance.now() - started) / 1000) * TYPE_CPS);
      setCount(Math.min(n, text.length));
      if (n >= text.length) window.clearInterval(t);
    }, 30);
    return () => window.clearInterval(t);
  }, [text]);

  const shown = text.slice(0, count);
  return { text: shown, length: shown.length, finish: () => setCount(text.length) };
}

/**
 * One thing you can choose, or one road out. `primary` is the one visual
 * difference, for the road a gate wants to read as the suggested one.
 *
 * The rail on the left lights on hover, on keyboard focus, and — for a
 * primary road — always, and `active:scale` gives the tap itself something to
 * feel on a touch screen, where hover never fires at all.
 */
export function ChoiceButton({
  onClick,
  children,
  primary = false,
}: {
  onClick: () => void;
  children: ReactNode;
  primary?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        "group relative w-full overflow-hidden rounded-xl border py-3 pl-5 pr-4 text-left text-sm leading-relaxed text-text transition-colors duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/40 active:scale-[0.99]",
        primary
          ? "border-gold/60 bg-gold/10 hover:bg-gold/20 focus-visible:border-gold/70"
          : "border-line/70 bg-surface-2/50 hover:border-gold/50 hover:bg-surface-2 focus-visible:border-gold/60",
      ].join(" ")}
    >
      <span
        aria-hidden
        className={[
          "absolute inset-y-0 left-0 w-[3px] transition-colors duration-200",
          primary
            ? "bg-gold/70"
            : "bg-transparent group-hover:bg-gold/70 group-focus-visible:bg-gold/70",
        ].join(" ")}
      />
      {children}
    </button>
  );
}
