// The counter and the machines (docs/PRD_Building_Bank.md §7.3): the ticket
// machine, the deposit and withdrawal slips at window 1, the passbook printer,
// and the ATM.
//
// Every one of them moves real money through the server and teaches by doing:
// a slip with a wrong account number comes back with Mei's note on it; the
// printer prints your new lines one at a time so you watch the balance build;
// the ATM asks for your PIN and covers the keypad. Nothing here ever charges.
import { useMemo, useState } from "react";
import { Modal } from "@/ui/Modal";
import { Portrait } from "@/ui/Portrait";
import { audio } from "@/framework/audio/audioManager";
import { activeTrack } from "@/framework/city/track";
import { useEconomyStore } from "@/framework/economy/economyStore";
import {
  deposit,
  newKey,
  printPassbook,
  unprinted,
  useBankStore,
  withdraw,
} from "@/framework/bank/bankStore";
import type { StatementLine } from "@/framework/api";
import { BANK_CAST } from "@/ui/characters";
import { finishTicket, takeTicket, type TicketService } from "./roomStore";
import {
  NOTES,
  checkSlip,
  emptySlip,
  notesTotal,
  slipAmount,
  type Note,
  type SlipField,
  type SlipIssue,
  type SlipKind,
  type SlipValues,
} from "./slip";
import { amountInWords } from "./words";

const SIGNATURE_FONT = '"Segoe Script", "Brush Script MT", "Snell Roundhand", cursive';
const primary =
  "rounded-full bg-gold px-5 py-2 text-sm font-semibold text-ink hover:brightness-110 disabled:opacity-60";
const secondary =
  "rounded-full border border-line/70 px-4 py-2 text-sm text-muted hover:border-gold/60 hover:text-text";

/** Today, as a date input writes it. */
function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function errorText(e: unknown): string {
  return e instanceof Error ? e.message : "Something went wrong. Try again.";
}

// ── The ticket machine ───────────────────────────────────────────────────────

export function TicketMachine({ onClose }: { onClose: () => void }) {
  const pick = (service: TicketService) => {
    audio.play("ui_click");
    takeTicket(service);
    onClose();
  };
  return (
    <Modal onClose={onClose} width="sm">
      <h2 className="font-display text-xl font-semibold text-gold">Take a ticket</h2>
      <p className="mt-1 text-sm text-muted">
        What have you come in for? Your number will be called to the right window.
      </p>
      <div className="mt-4 grid gap-2">
        <button
          onClick={() => pick("cash")}
          className="rounded-xl border border-line/70 p-4 text-left hover:border-gold/60"
        >
          <p className="font-semibold text-text">A · Cash</p>
          <p className="text-xs text-muted">Deposits and withdrawals, at window 1</p>
        </button>
        <button
          onClick={() => pick("desk")}
          className="rounded-xl border border-line/70 p-4 text-left hover:border-gold/60"
        >
          <p className="font-semibold text-text">B · Cheques &amp; passbooks</p>
          <p className="text-xs text-muted">
            Cheques, and bringing your passbook up to date, at window 2
          </p>
        </button>
      </div>
    </Modal>
  );
}

// ── Slips at window 1 ────────────────────────────────────────────────────────

