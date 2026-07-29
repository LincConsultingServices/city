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

/**
 * The fitting alcove (§3.4). One dress form, one full-length mirror, and
 * whatever the season actually made — the first piece off the rail, worn.
 *
 * The mirror is the one place in the building that shows you the collection on a
 * body instead of on brass, and it still only reports: it names the piece, its
 * price and what its neck says, and it does not tell you whether any of that was
 * the right call (§11). An empty rail gets an empty form, which is its own kind
 * of answer.
 */
export function Mirror({ onClose }: { onClose: () => void }) {
  const world = useMaisonStore((s) => s.world);
  const pieces = railContents(world);
  const hero = pieces[0];
  return (
    <Modal onClose={onClose} width="sm" labelledBy="mirror-title">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted">The fitting alcove</p>
          <h2 id="mirror-title" className="font-display text-2xl font-semibold text-gold">
            On the form
          </h2>
        </div>
        <ModalClose onClose={onClose} label="Step away" />
      </div>

      {hero ? (
        <>
          <p className="mt-4 text-sm leading-relaxed text-text">
            The form is wearing {hero.label.toLowerCase()}. In the mirror it is just cloth on a
            shoulder — the price tag is turned to the wall, and from here you can only see the
            shape.
          </p>
          <dl className="mt-4 space-y-1.5 text-sm">
            <div className="flex items-baseline justify-between gap-3 border-b border-line/60 pb-1.5">
              <dt className="text-muted">The piece</dt>
              <dd className="text-text">{hero.label}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-3 border-b border-line/60 pb-1.5">
              <dt className="text-muted">The neck label</dt>
              <dd className="text-text">{hero.neck}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-3 border-b border-line/60 pb-1.5">
              <dt className="text-muted">The tag</dt>
              <dd className="tabular-nums text-text">{hero.price}</dd>
            </div>
          </dl>
          <p className="mt-4 text-xs text-muted">
            {pieces.length} {pieces.length === 1 ? "piece" : "pieces"} on the rail behind you.
          </p>
        </>
      ) : (
        <p className="mt-4 text-sm leading-relaxed text-text">
          The form is bare. Nothing has come off the rail yet, so the mirror has nothing to show you
          but the alcove and the back of the shop.
        </p>
      )}
    </Modal>
  );
}
