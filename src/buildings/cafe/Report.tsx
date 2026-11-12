// The door, and what you leave with.
//
// ADR-005 §13 makes this the one place tier vocabulary is allowed, and ADR-007
// §15 adds three things to it: what came out consistently across different
// stages, how far you moved from where you started, and where the business
// ended up.
//
// It cannot say all of that yet, and it says so rather than inventing it.
// Proficiency is computed server-side and there is no endpoint that hands a
// learner their own tiers back — the same gap `Offer.tsx` recorded before it.
// What this can report honestly is the shape of the career: how far you got,
// what you decided, and what the business did. That is the trail, and the trail
// is the thing a player actually wants.
//
// One rule that still binds here: **thin evidence must not be narrated as a
// pattern.** Three of the nine competencies rest on a single decision, and "you
// had one call to make on this and you made it well" is the honest register.
import { useState } from "react";
import { Modal } from "@/ui/Modal";
import { Evaluation } from "@/ui/Evaluation";
import { ROLE_LABEL, STAGES, stageById } from "./journey";
import { useJourneyStore, type StageOutcome } from "./journeyStore";

export function Report({ onClose }: { onClose: () => void }) {
  const [showAssessment, setShowAssessment] = useState(false);
  const role = useJourneyStore((s) => s.role);
  const revenue = useJourneyStore((s) => s.revenue);
  const decided = useJourneyStore((s) => s.decided);
  const qaDone = useJourneyStore((s) => s.qaDone);
  const unsent = useJourneyStore((s) => s.unsent);
  const outcome = useJourneyStore((s) => s.outcome);

  const salary = outcome?.stageId === "cafe.exit" ? (outcome.salary ?? null) : null;

  if (showAssessment) {
    return (
      <div className="pointer-events-auto">
        <Modal onClose={onClose} width="lg">
          <h2 className="font-display text-xl font-semibold text-gold">Your assessment</h2>
          <p className="mt-2 text-xs leading-relaxed text-muted">
            Read back from what you actually decided, across every business you have worked in.
          </p>
          <div className="mt-6">
            <Evaluation />
          </div>
          <button
            onClick={() => setShowAssessment(false)}
            className="mt-8 rounded-lg border border-line/70 px-5 py-2 text-sm font-medium text-muted transition hover:border-gold/40 hover:text-text"
          >
            Back to the year
          </button>
        </Modal>
      </div>
    );
  }

  return (
    <div className="pointer-events-auto">
      <Modal onClose={onClose} width="md">
        <h2 className="font-display text-xl font-semibold text-gold">The year at the corner</h2>

        <p className="mt-3 text-sm leading-relaxed text-text">
          You walked in as a candidate and left as {article(ROLE_LABEL[role])}.{" "}
          {revenue === 0
            ? "The books close roughly where you found them."
            : revenue > 0
              ? `The café is ${revenue.toLocaleString()} better off than the one you were hired into.`
              : `The café is ${Math.abs(revenue).toLocaleString()} down on the one you were hired into.`}
        </p>

        <p className="mt-3 text-sm leading-relaxed text-muted">
          Nobody told you which choices were the good ones while you were making them. That is the
          point of asking this way.
        </p>

        <dl className="mt-6 grid grid-cols-3 gap-3 text-sm">
          <Fact label="Got to" value={ROLE_LABEL[role]} />
          <Fact label="Decisions" value={String(decided.length)} />
          <Fact label="Questions answered" value={String(qaDone.length)} />
        </dl>

        {salary && <SalarySummary salary={salary} />}

        <h3 className="mt-6 text-xs uppercase tracking-widest text-muted">Where you worked</h3>
        <ol className="mt-3 space-y-2.5">
          {postings(decided).map((p) => (
            <li key={p.stageId} className="text-sm leading-relaxed">
              <span className="text-text">{p.title}</span>
              <span className="mt-0.5 block pl-0 text-xs text-muted">
                {p.count === 1 ? "one decision" : `${p.count} decisions`}
              </span>
            </li>
          ))}
        </ol>

        {/*
          The gap this file used to record — "scored but not yet shown, it needs
          an endpoint that hands a learner their own results back, and that does
          not exist" — is closed. GET /api/v1/report exists, and this is the
          door to it.

          It is a door and not the report itself on purpose. What is above is
          the year: how far you got, what you decided, what the business did.
          What is behind the button is the assessment: what came out
          consistently, what is still emerging, and how far you moved from your
          first attempt. Two different questions, and putting the second one
          inline would bury the first.
        */}
        <button
          onClick={() => setShowAssessment(true)}
          className="mt-6 w-full rounded-xl border border-line/70 bg-surface-2/50 p-4 text-left transition hover:border-gold/50 hover:bg-surface-2"
        >
          <span className="block text-sm font-medium text-text">See your full assessment</span>
          <span className="mt-1 block text-xs leading-relaxed text-muted">
            Your natural strengths and emerging skills, where you started and how far you moved, and
            which business you earned the most in.
          </span>
        </button>

        {unsent.length > 0 && (
          <p className="mt-3 text-xs text-muted">
            {unsent.length === 1 ? "One sitting" : `${unsent.length} sittings`} never reached the
            server. They will be sent the next time you come in.
          </p>
        )}

        <button
          onClick={onClose}
          className="mt-6 rounded-lg bg-gold px-5 py-2 font-medium text-ink transition hover:brightness-110 active:scale-[0.98]"
        >
          Out onto the street
        </button>
      </Modal>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-line/70 bg-surface-2/50 p-3">
      <dt className="text-xs uppercase tracking-widest text-muted">{label}</dt>
      <dd className="mt-1 font-display text-base text-text">{value}</dd>
    </div>
  );
}

