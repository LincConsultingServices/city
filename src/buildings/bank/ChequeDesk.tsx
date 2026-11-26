// Cheques at window 2 and the drop box (docs/PRD_Building_Bank.md §7.4).
//
// Paying a cheque in (you write your account number on the back, and then you
// wait for it to clear), writing one to yourself to take cash out, getting a
// cheque book, and spotting the bad cheques in today's pile.
import { useMemo, useState } from "react";
import { Modal } from "@/ui/Modal";
import { Portrait } from "@/ui/Portrait";
import { audio } from "@/framework/audio/audioManager";
import { activeTrack } from "@/framework/city/track";
import {
  depositCheque,
  formProblem,
  issueChequeBook,
  newKey,
  useBankStore,
  writeCheque,
} from "@/framework/bank/bankStore";
import type { BankChequeWritten, Cheque } from "@/framework/api";
import { BANK_CAST } from "@/ui/characters";
import { finishTicket } from "./roomStore";
import { usePayees } from "./usePayees";
import {
  FAULTS,
  checkCheque,
  chequeAmount,
  isoDay,
  judged,
  practiceCheques,
  type ChequeFault,
  type ChequeField,
  type ChequeIssue,
  type ChequeValues,
  type PracticeCheque,
} from "./cheques";

const SIGNATURE_FONT = '"Segoe Script", "Brush Script MT", "Snell Roundhand", cursive';
const primary =
  "rounded-full bg-gold px-5 py-2 text-sm font-semibold text-ink hover:brightness-110 disabled:opacity-60";
const secondary =
  "rounded-full border border-line/70 px-4 py-2 text-sm text-muted hover:border-gold/60 hover:text-text";
const paper =
  "rounded border border-[#22252c]/25 bg-white/70 px-2 py-1 text-sm text-[#22252c] outline-none focus:border-[#c9a24a]";

function errorText(e: unknown): string {
  return (
    formProblem(e)?.message ?? (e instanceof Error ? e.message : "Something went wrong. Try again.")
  );
}