export function Slip({ kind, onClose }: { kind: SlipKind; onClose: () => void }) {
  const account = useBankStore((s) => s.account);
  const busy = useBankStore((s) => s.busy);
  const cash = useEconomyStore((s) => s.coinBalance) ?? 0;
  const date = useMemo(today, []);
  // One key per slip: if the request is retried, the money still moves once.
  const key = useMemo(newKey, []);
  const [v, setV] = useState<SlipValues>(() => emptySlip(""));
  const [issues, setIssues] = useState<SlipIssue[] | null>(null);
  const [done, setDone] = useState<StatementLine | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Level A: the slip adds up the notes for you.
  const autoTotal = activeTrack() !== "SCB";

  if (!account) return null;
  const ctx = {
    kind,
    today: date,
    accountNumber: account.accountNumber,
    holder: account.holder,
    signature: account.signature,
    available: kind === "deposit" ? cash : account.balance,
    autoTotal,
  };
  const issueFor = (f: SlipField) => issues?.find((i) => i.field === f)?.message;
  const set = <K extends keyof SlipValues>(k: K, val: SlipValues[K]) =>
    setV((x) => ({ ...x, [k]: val }));
  const counted = notesTotal(v.notes);

  if (done) {
    return (
      <Modal onClose={onClose} width="md">
        <MeiSays>
          {kind === "deposit"
            ? `"That's $${done.amount} paid in. Your balance is now $${done.balanceAfter}. It'll be in your passbook next time you print it, and it starts earning interest from today."`
            : `"Here you are: $${-done.amount}, counted out. Your balance is now $${done.balanceAfter}."`}
        </MeiSays>
        <p className="mt-3 text-xs text-muted">
          {kind === "deposit"
            ? "Cash in your pocket can be lost and never grows. Money in your account is safe, recorded, and earns interest."
            : "Money you take out stops earning interest. Keep what you need in your pocket and leave the rest working."}
        </p>
        <div className="mt-5 flex justify-end">
          <button autoFocus className={primary} onClick={onClose}>
            Thank you, Mei
          </button>
        </div>
      </Modal>
    );
  }

  const submit = async () => {
    setError(null);
    const found = checkSlip({ ...v }, ctx);
    setIssues(found);
    if (found.length > 0) {
      audio.play("ui_error");
      return;
    }
    const amount = slipAmount(v, ctx);
    try {
      const line = kind === "deposit" ? await deposit(amount, key) : await withdraw(amount, key);
      audio.play("ui_confirm");
      finishTicket();
      setDone(line);
    } catch (e) {
      setError(errorText(e));
      audio.play("ui_error");
    }
  };

  return (
    <Modal onClose={onClose} width="lg">
      <MeiSays>
        {kind === "deposit"
          ? `"Paying in? Fill in a deposit slip and count your notes into the table. You have $${cash} in cash."`
          : `"Taking some out? Fill in a withdrawal slip. There's $${account.balance} in your account."`}
      </MeiSays>

      <div className="mt-4 rounded-2xl border border-[#c9a24a]/50 bg-[#f3efe6] p-4 text-[#22252c] shadow-inner">
        <div className="flex items-baseline justify-between border-b border-[#22252c]/20 pb-2">
          <p className="font-display text-lg font-semibold">
            MERIDIAN BANK · {kind === "deposit" ? "Deposit slip" : "Withdrawal slip"}
          </p>
          <label className="text-xs">
            Date{" "}
            <input
              type="date"
              value={v.date}
              onChange={(e) => set("date", e.target.value)}
              className={paper}
            />
          </label>
        </div>
        {issueFor("date") && <Note text={issueFor("date")!} />}

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <PaperField label="Account number" issue={issueFor("accountNumber")}>
            <input
              value={v.accountNumber}
              inputMode="numeric"
              onChange={(e) => set("accountNumber", e.target.value)}
              className={`${paper} w-full font-mono tracking-widest`}
            />
          </PaperField>
          <PaperField label="Name" issue={issueFor("name")}>
            <input
              value={v.name}
              onChange={(e) => set("name", e.target.value)}
              className={`${paper} w-full`}
            />
          </PaperField>
        </div>

        {kind === "deposit" && (
          <PaperField label="Notes" issue={issueFor("notes")}>
            <table className="mt-1 w-full text-sm">
              <tbody>
                {NOTES.map((n) => (
                  <tr key={n} className="border-b border-[#22252c]/10">
                    <td className="py-1 font-semibold">${n}</td>
                    <td className="py-1 text-center">×</td>
                    <td className="py-1">
                      <input
                        type="number"
                        min={0}
                        value={v.notes[n] || ""}
                        onChange={(e) =>
                          set("notes", {
                            ...v.notes,
                            [n]: Math.max(0, Math.floor(Number(e.target.value) || 0)),
                          } as Record<Note, number>)
                        }
                        className={`${paper} w-20 text-right`}
                        aria-label={`Number of $${n} notes`}
                      />
                    </td>
                    <td className="py-1 text-right tabular-nums">
                      {v.notes[n] ? `$${n * v.notes[n]}` : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </PaperField>
        )}

        <div className="mt-3 grid gap-3 sm:grid-cols-[10rem_1fr]">
          <PaperField
            label={kind === "deposit" ? "Total ($)" : "Amount ($)"}
            issue={issueFor("amount")}
          >
            {kind === "deposit" && autoTotal ? (
              <p className="mt-1 rounded border border-[#22252c]/20 bg-white/60 px-2 py-1.5 font-mono text-lg tabular-nums">
                {counted}
              </p>
            ) : (
              <input
                value={v.amount}
                inputMode="numeric"
                onChange={(e) => set("amount", e.target.value)}
                className={`${paper} w-full font-mono text-lg`}
              />
            )}
          </PaperField>
          <PaperField label="Amount in words" issue={issueFor("words")}>
            <input
              value={v.words}
              placeholder="e.g. Two hundred and fifty dollars only"
              onChange={(e) => set("words", e.target.value)}
              className={`${paper} w-full`}
            />
          </PaperField>
        </div>

        <PaperField label="Signature" issue={issueFor("signature")}>
          <input
            value={v.signature}
            onChange={(e) => set("signature", e.target.value)}
            className={`${paper} w-full text-xl`}
            style={{ fontFamily: SIGNATURE_FONT }}
          />
        </PaperField>
      </div>

      <p className="mt-2 text-xs text-muted">
        Your account number is on your passbook:{" "}
        <span className="font-mono text-text">{account.accountNumber}</span>.
        {kind === "deposit" &&
          counted > 0 &&
          ` In words, $${counted} is "${amountInWords(counted)}".`}
      </p>
      {issues && issues.length > 0 && (
        <p className="mt-2 rounded-xl border border-gold/40 bg-gold/10 p-3 text-sm text-text">
          Mei slides the slip back: "Nearly. I've marked{" "}
          {issues.length === 1 ? "one thing" : `${issues.length} things`}."
        </p>
      )}
      {error && <p className="mt-2 text-sm text-red-300">{error}</p>}
      <div className="mt-4 flex justify-end gap-2">
        <button className={secondary} onClick={onClose}>
          Not now
        </button>
        <button className={primary} disabled={busy} onClick={submit}>
          {busy ? "Mei is counting…" : "Hand the slip to Mei"}
        </button>
      </div>
    </Modal>
  );
}

const paper =
  "rounded border border-[#22252c]/25 bg-white/70 px-2 py-1 text-sm text-[#22252c] outline-none focus:border-[#c9a24a]";

function PaperField({
  label,
  issue,
  children,
}: {
  label: string;
  issue?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-2 block">
      <span className="text-[11px] uppercase tracking-widest text-[#22252c]/70">{label}</span>
      <div
        className={
          issue ? "mt-1 rounded ring-2 ring-[#c9a24a] ring-offset-2 ring-offset-[#f3efe6]" : "mt-1"
        }
      >
        {children}
      </div>
      {issue && <Note text={issue} />}
    </div>
  );
}

function Note({ text }: { text: string }) {
  return <p className="mt-1 text-xs italic leading-relaxed text-[#8a5a12]">✎ {text}</p>;
}

function MeiSays({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <Portrait look={BANK_CAST.mei.look} artId="bank_mei" className="h-14 w-auto shrink-0" />
      <p className="text-sm leading-relaxed text-text">{children}</p>
    </div>
  );
}

// ── The passbook printer (and window 2) ──────────────────────────────────────

export function PassbookPrinter({
  onClose,
  atWindow = false,
}: {
  onClose: () => void;
  atWindow?: boolean;
}) {
  const account = useBankStore((s) => s.account);
  const statement = useBankStore((s) => s.statement);
  const busy = useBankStore((s) => s.busy);
  const [printed, setPrinted] = useState<StatementLine[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!account) {
    return (
      <Modal onClose={onClose} width="sm">
        <h2 className="font-display text-xl font-semibold text-gold">Passbook printer</h2>
        <p className="mt-3 text-sm text-text">
          "Insert your passbook, open at the last printed page." You don't have a passbook yet.
          You'll get one when you open an account with Daniel.
        </p>
        <div className="mt-5 flex justify-end">
          <button autoFocus className={primary} onClick={onClose}>
            OK
          </button>
        </div>
      </Modal>
    );
  }

  const waiting = unprinted(account, statement).length;
  const print = async () => {
    setError(null);
    try {
      const lines = await printPassbook();
      audio.play(lines.length ? "ui_confirm" : "ui_click");
      if (atWindow) finishTicket();
      setPrinted(lines);
    } catch (e) {
      setError(errorText(e));
    }
  };

  return (
    <Modal onClose={onClose} width="md">
      <h2 className="font-display text-xl font-semibold text-gold">
        {atWindow ? "Window 2 · Update your passbook" : "Passbook printer"}
      </h2>
      {printed === null ? (
        <>
          <p className="mt-3 text-sm text-text">
            {atWindow
              ? `"Passbook? Pop it on the counter and I'll print it up to date."`
              : "Insert your passbook, open at the last printed page."}
          </p>
          <p className="mt-2 text-sm text-muted">
            {waiting === 0
              ? "Your passbook is already up to date."
              : `${waiting} ${waiting === 1 ? "entry is" : "entries are"} waiting to be printed.`}
          </p>
          {error && <p className="mt-2 text-sm text-red-300">{error}</p>}
          <div className="mt-5 flex justify-end gap-2">
            <button className={secondary} onClick={onClose}>
              Not now
            </button>
            <button autoFocus className={primary} disabled={busy} onClick={print}>
              {busy ? "Printing…" : "Print my passbook"}
            </button>
          </div>
        </>
      ) : (
        <>
          {printed.length === 0 ? (
            <p className="mt-3 text-sm text-text">
              Nothing new to print. Your passbook was already up to date.
            </p>
          ) : (
            <div className="mt-3 rounded-xl border border-[#c9a24a]/50 bg-[#f3efe6] p-3 font-mono text-xs text-[#22252c]">
              {printed.map((l, i) => (
                <div
                  key={l.id}
                  className="grid animate-fade-in grid-cols-[1fr_auto_auto] gap-3 border-b border-[#22252c]/10 py-1"
                  style={{ animationDelay: `${i * 350}ms`, animationFillMode: "backwards" }}
                >
                  <span className="truncate">
                    {l.kind === "interest" ? l.note : l.note || l.kind}
                  </span>
                  <span className={l.amount >= 0 ? "" : "text-[#8a1c2b]"}>
                    {l.amount === 0 ? "" : l.amount > 0 ? `+${l.amount}` : l.amount}
                  </span>
                  <span className="font-semibold">{l.balanceAfter}</span>
                </div>
              ))}
            </div>
          )}
          <p className="mt-3 text-xs text-muted">
            Each line shows what came in or went out, and the balance after it. Check every line: if
            you see something you don't recognise, tell the bank straight away.
          </p>
          <div className="mt-5 flex justify-end">
            <button autoFocus className={primary} onClick={onClose}>
              Done
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}