/** Which postings the player actually worked, and how much they decided in each. */
function postings(decided: readonly { unitId: string }[]) {
  const out: { stageId: string; title: string; count: number }[] = [];
  for (const stage of STAGES) {
    if (stage.kind !== "scenarios" && stage.kind !== "succession") continue;
    const own = new Set<string>();
    for (const sc of stage.scenes ?? []) own.add(sc.unitId);
    for (const t of stage.trees ?? []) own.add(t.unitId);
    if (stage.pickUnitId) own.add(stage.pickUnitId);
    const count = decided.filter((d) => own.has(d.unitId)).length;
    if (count > 0) out.push({ stageId: stage.id, title: stage.title, count });
  }
  return out;
}

function article(role: string): string {
  return /^[AEIOU]/i.test(role) ? `an ${role}` : `a ${role}`;
}

type Salary = NonNullable<StageOutcome["salary"]>;

/** Which way each category reads. */
const CATEGORY: Record<Salary["lines"][number]["category"], { label: string; tone: string }> = {
  best: { label: "Best choice", tone: "text-[#7cc48a]" },
  normal: { label: "Normal choice", tone: "text-muted" },
  worst: { label: "Worst choice", tone: "text-[#e08a82]" },
};

/**
 * The career's pay: the total, whether it is in the wallet, and what each
 * decision added. Shown once, here, at the door — the first moment a tier can
 * be read without changing a decision still to come.
 */
function SalarySummary({ salary }: { salary: Salary }) {
  const byStage = new Map<string, Salary["lines"]>();
  for (const line of salary.lines) {
    byStage.set(line.stageId, [...(byStage.get(line.stageId) ?? []), line]);
  }
  const money = (n: number) => `$${n.toLocaleString()}`;

  return (
    <section
      aria-labelledby="salary-h"
      className="mt-6 rounded-xl border border-gold/40 bg-gold/5 p-4"
    >
      <div className="flex items-baseline justify-between gap-3">
        <h3 id="salary-h" className="text-xs uppercase tracking-widest text-gold">
          Your salary
        </h3>
        <span className="font-display text-2xl tabular-nums text-text">{money(salary.total)}</span>
      </div>
      <p className="mt-1 text-xs leading-relaxed text-muted">
        {!salary.handedOver
          ? "You left before handing the café on, so no salary is paid. This is what your decisions were worth."
          : salary.credited
            ? "Added to your wallet."
            : "Your first career here was already paid, so this one is not paid again."}
      </p>

      {[...byStage.entries()].map(([stageId, lines]) => {
        const stage = stageById(stageId);
        const subtotal = lines.reduce((n, l) => n + l.amount, 0);
        return (
          <div key={stageId} className="mt-4">
            <div className="flex items-baseline justify-between text-xs">
              <span className="font-medium text-text">
                {stage ? `${ROLE_LABEL[stage.role]} · ${stage.title}` : stageId}
              </span>
              <span className="tabular-nums text-muted">{money(subtotal)}</span>
            </div>
            <ul className="mt-1.5 space-y-1">
              {lines.map((l) => (
                <li key={l.unitId} className="flex items-baseline gap-3 text-xs">
                  <span
                    className="min-w-0 flex-1 truncate text-text"
                    title={decisionTitle(l.unitId)}
                  >
                    {decisionTitle(l.unitId)}
                  </span>
                  <span className={`shrink-0 ${CATEGORY[l.category].tone}`}>
                    {CATEGORY[l.category].label} · {l.percent}% of {money(l.base)}
                  </span>
                  <span className="w-14 shrink-0 text-right tabular-nums text-text">
                    {money(l.amount)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </section>
  );
}

/** A decision's name, from the scene or business scene it belongs to. */
function decisionTitle(unitId: string): string {
  for (const stage of STAGES) {
    if (stage.pickUnitId === unitId) return "Choosing your successor";
    const scene = stage.scenes?.find((x) => x.unitId === unitId);
    if (scene) return scene.title;
    const tree = stage.trees?.find((x) => x.unitId === unitId);
    if (tree) return tree.title;
  }
  return unitId;
}
