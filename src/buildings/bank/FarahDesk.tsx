// Savings & Deposits, Farah's desk (docs/PRD_Building_Bank.md §7.5).
//
// The calculator (every number is the server's own, the same arithmetic that
// pays out), opening a fixed or recurring deposit with your own money, and your
// deposits as they grow. Farah explains how each option works and what it
// trades; she never says which one to choose (§1, rule 2).
import { useEffect, useMemo, useState } from "react";
import { Modal } from "@/ui/Modal";
import { Portrait } from "@/ui/Portrait";
import { audio } from "@/framework/audio/audioManager";
import { activeTrack } from "@/framework/city/track";
import {
  breakDeposit,
  formProblem,
  newKey,
  openDeposit,
  quote,
  useBankStore,
} from "@/framework/bank/bankStore";
import type { QuoteMonth, TermDeposit } from "@/framework/api";
import { BANK_CAST } from "@/ui/characters";

const primary =
  "rounded-full bg-gold px-5 py-2 text-sm font-semibold text-ink hover:brightness-110 disabled:opacity-60";
const secondary =
  "rounded-full border border-line/70 px-4 py-2 text-sm text-muted hover:border-gold/60 hover:text-text";
const input =
  "w-full rounded-lg border border-line/70 bg-surface-2/70 px-3 py-2 text-sm text-text outline-none focus:border-gold/70";

type Kind = "fd" | "rd";

const FD_TERMS = [3, 6, 12] as const;
const RD_TERMS = [6, 12] as const;
const FD_RATE: Record<number, string> = { 3: "1.5%", 6: "2%", 12: "2.5%" };

function errorText(e: unknown): string {
  return (
    formProblem(e)?.message ?? (e instanceof Error ? e.message : "Something went wrong. Try again.")
  );
}

function FarahSays({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <Portrait look={BANK_CAST.farah.look} artId="bank_farah" className="h-14 w-auto shrink-0" />
      <p className="text-sm leading-relaxed text-text">{children}</p>
    </div>
  );
}

function useQuote(kind: Kind, amount: number, term: number): QuoteMonth[] | null {
  const [q, setQ] = useState<QuoteMonth[] | null>(null);
  useEffect(() => {
    let live = true;
    const ok = kind === "fd" ? amount >= 100 : amount >= 20 && amount <= 200;
    if (!ok) {
      setQ(null);
      return;
    }
    const t = window.setTimeout(() => {
      quote(kind, amount, term)
        .then((m) => live && setQ(m))
        .catch(() => live && setQ(null));
    }, 250);
    return () => {
      live = false;
      window.clearTimeout(t);
    };
  }, [kind, amount, term]);
  return q;
}

/** Two lines: the deposit, and the same money in savings. Paid-in is dashed. */
function GrowthChart({ months }: { months: QuoteMonth[] }) {
  const w = 420;
  const h = 150;
  const pad = 28;
  const max = Math.max(...months.map((m) => m.deposit));
  const min = Math.min(...months.map((m) => Math.min(m.paid, m.savings)));
  const lo = Math.max(0, min - (max - min) * 0.15);
  const x = (i: number) => pad + (i / Math.max(1, months.length - 1)) * (w - pad * 2);
  const y = (v: number) => h - pad - ((v - lo) / Math.max(1, max - lo)) * (h - pad * 2);
  const path = (k: "deposit" | "savings" | "paid") =>
    months.map((m, i) => `${i ? "L" : "M"}${x(i)},${y(m[k])}`).join(" ");
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="mt-3 w-full"
      role="img"
      aria-label="How the money grows, month by month"
    >
      <line
        x1={pad}
        x2={w - pad}
        y1={h - pad}
        y2={h - pad}
        stroke="currentColor"
        className="text-line"
      />
      <path d={path("paid")} fill="none" stroke="#8d96a6" strokeWidth={1.5} strokeDasharray="4 4" />
      <path d={path("savings")} fill="none" stroke="#6fd0e8" strokeWidth={2} />
      <path d={path("deposit")} fill="none" stroke="#c9a24a" strokeWidth={2.5} />
      {months.map((m, i) =>
        i === months.length - 1 ? (
          <text key={i} x={x(i)} y={y(m.deposit) - 6} textAnchor="end" fontSize={11} fill="#e5c77a">
            ${m.deposit}
          </text>
        ) : null,
      )}
      <text x={pad} y={h - 8} fontSize={10} fill="#8d96a6">
        now
      </text>
      <text x={w - pad} y={h - 8} fontSize={10} fill="#8d96a6" textAnchor="end">
        month {months.length - 1}
      </text>
    </svg>
  );
}