function when(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

function OmarSays({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <Portrait look={BANK_CAST.omar.look} artId="bank_omar" className="h-14 w-auto shrink-0" />
      <p className="text-sm leading-relaxed text-text">{children}</p>
    </div>
  );
}

// ── The cheque itself ────────────────────────────────────────────────────────

interface ChequeFace {
  bank?: string;
  number: string;
  date: string;
  payee: string;
  amount: string;
  words: string;
  signature: string;
  crossed: boolean;
  bearerStruck: boolean;
  accountNumber?: string;
  from?: string;
  memo?: string;
}

export function ChequeArt({ c, children }: { c: ChequeFace; children?: React.ReactNode }) {
  return (
    <div
      className="relative overflow-hidden rounded-xl border border-[#c9a24a]/60 p-4 text-[#22252c] shadow"
      style={{ background: "linear-gradient(120deg, #f6f1e4 0%, #eae4d2 100%)" }}
    >
      {c.crossed && (
        <div
          aria-label="Crossed: account payee only"
          className="pointer-events-none absolute left-6 top-0 h-full w-16 -skew-x-[30deg] border-x-2 border-[#22252c]/70"
        >
          <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 skew-x-[30deg] whitespace-nowrap text-[9px] font-semibold tracking-wider">
            A/C PAYEE
          </span>
        </div>
      )}
      <div className="flex items-start justify-between">
        <p className="font-display text-sm font-semibold">{c.bank ?? "MERIDIAN BANK"}</p>
        <p className="text-xs">
          Date{" "}
          <span className="ml-1 border-b border-[#22252c]/40 px-1 font-mono">
            {c.date || "  /  /    "}
          </span>
        </p>
      </div>
      <p className="mt-3 text-sm">
        Pay{" "}
        <span className="mx-1 inline-block min-w-[10rem] border-b border-[#22252c]/40 px-1 font-semibold">
          {c.payee}
        </span>
        <span className={c.bearerStruck ? "text-[#22252c]/50 line-through" : ""}>or bearer</span>
      </p>
      <div className="mt-2 flex items-end gap-3">
        <p className="flex-1 text-sm">
          Dollars{" "}
          <span className="ml-1 inline-block w-[85%] border-b border-[#22252c]/40 px-1 italic">
            {c.words}
          </span>
        </p>
        <p className="rounded border border-[#22252c]/50 bg-white/60 px-2 py-1 font-mono text-sm">
          ${c.amount}
        </p>
      </div>
      <div className="mt-3 flex items-end justify-between text-[11px]">
        <span className="font-mono">
          {c.from ? `${c.from} · ` : ""}No. {c.number}
          {c.accountNumber ? ` · A/c ${c.accountNumber}` : ""}
        </span>
        <span
          className="min-w-[8rem] border-t border-[#22252c]/40 pt-0.5 text-center text-base"
          style={{ fontFamily: SIGNATURE_FONT }}
        >
          {c.signature || (
            <span className="text-[10px] not-italic text-[#22252c]/50">signature</span>
          )}
        </span>
      </div>
      {c.memo && <p className="mt-1 text-[11px] italic text-[#22252c]/70">Memo: {c.memo}</p>}
      {children}
    </div>
  );
}

const faceOf = (c: Cheque): ChequeFace => ({
  bank: c.direction === "in" ? "CITY SAVINGS BANK" : undefined,
  number: c.number,
  date: c.date,
  payee: c.to || "",
  amount: String(c.amount),
  words: c.words,
  signature: c.direction === "in" ? c.from : "",
  crossed: c.crossed,
  bearerStruck: true,
  memo: c.memo,
  from: c.direction === "in" ? c.from : undefined,
});

// ── Paying a cheque in ───────────────────────────────────────────────────────

export function PayInCheque({
  onClose,
  dropBox = false,
}: {
  onClose: () => void;
  dropBox?: boolean;
}) {
  const account = useBankStore((s) => s.account);
  const cheques = useBankStore((s) => s.cheques);
  const busy = useBankStore((s) => s.busy);
  const held = cheques.filter((c) => c.direction === "in" && c.status === "held");
  const [pick, setPick] = useState<string | null>(held[0]?.id ?? null);
  const [back, setBack] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const [done, setDone] = useState<Cheque | null>(null);

  if (!account) return null;
  const cheque = held.find((c) => c.id === pick);

  if (done) {
    return (
      <Modal onClose={onClose} width="md">
        {dropBox ? (
          <p className="text-sm text-text">The cheque drops into the box with a soft thud.</p>
        ) : (
          <OmarSays>
            "Got it. ${done.amount} from {done.from}."
          </OmarSays>
        )}
        <p className="mt-3 rounded-xl border border-gold/40 bg-gold/10 p-3 text-sm leading-relaxed text-text">
          A cheque isn't money yet. The bank has to <b>clear</b> it first: collect the $
          {done.amount} from {done.from}'s bank. It will be in your account at about{" "}
          <b>{when(done.clearsAt)}</b>, and you'll see it in your passbook then.
        </p>
        <div className="mt-5 flex justify-end">
          <button autoFocus className={primary} onClick={onClose}>
            Thank you
          </button>
        </div>
      </Modal>
    );
  }

  const payIn = async () => {
    if (!cheque) return;
    if (back.replace(/\s/g, "") !== account.accountNumber) {
      setNote(
        back.trim()
          ? "That isn't your account number. Copy it from your passbook. It's how the bank knows which account the cheque goes into."
          : "Write your account number on the back first. It's how the bank knows which account the cheque goes into.",
      );
      audio.play("ui_error");
      return;
    }
    try {
      const c = await depositCheque(cheque.id);
      audio.play("ui_confirm");
      if (!dropBox) finishTicket();
      setDone(c);
    } catch (e) {
      setNote(errorText(e));
      audio.play("ui_error");
    }
  };

  return (
    <Modal onClose={onClose} width="lg">
      {dropBox ? (
        <p className="text-sm text-muted">
          Cheque drop box. "Write your name and account number on the back of the cheque, then drop
          it in. No queue needed."
        </p>
      ) : (
        <OmarSays>
          "Paying in a cheque? Turn it over and write your account number on the back."
        </OmarSays>
      )}
      {held.length === 0 ? (
        <p className="mt-4 text-sm text-text">You don't have any cheques to pay in.</p>
      ) : (
        <>
          {held.length > 1 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {held.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setPick(c.id)}
                  className={c.id === pick ? primary : secondary}
                >
                  ${c.amount} from {c.from}
                </button>
              ))}
            </div>
          )}
          {cheque && (
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <ChequeArt c={{ ...faceOf(cheque), payee: account.holder }} />
              <div className="rounded-xl border border-dashed border-[#c9a24a]/60 bg-[#f3efe6] p-4 text-[#22252c]">
                <p className="text-[11px] uppercase tracking-widest text-[#22252c]/70">
                  The back of the cheque
                </p>
                <label className="mt-2 block text-xs">
                  For deposit to account no.
                  <input
                    value={back}
                    inputMode="numeric"
                    onChange={(e) => setBack(e.target.value)}
                    className={`${paper} mt-1 w-full font-mono tracking-widest`}
                  />
                </label>
                <p className="mt-2 text-xs" style={{ fontFamily: SIGNATURE_FONT }}>
                  {account.signature}
                </p>
                {cheque.crossed && (
                  <p className="mt-2 text-[11px] text-[#22252c]/70">
                    It's crossed ("A/C payee"), so it can only go into an account, never be cashed.
                    That keeps it safe if it's lost.
                  </p>
                )}
              </div>
            </div>
          )}
          {note && <p className="mt-3 text-xs italic text-gold">✎ {note}</p>}
        </>
      )}
      <div className="mt-5 flex justify-end gap-2">
        <button className={secondary} onClick={onClose}>
          Not now
        </button>
        {held.length > 0 && (
          <button className={primary} disabled={busy || !cheque} onClick={payIn}>
            {busy ? "Paying in…" : dropBox ? "Drop it in the box" : "Hand it to Omar"}
          </button>
        )}
      </div>
    </Modal>
  );
}

