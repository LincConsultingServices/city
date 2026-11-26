// Loans, at Sofia's desk (docs/PRD_Building_Bank.md, step 7).
//
// The credit score, line by line (so it is never a mystery number), borrowing
// with the full cost shown before you agree, and the loan as it is repaid.
// Loans charge interest — that is the lesson — but nothing else: no fee to
// arrange, no fee for a missed month, no penalty for paying early. Sofia
// explains what borrowing costs and what it is for; whether to borrow is the
// player's call.
import { useEffect, useMemo, useState } from "react";
import { Modal } from "@/ui/Modal";
import { Portrait } from "@/ui/Portrait";
import { audio } from "@/framework/audio/audioManager";
import type { Credit, Loan, LoanQuote } from "@/framework/api";
import {
  activeLoan,
  borrow,
  formProblem,
  loanQuote,
  newKey,
  repayLoan,
  useBankStore,
} from "@/framework/bank/bankStore";
import { BANK_CAST } from "@/ui/characters";

const primary =
  "rounded-full bg-gold px-5 py-2 text-sm font-semibold text-ink hover:brightness-110 disabled:opacity-60";
const secondary =
  "rounded-full border border-line/70 px-4 py-2 text-sm text-muted hover:border-gold/60 hover:text-text";
const input =
  "w-full rounded-lg border border-line/70 bg-surface-2/70 px-3 py-2 text-sm text-text outline-none focus:border-gold/70";

const TERMS = [3, 6, 12] as const;
const BANDS = [
  { name: "Excellent", min: 750, limit: 3000, rate: "1.5%" },
  { name: "Good", min: 650, limit: 1500, rate: "2%" },
  { name: "Fair", min: 550, limit: 500, rate: "2.5%" },
  { name: "Building", min: 500, limit: 200, rate: "3%" },
  { name: "Poor", min: 300, limit: 0, rate: "" },
];

const pct = (bp: number) => `${bp / 100}%`;

function errorText(e: unknown): string {
  return (
    formProblem(e)?.message ?? (e instanceof Error ? e.message : "Something went wrong. Try again.")
  );
}

function SofiaSays({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <Portrait look={BANK_CAST.sofia.look} artId="bank_sofia" className="h-14 w-auto shrink-0" />
      <p className="text-sm leading-relaxed text-text">{children}</p>
    </div>
  );
}

/** The score on a 300–900 bar, with the band marks. */
function ScoreBar({ credit }: { credit: Credit }) {
  const at = ((credit.score - 300) / 600) * 100;
  return (
    <div className="mt-3">
      <div className="flex items-baseline justify-between">
        <p className="font-display text-4xl text-gold tabular-nums">{credit.score}</p>
        <p className="text-sm font-semibold text-text">{credit.band.name}</p>
      </div>
      <div className="relative mt-2 h-2 rounded-full bg-gradient-to-r from-[#a83a32] via-[#c9a24a] to-[#3f9a5a]">
        <div
          className="absolute -top-1 h-4 w-1 rounded bg-white shadow"
          style={{ left: `calc(${at}% - 2px)` }}
        />
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-muted">
        <span>300</span>
        <span>550</span>
        <span>650</span>
        <span>750</span>
        <span>900</span>
      </div>
    </div>
  );
}

// ── The credit report ────────────────────────────────────────────────────────