function Legend() {
  return (
    <div className="mt-1 flex flex-wrap gap-4 text-xs text-muted">
      <span className="flex items-center gap-1.5">
        <span className="inline-block h-0.5 w-4 bg-[#c9a24a]" /> In the deposit
      </span>
      <span className="flex items-center gap-1.5">
        <span className="inline-block h-0.5 w-4 bg-[#6fd0e8]" /> Same money in savings
      </span>
      <span className="flex items-center gap-1.5">
        <span className="inline-block h-0.5 w-4 border-t border-dashed border-[#8d96a6]" /> What you
        put in
      </span>
    </div>
  );
}

// ── The calculator ───────────────────────────────────────────────────────────

export function SavingsCalculator({
  onClose,
  onOpen,
}: {
  onClose: () => void;
  onOpen: (kind: Kind) => void;
}) {
  const [kind, setKind] = useState<Kind>("fd");
  const [amount, setAmount] = useState(kind === "fd" ? "1000" : "100");
  const [term, setTerm] = useState(12);
  const levelB = activeTrack() === "SCB";
  const [guess, setGuess] = useState("");
  const [revealed, setRevealed] = useState(!levelB);
  const n = Math.floor(Number(amount) || 0);
  const q = useQuote(kind, n, term);
  const last = q?.[q.length - 1];

  const switchKind = (k: Kind) => {
    setKind(k);
    setAmount(k === "fd" ? "1000" : "100");
    setTerm(k === "fd" ? 12 : 6);
    setRevealed(!levelB);
    setGuess("");
  };

  return (
    <Modal onClose={onClose} width="lg">
      <FarahSays>
        "Let's see what your money could do. Pick an amount and a length of time, and I'll show you
        it month by month."
      </FarahSays>
      <div className="mt-4 flex gap-2">
        <button className={kind === "fd" ? primary : secondary} onClick={() => switchKind("fd")}>
          Fixed deposit
        </button>
        <button className={kind === "rd" ? primary : secondary} onClick={() => switchKind("rd")}>
          Recurring deposit
        </button>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="text-xs uppercase tracking-widest text-muted">
            {kind === "fd" ? "Amount (from $100)" : "Each month ($20–$200)"}
          </span>
          <input
            className={`${input} mt-1`}
            inputMode="numeric"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value.replace(/\D/g, ""));
              setRevealed(!levelB);
            }}
          />
        </label>
        <div>
          <span className="text-xs uppercase tracking-widest text-muted">For</span>
          <div className="mt-1 flex gap-2">
            {(kind === "fd" ? FD_TERMS : RD_TERMS).map((t) => (
              <button
                key={t}
                className={term === t ? primary : secondary}
                onClick={() => {
                  setTerm(t);
                  setRevealed(!levelB);
                }}
              >
                {t} months
              </button>
            ))}
          </div>
        </div>
      </div>
      <p className="mt-2 text-xs text-muted">
        {kind === "fd"
          ? `A ${term}-month fixed deposit pays ${FD_RATE[term]} a month, compounding. Savings pays 1%.`
          : "A recurring deposit pays 2% a month, compounding, on everything you've saved so far. Savings pays 1%."}
      </p>

      {!revealed && q && (
        <div className="mt-3 rounded-xl border border-gold/40 bg-gold/10 p-3 text-sm text-text">
          Before I show you: how much do you think it will be worth at the end?
          <div className="mt-2 flex gap-2">
            <input
              className={input}
              inputMode="numeric"
              placeholder="Your guess, $"
              value={guess}
              onChange={(e) => setGuess(e.target.value.replace(/\D/g, ""))}
            />
            <button className={primary} disabled={!guess} onClick={() => setRevealed(true)}>
              Show me
            </button>
          </div>
        </div>
      )}

      {revealed && q && last && (
        <>
          <GrowthChart months={q} />
          <Legend />
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <Stat label="You put in" value={`$${last.paid}`} />
            <Stat
              label={`In the ${kind === "fd" ? "fixed" : "recurring"} deposit`}
              value={`$${last.deposit}`}
              tone="gold"
            />
            <Stat label="In savings instead" value={`$${last.savings}`} />
          </div>
          {guess && levelB && (
            <p className="mt-2 text-xs text-muted">
              You guessed ${guess}.{" "}
              {Math.abs(Number(guess) - last.deposit) <= Math.max(5, last.deposit * 0.02)
                ? "Spot on."
                : Number(guess) < last.deposit
                  ? "Compounding adds up to more than most people expect: each month's interest earns interest too."
                  : "A little high. Interest is rounded down to whole dollars each month."}
            </p>
          )}
          <p className="mt-3 text-sm leading-relaxed text-muted">
            "The deposit earns ${last.deposit - last.savings} more than savings would. The trade is
            that{" "}
            {kind === "fd"
              ? `the money is locked for ${term} months. You can take it out early, but then it only earns the savings rate.`
              : "you commit to saving every month. If your balance can't cover a month, that month is skipped, and you earn a bit less."}{" "}
            Some people keep money for emergencies in savings first. That part is up to you."
          </p>
        </>
      )}
      {q === null && n > 0 && (
        <p className="mt-3 text-xs text-gold">
          {kind === "fd"
            ? "A fixed deposit starts at $100."
            : "A recurring deposit is between $20 and $200 a month."}
        </p>
      )}

      <div className="mt-5 flex justify-end gap-2">
        <button className={secondary} onClick={onClose}>
          Close
        </button>
        <button className={primary} onClick={() => onOpen(kind)}>
          Open a {kind === "fd" ? "fixed" : "recurring"} deposit
        </button>
      </div>
    </Modal>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "gold" }) {
  return (
    <div className="rounded-xl border border-line/60 bg-surface-2/60 p-2">
      <p className="text-[11px] uppercase tracking-widest text-muted">{label}</p>
      <p
        className={`mt-0.5 text-lg font-semibold tabular-nums ${tone === "gold" ? "text-gold" : "text-text"}`}
      >
        {value}
      </p>
    </div>
  );
}