// ── Writing a cheque to yourself ─────────────────────────────────────────────

export function CashACheque({ onClose }: { onClose: () => void }) {
  const account = useBankStore((s) => s.account);
  const busy = useBankStore((s) => s.busy);
  const today = useMemo(() => isoDay(new Date()), []);
  const key = useMemo(newKey, []);
  const [v, setV] = useState<ChequeValues>({
    date: "",
    amount: "",
    words: "",
    signature: "",
    crossed: false,
  });
  const [issues, setIssues] = useState<ChequeIssue[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BankChequeWritten | null>(null);
  const payees = usePayees();
  const [payeeId, setPayeeId] = useState("self");
  const toSelf = payeeId === "self";
  const payeeName = toSelf ? "Self" : (payees.find((p) => p.id === payeeId)?.name ?? "");

  if (!account) return null;
  const set = <K extends ChequeField>(k: K, val: ChequeValues[K]) =>
    setV((x) => ({ ...x, [k]: val }));
  const issueFor = (f: ChequeField) => issues?.find((i) => i.field === f)?.message;
  const number = String(account.nextCheque ?? 1).padStart(6, "0");

  if (account.chequeLeaves <= 0 && !result) {
    return <ChequeBookRequest onClose={onClose} />;
  }

  if (result) {
    return (
      <Modal onClose={onClose} width="md">
        {result.bounced ? (
          <>
            <OmarSays>"I'm sorry. I can't pay this one."</OmarSays>
            <p className="mt-3 rounded-xl border border-gold/40 bg-gold/10 p-3 text-sm leading-relaxed text-text">
              Your cheque for ${result.cheque.amount} <b>bounced</b>: there's only ${result.balance}{" "}
              in your account. When a cheque has nothing behind it, the bank refuses to pay it.
              Nothing has moved, and nothing is charged, but the cheque is used up. Only write a
              cheque when the money is already there.
            </p>
          </>
        ) : result.cheque.status === "paid" ? (
          <OmarSays>
            "Cheque {result.cheque.number} for ${result.cheque.amount} is paid to {result.cheque.to}
            . Your balance is now ${result.balance}. It's in your passbook under the cheque number."
          </OmarSays>
        ) : (
          <>
            <OmarSays>
              "Cheque {result.cheque.number}, ${result.cheque.amount}, paid to you. Here's your
              cash. Your balance is now ${result.balance}."
            </OmarSays>
            <p className="mt-3 text-xs text-muted">
              Writing a cheque to "Self" is a way to take cash out of your own account at the
              counter.
            </p>
          </>
        )}
        <div className="mt-5 flex justify-end">
          <button autoFocus className={primary} onClick={onClose}>
            Thank you, Omar
          </button>
        </div>
      </Modal>
    );
  }

  const submit = async () => {
    setError(null);
    const found = checkCheque(v, { today, signature: account.signature, toSelf });
    setIssues(found);
    if (found.length) {
      audio.play("ui_error");
      return;
    }
    try {
      const res = await writeCheque({
        payee: payeeId,
        amount: chequeAmount(v),
        words: v.words.trim(),
        date: v.date,
        signature: v.signature.trim(),
        crossed: v.crossed,
        idempotencyKey: key,
      });
      audio.play(res.bounced ? "ui_error" : "ui_confirm");
      finishTicket();
      setResult(res);
    } catch (e) {
      const p = formProblem(e);
      if (p) setIssues([{ field: p.field as ChequeField, message: p.message }]);
      else setError(errorText(e));
      audio.play("ui_error");
    }
  };

  return (
    <Modal onClose={onClose} width="lg">
      <OmarSays>
        "Who's it to? 'Self' to take cash out here, or a business in the city. You have{" "}
        {account.chequeLeaves} cheques left, and ${account.balance} in your account."
      </OmarSays>
      <label className="mt-3 block">
        <span className="text-xs uppercase tracking-widest text-muted">Pay</span>
        <select
          className={`${inputDark} mt-1`}
          value={payeeId}
          onChange={(e) => setPayeeId(e.target.value)}
        >
          <option value="self">Self (cash at the counter)</option>
          {payees.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>
      <div className="mt-4">
        <ChequeArt
          c={{
            number,
            date: v.date,
            payee: payeeName,
            amount: v.amount,
            words: v.words,
            signature: v.signature,
            crossed: v.crossed,
            bearerStruck: false,
            accountNumber: account.accountNumber,
          }}
        />
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Box label="Date" issue={issueFor("date")}>
          <input
            type="date"
            value={v.date}
            onChange={(e) => set("date", e.target.value)}
            className={inputDark}
          />
        </Box>
        <Box label="Amount ($)" issue={issueFor("amount")}>
          <input
            value={v.amount}
            inputMode="numeric"
            onChange={(e) => set("amount", e.target.value)}
            className={inputDark}
          />
        </Box>
        <Box label="Amount in words" issue={issueFor("words")}>
          <input
            value={v.words}
            placeholder="e.g. One hundred dollars only"
            onChange={(e) => set("words", e.target.value)}
            className={inputDark}
          />
        </Box>
        <Box label="Signature" issue={issueFor("signature")}>
          <input
            value={v.signature}
            onChange={(e) => set("signature", e.target.value)}
            className={`${inputDark} text-lg`}
            style={{ fontFamily: SIGNATURE_FONT }}
          />
        </Box>
      </div>
      <Box label="Crossing" issue={issueFor("crossed")}>
        <label className="flex items-center gap-2 text-sm text-text">
          <input
            type="checkbox"
            checked={v.crossed}
            onChange={(e) => set("crossed", e.target.checked)}
          />
          Draw two lines across the corner (A/C payee only)
        </label>
      </Box>
      {error && <p className="mt-2 text-sm text-red-300">{error}</p>}
      <div className="mt-5 flex justify-end gap-2">
        <button className={secondary} onClick={onClose}>
          Not now
        </button>
        <button className={primary} disabled={busy} onClick={submit}>
          {busy ? "Omar is checking…" : "Hand the cheque to Omar"}
        </button>
      </div>
    </Modal>
  );
}

const inputDark =
  "w-full rounded-lg border border-line/70 bg-surface-2/70 px-3 py-2 text-sm text-text outline-none focus:border-gold/70";

function Box({
  label,
  issue,
  children,
}: {
  label: string;
  issue?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="mt-1 block">
      <span className="text-xs uppercase tracking-widest text-muted">{label}</span>
      <div
        className={
          issue ? "mt-1 rounded-lg ring-2 ring-gold/70 ring-offset-2 ring-offset-surface" : "mt-1"
        }
      >
        {children}
      </div>
      {issue && <span className="mt-1 block text-xs leading-relaxed text-gold">✎ {issue}</span>}
    </label>
  );
}

// ── A cheque book ────────────────────────────────────────────────────────────

export function ChequeBookRequest({ onClose }: { onClose: () => void }) {
  const account = useBankStore((s) => s.account);
  const busy = useBankStore((s) => s.busy);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!account) return null;
  return (
    <Modal onClose={onClose} width="sm">
      {done ? (
        <OmarSays>
          "Here's your cheque book: ten cheques, numbered, with your account number printed on every
          one. Keep it somewhere safe, and never sign a cheque until you've filled it in."
        </OmarSays>
      ) : (
        <OmarSays>
          {account.chequeLeaves > 0
            ? `"You still have ${account.chequeLeaves} cheques in your book."`
            : `"You don't have a cheque book yet. Shall I give you one? Ten cheques, free of charge."`}
        </OmarSays>
      )}
      {error && <p className="mt-2 text-sm text-red-300">{error}</p>}
      <div className="mt-5 flex justify-end gap-2">
        {!done && account.chequeLeaves <= 0 ? (
          <>
            <button className={secondary} onClick={onClose}>
              Not now
            </button>
            <button
              className={primary}
              disabled={busy}
              onClick={async () => {
                try {
                  await issueChequeBook();
                  audio.play("ui_confirm");
                  setDone(true);
                } catch (e) {
                  setError(errorText(e));
                }
              }}
            >
              Yes, please
            </button>
          </>
        ) : (
          <button autoFocus className={primary} onClick={onClose}>
            Thank you
          </button>
        )}
      </div>
    </Modal>
  );
}

// ── Spot the bad cheque ──────────────────────────────────────────────────────

export function SpotTheCheque({ onClose }: { onClose: () => void }) {
  const cheques = useMemo(() => practiceCheques(new Date(), activeTrack() === "SCB"), []);
  const [i, setI] = useState(0);
  const [marked, setMarked] = useState<ChequeFault[]>([]);
  const [checked, setChecked] = useState<boolean | null>(null);
  const [score, setScore] = useState(0);
  const finished = i >= cheques.length;

  if (finished) {
    return (
      <Modal onClose={onClose} width="md">
        <OmarSays>
          {score === cheques.length
            ? `"All ${cheques.length}, right. You'd make a good teller."`
            : `"${score} of ${cheques.length}. The ones that catch people are the small things: a date, a missing signature."`}
        </OmarSays>
        <p className="mt-3 text-xs text-muted">
          Before the bank pays a cheque it checks: the date, the payee, that the words and figures
          match, and the signature.
        </p>
        <div className="mt-5 flex justify-end">
          <button autoFocus className={primary} onClick={onClose}>
            Done
          </button>
        </div>
      </Modal>
    );
  }

  const c: PracticeCheque = cheques[i];
  const toggle = (f: ChequeFault) => {
    if (checked !== null) return;
    setMarked((m) => (m.includes(f) ? m.filter((x) => x !== f) : [...m, f]));
  };
  const decide = () => {
    const ok = judged(c, marked);
    setChecked(ok);
    if (ok) setScore((s) => s + 1);
    audio.play(ok ? "ui_confirm" : "ui_error");
  };
  const next = () => {
    setI(i + 1);
    setMarked([]);
    setChecked(null);
  };

  return (
    <Modal onClose={onClose} width="lg">
      <OmarSays>
        "These came in today. Can the bank pay this one? Mark anything wrong with it, or nothing if
        it's fine." ({i + 1} of {cheques.length})
      </OmarSays>
      <div className="mt-4">
        <ChequeArt
          c={{
            bank: "CITY SAVINGS BANK",
            number: `00${300 + i}`,
            date: c.date,
            payee: c.payee,
            amount: String(c.amount),
            words: c.words,
            signature: c.signature,
            crossed: false,
            bearerStruck: c.bearerStruck,
            from: c.from,
          }}
        />
      </div>
      <p className="mt-2 text-xs text-muted">Today is {new Date().toLocaleDateString()}.</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {(Object.keys(FAULTS) as ChequeFault[]).map((f) => {
          const on = marked.includes(f);
          const isFault = c.faults.includes(f);
          const tone =
            checked === null
              ? on
                ? "border-gold bg-gold/10 text-text"
                : "border-line/70 text-muted hover:text-text"
              : isFault
                ? "border-green-400/70 bg-green-400/10 text-text"
                : on
                  ? "border-red-400/70 bg-red-400/10 text-text"
                  : "border-line/40 text-muted/60";
          return (
            <button
              key={f}
              onClick={() => toggle(f)}
              aria-pressed={on}
              className={`rounded-xl border px-3 py-2 text-left text-sm ${tone}`}
            >
              {FAULTS[f].label}
            </button>
          );
        })}
      </div>
      {checked !== null && (
        <div className="mt-3 rounded-xl border border-line/60 bg-surface-2/60 p-3 text-sm leading-relaxed text-text">
          <p className="font-semibold">{checked ? "Right." : "Not quite."}</p>
          {c.faults.length === 0 ? (
            <p className="mt-1 text-muted">
              This one is fine: dated today, signed, and the words match the figures. The bank pays
              it.
            </p>
          ) : (
            c.faults.map((f) => (
              <p key={f} className="mt-1 text-muted">
                <span className="text-text">{FAULTS[f].label}.</span> {FAULTS[f].why}
              </p>
            ))
          )}
        </div>
      )}
      <div className="mt-5 flex justify-end gap-2">
        {checked === null ? (
          <button className={primary} onClick={decide}>
            {marked.length === 0 ? "It's fine: pay it" : "Refuse it"}
          </button>
        ) : (
          <button autoFocus className={primary} onClick={next}>
            {i + 1 < cheques.length ? "Next cheque" : "Finish"}
          </button>
        )}
      </div>
    </Modal>
  );
}