export function CreditReport({ onClose }: { onClose: () => void }) {
  const credit = useBankStore((s) => s.credit);
  if (!credit) return null;
  return (
    <Modal onClose={onClose} width="md">
      <SofiaSays>
        "This is your credit score. It's how a bank judges how safely it can lend to you, worked out
        from how you've handled money with us. Here's every line of it."
      </SofiaSays>
      <ScoreBar credit={credit} />
      <ul className="mt-4 space-y-1 text-sm">
        {credit.factors.map((f) => (
          <li key={f.label} className="flex justify-between gap-3 border-b border-line/40 py-1">
            <span className="text-muted">{f.label}</span>
            <span className={`tabular-nums ${f.points < 0 ? "text-red-300" : "text-text"}`}>
              {f.points > 0 ? `+${f.points}` : f.points}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-xs uppercase tracking-widest text-muted">What the score means here</p>
      <table className="mt-1 w-full text-sm">
        <tbody>
          {BANDS.map((b) => (
            <tr key={b.name} className={b.name === credit.band.name ? "text-gold" : "text-muted"}>
              <td className="py-0.5">{b.name}</td>
              <td className="py-0.5">{b.min}+</td>
              <td className="py-0.5">{b.limit ? `borrow up to $${b.limit}` : "loans declined"}</td>
              <td className="py-0.5 text-right">{b.rate ? `${b.rate} a month` : ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-3 text-xs leading-relaxed text-muted">
        Paying instalments on time and repaying loans in full raise it. Missed instalments and
        bounced cheques lower it. A better score means you can borrow more, and it costs you less.
        Each loan application is a credit check that stays on your record for 6 bank months and
        lowers the score a little, so apply only when you mean it.
      </p>
      <div className="mt-5 flex justify-end">
        <button autoFocus className={primary} onClick={onClose}>
          Thank you, Sofia
        </button>
      </div>
    </Modal>
  );
}

// ── Borrowing ────────────────────────────────────────────────────────────────

export function BorrowMoney({ onClose }: { onClose: () => void }) {
  const credit = useBankStore((s) => s.credit);
  const busy = useBankStore((s) => s.busy);
  const key = useMemo(newKey, []);
  const [amount, setAmount] = useState("");
  const [term, setTerm] = useState<number>(6);
  const [purpose, setPurpose] = useState("");
  const [q, setQ] = useState<LoanQuote | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [done, setDone] = useState<Loan | null>(null);
  const n = Math.floor(Number(amount) || 0);

  useEffect(() => {
    let live = true;
    setQ(null);
    setProblem(null);
    if (!credit?.eligible || n < 100) return;
    const t = window.setTimeout(() => {
      loanQuote(n, term)
        .then((r) => live && setQ(r))
        .catch((e) => live && setProblem(errorText(e)));
    }, 250);
    return () => {
      live = false;
      window.clearTimeout(t);
    };
  }, [n, term, credit?.eligible]);

  if (!credit) return null;

  if (!credit.eligible) {
    return (
      <Modal onClose={onClose} width="sm">
        <SofiaSays>"{credit.reason}"</SofiaSays>
        <div className="mt-5 flex justify-end">
          <button autoFocus className={primary} onClick={onClose}>
            I understand
          </button>
        </div>
      </Modal>
    );
  }

  if (done) {
    return (
      <Modal onClose={onClose} width="md">
        <SofiaSays>
          "${done.principal} is in your account now. ${done.instalment} will come out at the end of
          every bank month for {done.termMonths} months. If your balance is short one month, the
          instalment is missed: there's no fee, but that month's interest is added to what you owe,
          and it shows on your credit score."
        </SofiaSays>
        <div className="mt-5 flex justify-end">
          <button autoFocus className={primary} onClick={onClose}>
            Thank you, Sofia
          </button>
        </div>
      </Modal>
    );
  }

  const apply = async () => {
    try {
      const l = await borrow(n, term, purpose, key);
      audio.play("ui_confirm");
      setDone(l);
    } catch (e) {
      setProblem(errorText(e));
      audio.play("ui_error");
    }
  };

  return (
    <Modal onClose={onClose} width="lg">
      <SofiaSays>
        "With a {credit.band.name.toLowerCase()} score ({credit.score}) I can lend you up to $
        {credit.limit}, at {pct(credit.rateBp)} interest a month. Interest is the price of
        borrowing: you pay back more than you borrow."
      </SofiaSays>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <label className="block">
          <span className="text-xs uppercase tracking-widest text-muted">
            Borrow ($100–${credit.limit})
          </span>
          <input
            className={`${input} mt-1`}
            inputMode="numeric"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value.replace(/\D/g, ""));
              setAgreed(false);
            }}
          />
        </label>
        <div className="sm:col-span-2">
          <span className="text-xs uppercase tracking-widest text-muted">Repay over</span>
          <div className="mt-1 flex gap-2">
            {TERMS.map((t) => (
              <button
                key={t}
                className={term === t ? primary : secondary}
                onClick={() => {
                  setTerm(t);
                  setAgreed(false);
                }}
              >
                {t} months
              </button>
            ))}
          </div>
        </div>
      </div>
      <label className="mt-3 block">
        <span className="text-xs uppercase tracking-widest text-muted">What is it for?</span>
        <input
          className={`${input} mt-1`}
          maxLength={60}
          placeholder="e.g. Equipment for my business"
          value={purpose}
          onChange={(e) => setPurpose(e.target.value)}
        />
      </label>

      {problem && <p className="mt-3 text-sm text-gold">✎ {problem}</p>}

      {q && (
        <>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <Stat label="Each month" value={`$${q.instalment}`} />
            <Stat label="You pay back" value={`$${q.totalRepaid}`} />
            <Stat label="Interest (the cost)" value={`$${q.totalInterest}`} gold />
          </div>
          <details className="mt-3 text-sm">
            <summary className="cursor-pointer text-muted">See it month by month</summary>
            <table className="mt-2 w-full text-xs">
              <thead className="text-left uppercase tracking-widest text-muted">
                <tr>
                  <th className="py-1">Month</th>
                  <th className="py-1 text-right">Interest</th>
                  <th className="py-1 text-right">Payment</th>
                  <th className="py-1 text-right">Still owed</th>
                </tr>
              </thead>
              <tbody>
                {q.schedule.map((m) => (
                  <tr key={m.month} className="border-t border-line/40 text-text">
                    <td className="py-1">{m.month}</td>
                    <td className="py-1 text-right tabular-nums">${m.interest}</td>
                    <td className="py-1 text-right tabular-nums">${m.payment}</td>
                    <td className="py-1 text-right tabular-nums">${m.outstanding}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 text-xs text-muted">
              Interest is charged on what you still owe, so it shrinks as you pay the loan down.
            </p>
          </details>
          <p className="mt-3 text-xs leading-relaxed text-muted">
            "Borrowing for something that earns or saves you money, like equipment for a business,
            can be worth its interest. Borrowing for things that are gone once you've bought them
            just costs more. Only you know which this is."
          </p>
          <label className="mt-3 flex items-start gap-2 text-sm text-text">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-1"
            />
            I understand I'll repay ${q.totalRepaid} in total, ${q.instalment} a month for{" "}
            {q.termMonths} months, taken from my account.
          </label>
        </>
      )}

      <div className="mt-5 flex justify-end gap-2">
        <button className={secondary} onClick={onClose}>
          Not now
        </button>
        <button className={primary} disabled={!q || !agreed || busy} onClick={apply}>
          {busy ? "Arranging…" : `Borrow $${n || 0}`}
        </button>
      </div>
    </Modal>
  );
}

function Stat({ label, value, gold }: { label: string; value: string; gold?: boolean }) {
  return (
    <div className="rounded-xl border border-line/60 bg-surface-2/60 p-2">
      <p className="text-[11px] uppercase tracking-widest text-muted">{label}</p>
      <p
        className={`mt-0.5 text-lg font-semibold tabular-nums ${gold ? "text-gold" : "text-text"}`}
      >
        {value}
      </p>
    </div>
  );
}

// ── My loan ──────────────────────────────────────────────────────────────────

export function MyLoan({ onClose }: { onClose: () => void }) {
  const loans = useBankStore((s) => s.loans);
  const account = useBankStore((s) => s.account);
  const monthHours = useBankStore((s) => s.rules?.monthHours);
  const busy = useBankStore((s) => s.busy);
  const [extra, setExtra] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const key = useMemo(newKey, []);
  const l = activeLoan(loans);
  const past = loans.filter((x) => x.status === "repaid");

  const pay = async (amount: number) => {
    setMessage(null);
    try {
      const paid = await repayLoan(amount, `${key}-${amount}-${Date.now()}`);
      audio.play("ui_confirm");
      setMessage(
        amount === 0 || (l && paid >= l.outstanding)
          ? `Repaid in full. No penalty for paying early.`
          : `Paid $${paid} off your loan.`,
      );
      setExtra("");
    } catch (e) {
      setMessage(errorText(e));
      audio.play("ui_error");
    }
  };

  return (
    <Modal onClose={onClose} width="md">
      <h2 className="font-display text-xl font-semibold text-gold">My loan</h2>
      {!l ? (
        <p className="mt-3 text-sm text-muted">
          {past.length
            ? `You've repaid ${past.length} loan${past.length > 1 ? "s" : ""} in full.`
            : "You don't have a loan."}
        </p>
      ) : (
        <>
          <p className="mt-2 text-sm text-text">
            ${l.principal} borrowed{l.purpose ? ` for ${l.purpose.toLowerCase()}` : ""},{" "}
            {pct(l.rateBp)} a month.
          </p>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <Stat label="Still owed" value={`$${l.outstanding}`} gold />
            <Stat label="Each month" value={`$${l.instalment}`} />
            <Stat label="Paid so far" value={`$${l.paid}`} />
          </div>
          <p className="mt-3 text-xs text-muted">
            {l.onTime} paid on time{l.missed ? `, ${l.missed} missed` : ""}. Next instalment:{" "}
            {monthHours
              ? new Date(
                  Date.parse(l.openedAt) + (l.monthsDone + 1) * monthHours * 3_600_000,
                ).toLocaleString()
              : "soon"}
            .
            {account && account.balance < Math.min(l.instalment, l.outstanding) && (
              <span className="text-gold">
                {" "}
                Your balance (${account.balance}) won't cover it: pay some in first, or it will be
                missed.
              </span>
            )}
          </p>
          <div className="mt-4 flex flex-wrap items-end gap-2">
            <label className="block">
              <span className="text-xs uppercase tracking-widest text-muted">Pay extra ($)</span>
              <input
                className={`${input} mt-1 w-32`}
                inputMode="numeric"
                value={extra}
                onChange={(e) => setExtra(e.target.value.replace(/\D/g, ""))}
              />
            </label>
            <button
              className={secondary}
              disabled={busy || !extra}
              onClick={() => pay(Number(extra))}
            >
              Pay extra
            </button>
            <button className={primary} disabled={busy} onClick={() => pay(0)}>
              Repay all ${l.outstanding}
            </button>
          </div>
          <p className="mt-2 text-xs text-muted">
            Paying early is free, and it means less interest.
          </p>
        </>
      )}
      {message && <p className="mt-3 text-sm text-gold">{message}</p>}
      <div className="mt-5 flex justify-end">
        <button autoFocus className={primary} onClick={onClose}>
          Close
        </button>
      </div>
    </Modal>
  );
}