// ── Opening a deposit ────────────────────────────────────────────────────────

export function OpenDeposit({ kind, onClose }: { kind: Kind; onClose: () => void }) {
  const account = useBankStore((s) => s.account);
  const busy = useBankStore((s) => s.busy);
  const key = useMemo(newKey, []);
  const [amount, setAmount] = useState(kind === "fd" ? "" : "50");
  const [term, setTerm] = useState(kind === "fd" ? 6 : 6);
  const [error, setError] = useState<string | null>(null);
  const [opened, setOpened] = useState<TermDeposit | null>(null);
  const n = Math.floor(Number(amount) || 0);
  const q = useQuote(kind, n, term);
  const last = q?.[q.length - 1];

  if (!account) return null;

  if (opened) {
    return (
      <Modal onClose={onClose} width="md">
        <FarahSays>
          {kind === "fd"
            ? `"Done. $${opened.principal} is in a ${opened.termMonths}-month fixed deposit. It matures on ${new Date(opened.maturesAt).toLocaleString()}, and the whole amount comes back into your account with the interest."`
            : `"Done. Your recurring deposit has started: $${opened.monthly} went in today, and $${opened.monthly} will be taken from your account at the end of every bank month for ${opened.termMonths} months."`}
        </FarahSays>
        <p className="mt-3 text-xs text-muted">
          You can see it growing in your passbook, or at this desk under "My deposits".
        </p>
        <div className="mt-5 flex justify-end">
          <button autoFocus className={primary} onClick={onClose}>
            Thank you, Farah
          </button>
        </div>
      </Modal>
    );
  }

  const submit = async () => {
    setError(null);
    if (n > account.balance) {
      setError(
        `There's $${account.balance} in your account. Pay more in at window 1 first, or choose a smaller amount.`,
      );
      return;
    }
    try {
      const d = await openDeposit(kind, n, term, key);
      audio.play("ui_confirm");
      setOpened(d);
    } catch (e) {
      setError(errorText(e));
      audio.play("ui_error");
    }
  };

  return (
    <Modal onClose={onClose} width="md">
      <FarahSays>
        {kind === "fd"
          ? `"A fixed deposit locks money away for a set time, at a higher rate. You have $${account.balance} in your account."`
          : `"A recurring deposit saves the same amount every month, straight from your account. You have $${account.balance} in it now."`}
      </FarahSays>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="text-xs uppercase tracking-widest text-muted">
            {kind === "fd" ? "Amount (from $100)" : "Each month ($20–$200)"}
          </span>
          <input
            className={`${input} mt-1`}
            inputMode="numeric"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))}
          />
        </label>
        <div>
          <span className="text-xs uppercase tracking-widest text-muted">For</span>
          <div className="mt-1 flex flex-wrap gap-2">
            {(kind === "fd" ? FD_TERMS : RD_TERMS).map((t) => (
              <button
                key={t}
                className={term === t ? primary : secondary}
                onClick={() => setTerm(t)}
              >
                {t} mo{kind === "fd" ? ` · ${FD_RATE[t]}` : ""}
              </button>
            ))}
          </div>
        </div>
      </div>
      {last && (
        <p className="mt-3 rounded-xl border border-gold/40 bg-gold/10 p-3 text-sm text-text">
          {kind === "fd"
            ? `$${n} becomes $${last.deposit} after ${term} months.`
            : `$${n} a month for ${term} months is $${last.paid} saved, worth $${last.deposit} at the end.`}{" "}
          <span className="text-muted">The same money in savings: ${last.savings}.</span>
        </p>
      )}
      <p className="mt-2 text-xs text-muted">
        {kind === "fd"
          ? "Need it back early? You can take it out any time: you get everything back, but with savings interest instead of the deposit rate."
          : "If your balance is short one month, that month is skipped: no charge, just a little less at the end."}
      </p>
      {error && <p className="mt-2 text-sm text-gold">✎ {error}</p>}
      <div className="mt-5 flex justify-end gap-2">
        <button className={secondary} onClick={onClose}>
          Not now
        </button>
        <button className={primary} disabled={busy || !last} onClick={submit}>
          {busy
            ? "Opening…"
            : kind === "fd"
              ? `Lock away $${n || 0}`
              : `Start saving $${n || 0} a month`}
        </button>
      </div>
    </Modal>
  );
}

