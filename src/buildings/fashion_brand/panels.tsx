// The room's readers — the DOM half of what you can look at in MAISON.
//
// Split out of Interior.tsx, which had grown to hold four components and three
// times the Café's shell. The shell's job is the full-bleed layer, the prompts,
// the live region and the keyboard; what a panel says belongs beside it, not
// inside it.
//
// Every one of these reports. Nothing here is lit, ordered or framed as better
// than anything else (§11) — the rail's collab piece is listed in the same type
// as the rest, and the mirror shows whatever the season made without comment.
import { Modal, ModalClose } from "@/ui/Modal";
import { audio } from "@/framework/audio/audioManager";
import { useMaisonStore } from "./maisonStore";
import { TRACK_FRAMING, type Track } from "./season";
import { veraQuestion } from "./vera";
import { describeRail, railContents } from "./world";

/**
 * The threshold question (§14) — asked by Élise on first entry, once for the
 * whole city. It picks the framing for the season, not a difficulty, so neither
 * answer is presented as the harder or the better one.
 */
export function Threshold() {
  const chooseTrack = useMaisonStore((s) => s.chooseTrack);
  return (
    <Modal onClose={() => {}} width="sm" labelledBy="threshold-title">
      <p className="text-xs uppercase tracking-[0.2em] text-muted">MAISON</p>
      <h2 id="threshold-title" className="font-display text-2xl font-semibold text-gold">
        Élise looks up from her bench
      </h2>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        She holds it a beat longer than is comfortable, then asks the question she asks everyone
        once.
      </p>
      <p className="mt-3 font-display text-lg text-gold">
        “Is MAISON the label you&apos;re starting, or the one you&apos;re taking over?”
      </p>
      <div className="mt-5 space-y-2">
        {(["A", "B"] as Track[]).map((t) => (
          <button
            key={t}
            onClick={() => {
              audio.play("ui_confirm");
              chooseTrack(t);
            }}
            className="w-full rounded-xl border border-line bg-surface-2 px-4 py-3 text-left text-sm leading-relaxed text-text transition hover:border-gold/50 hover:brightness-110"
          >
            {TRACK_FRAMING[t]}
          </button>
        ))}
      </div>
    </Modal>
  );
}

/**
 * The desk phone (§9.6). Free, unscored, available at every beat — she asks a
 * question and never gives an answer, and calling her costs nothing, because a
 * lifeline that costs something is a lifeline nobody uses.
 */
export function DeskPhone({
  competency,
  onClose,
}: {
  competency: string | null;
  onClose: () => void;
}) {
  return (
    <Modal onClose={onClose} width="sm" labelledBy="phone-title">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted">The desk phone</p>
          <h2 id="phone-title" className="font-display text-2xl font-semibold text-gold">
            Véra
          </h2>
        </div>
        <ModalClose onClose={onClose} label="Hang up" />
      </div>
      <p className="mt-4 text-sm leading-relaxed text-text">{veraQuestion(competency)}</p>
      <p className="mt-4 text-xs text-muted">
        She waits. Calling her is free, it is not scored, and she is not going to tell you what to
        do.
      </p>
      <button
        onClick={onClose}
        className="mt-5 rounded-lg bg-gold px-5 py-2 font-medium text-ink hover:brightness-110"
      >
        Put the phone down
      </button>
    </Modal>
  );
}

/**
 * Standing in the pool of light, looking at what you have made (§3.3). Every
 * piece, its price and what its neck says — the same season the brass is
 * showing, in words, because §18.2.4 makes that blocking.
 */
export function RailReader({ onClose }: { onClose: () => void }) {
  const world = useMaisonStore((s) => s.world);
  const pieces = railContents(world);
  return (
    <Modal onClose={onClose} width="sm" labelledBy="rail-title">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted">The collection</p>
          <h2 id="rail-title" className="font-display text-2xl font-semibold text-gold">
            On the rail
          </h2>
        </div>
        <ModalClose onClose={onClose} label="Step back" />
      </div>

      <p className="mt-3 text-sm leading-relaxed text-text">{describeRail(world)}</p>

      <ul className="mt-4 space-y-1.5">
        {pieces.map((piece, i) => (
          <li
            key={i}
            className="flex items-baseline justify-between gap-3 border-b border-line/60 pb-1.5 text-sm"
          >
            <span className="text-text">{piece.label}</span>
            <span className="text-xs text-muted">{piece.neck}</span>
            <span className="tabular-nums text-muted">{piece.price}</span>
          </li>
        ))}
      </ul>

      <p className="mt-4 text-xs text-muted">
        {pieces.length} {pieces.length === 1 ? "piece" : "pieces"} · {world.countdown} to the show
      </p>
    </Modal>
  );
}