// ── My deposits ──────────────────────────────────────────────────────────────

export function MyDeposits({ onClose }: { onClose: () => void }) {
  const deposits = useBankStore((s) => s.deposits);
  const busy = useBankStore((s) => s.busy);
  const [confirm, setConfirm] = useState<TermDeposit | null>(null);
  const [paid, setPaid] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (confirm) {
    return (
      <Modal onClose={() => setConfirm(null)} width="sm">
        {paid !== null ? (
          <FarahSays>"Done. ${paid} is back in your account."</FarahSays>
        ) : (
          <FarahSays>
            "If you take it out now, you get ${confirm.savingsValue}: everything you put in ($
            {confirm.paid}) plus interest at the savings rate. If you wait until it matures, it will
            be worth more. There's no charge either way."
          </FarahSays>
        )}
        {error && <p className="mt-2 text-sm text-red-300">{error}</p>}
        <div className="mt-5 flex justify-end gap-2">
          {paid !== null ? (
            <button
              autoFocus
              className={primary}
              onClick={() => {
                setConfirm(null);
                setPaid(null);
              }}
            >
              OK
            </button>
          ) : (
            <>
              <button autoFocus className={secondary} onClick={() => setConfirm(null)}>
                Keep it running
              </button>
              <button
                className={primary}
                disabled={busy}
                onClick={async () => {
                  try {
                    setPaid(await breakDeposit(confirm.id));
                    audio.play("ui_confirm");
                  } catch (e) {
                    setError(errorText(e));
                  }
                }}
              >
                Take it out now
              </button>
            </>
          )}
        </div>
      </Modal>
    );
  }

  return (
    <Modal onClose={onClose} width="lg">
      <h2 className="font-display text-xl font-semibold text-gold">My deposits</h2>
      {deposits.length === 0 ? (
        <p className="mt-3 text-sm text-muted">You don't have any deposits yet.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {deposits.map((d) => (
            <li key={d.id} className="rounded-xl border border-line/60 bg-surface-2/50 p-3">
              <div className="flex items-baseline justify-between gap-3">
                <p className="font-semibold text-text">
                  {d.termMonths}-month {d.kind === "fd" ? "fixed" : "recurring"} deposit
                  <span className="ml-2 text-xs font-normal text-muted">
                    {(d.rateBp / 100).toString()}% a month
                  </span>
                </p>
                <span className="text-xs uppercase tracking-widest text-muted">
                  {d.status === "active"
                    ? "running"
                    : d.status === "matured"
                      ? "matured"
                      : "taken out early"}
                </span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-line/50">
                <div
                  className="h-full bg-gold"
                  style={{ width: `${Math.min(100, (d.monthsDone / d.termMonths) * 100)}%` }}
                />
              </div>
              <p className="mt-2 text-sm text-muted">
                Month {Math.min(d.monthsDone, d.termMonths)} of {d.termMonths} · put in ${d.paid}
                {d.kind === "rd" &&
                  ` (${d.instalments} instalments${d.skipped ? `, ${d.skipped} skipped` : ""})`}{" "}
                ·{" "}
                {d.status === "active" ? (
                  <>
                    worth <span className="text-gold">${d.value}</span> now · matures{" "}
                    {new Date(d.maturesAt).toLocaleString()}
                  </>
                ) : (
                  <>paid out ${d.payout ?? 0}</>
                )}
              </p>
              {d.status === "active" && (
                <button className={`${secondary} mt-2`} onClick={() => setConfirm(d)}>
                  Take it out early
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      <div className="mt-5 flex justify-end">
        <button autoFocus className={primary} onClick={onClose}>
          Close
        </button>
      </div>
    </Modal>
  );
}
