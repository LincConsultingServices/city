// The passbook: your account on paper (docs/PRD_Building_Bank.md §7.6).
//
// The first page is who you are to the bank — your name, account number, type
// and card. The rest is the statement: every dollar in and out, newest first,
// with the balance after each line, which is how a player learns to read one.
// Interest is gold, because it is the bank paying you.
import { Modal } from "@/ui/Modal";
import { audio } from "@/framework/audio/audioManager";
import {
  activeLoan,
  closeAccount,
  inDeposits,
  unprinted,
  useBankStore,
} from "@/framework/bank/bankStore";
import type { StatementLine } from "@/framework/api";
import { BankCardArt } from "./AccountOpening";
import { useState } from "react";

const KIND: Record<string, string> = {
  open: "Account opened",
  deposit: "Cash deposit",
  withdrawal: "Cash withdrawal",
  interest: "Interest",
  cheque_in: "Cheque paid in",
  deposit_open: "Deposit opened",
  instalment: "Recurring deposit instalment",
  deposit_payout: "Deposit paid out",
  transfer: "Transfer",
  card: "Card payment",
  salary: "Salary",
  loan: "Loan",
  loan_payment: "Loan instalment",
  cheque_out: "Cheque",
  close: "Account closed",
};

const CHANNEL: Record<string, string> = {
  counter: "at the counter",
  atm: "at the ATM",
  card: "by card",
  bank: "",
};

function when(at: string): string {
  const d = new Date(at);
  if (Number.isNaN(d.getTime())) return "";
  return (
    d.toLocaleDateString(undefined, { day: "numeric", month: "short" }) +
    " " +
    d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
  );
}

function describe(l: StatementLine): string {
  if (l.kind !== "deposit" && l.kind !== "withdrawal" && l.kind !== "open")
    return l.note || KIND[l.kind] || l.kind;
  const what = KIND[l.kind] ?? l.note ?? l.kind;
  const where = CHANNEL[l.channel] ?? "";
  return where ? `${what} ${where}` : what;
}

export function Passbook({ onClose }: { onClose: () => void }) {
  const account = useBankStore((s) => s.account);
  const statement = useBankStore((s) => s.statement);
  const rules = useBankStore((s) => s.rules);
  const deposits = useBankStore((s) => s.deposits);
  const loans = useBankStore((s) => s.loans);
  const credit = useBankStore((s) => s.credit);
  if (!account) return null;
  const locked = inDeposits(deposits);
  const owed = activeLoan(loans)?.outstanding ?? 0;

  const interestBp = rules?.products[account.type]?.interestBp ?? 0;
  // The book holds what has been printed; anything since is waiting at the printer.
  const waiting = unprinted(account, statement);
  const waitingIds = new Set(waiting.map((l) => l.id));
  const inBook = statement.filter((l) => !waitingIds.has(l.id));
  const next = rules?.nextMonthAt ? new Date(rules.nextMonthAt) : null;

  return (
    <Modal onClose={onClose} width="lg">
      <div className="grid gap-5 md:grid-cols-[1fr_auto]">
        <div className="rounded-2xl border border-gold/40 bg-[#1f2d4d] p-5 text-white">
          <p className="text-[11px] uppercase tracking-widest text-[#e5c77a]">
            Meridian Bank · Passbook
          </p>
          <p className="mt-2 font-display text-xl">{account.holder}</p>
          <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 text-sm">
            <dt className="opacity-70">Account no.</dt>
            <dd className="font-mono tabular-nums">{account.accountNumber}</dd>
            <dt className="opacity-70">Type</dt>
            <dd className="capitalize">
              {account.type}
              {interestBp > 0 ? ` · ${interestBp / 100}% a month` : " · no interest"}
            </dd>
            <dt className="opacity-70">Balance</dt>
            <dd className="text-lg font-semibold tabular-nums text-[#e5c77a]">
              ${account.balance}
            </dd>
            {credit && (
              <>
                <dt className="opacity-70">Credit score</dt>
                <dd className="tabular-nums">
                  {credit.score} · {credit.band.name}
                </dd>
              </>
            )}
            {owed > 0 && (
              <>
                <dt className="opacity-70">Loan owed</dt>
                <dd className="tabular-nums">${owed}</dd>
              </>
            )}
            {locked > 0 && (
              <>
                <dt className="opacity-70">In deposits</dt>
                <dd className="tabular-nums">${locked}</dd>
              </>
            )}
          </dl>
          {interestBp > 0 && next && (
            <p className="mt-3 text-xs opacity-75">
              Next interest: {when(next.toISOString())}
              {account.balance < 100
                ? " · balances under $100 earn less than a dollar, which rounds to nothing"
                : ""}
            </p>
          )}
        </div>
        {account.cardLast4 && (
          <div className="w-64">
            <BankCardArt
              holder={account.holder}
              last4={account.cardLast4}
              expiry={account.cardExpiry ?? ""}
            />
          </div>
        )}
      </div>

      <h3 className="mt-5 text-xs uppercase tracking-widest text-muted">Statement</h3>
      <div className="mt-2 max-h-72 overflow-y-auto rounded-xl border border-line/60">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-surface text-left text-xs uppercase tracking-widest text-muted">
            <tr>
              <th className="px-3 py-2 font-medium">Date</th>
              <th className="px-3 py-2 font-medium">Details</th>
              <th className="px-3 py-2 text-right font-medium">In</th>
              <th className="px-3 py-2 text-right font-medium">Out</th>
              <th className="px-3 py-2 text-right font-medium">Balance</th>
            </tr>
          </thead>
          <tbody>
            {inBook.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-4 text-center text-xs text-muted">
                  Nothing printed yet.
                </td>
              </tr>
            )}
            {inBook.map((l) => (
              <tr key={l.id} className="border-t border-line/50">
                <td className="whitespace-nowrap px-3 py-2 text-xs text-muted">{when(l.at)}</td>
                <td className={`px-3 py-2 ${l.kind === "interest" ? "text-gold" : "text-text"}`}>
                  {describe(l)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-text">
                  {l.amount > 0 ? `$${l.amount}` : ""}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-text">
                  {l.amount < 0 ? `$${-l.amount}` : ""}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-muted">${l.balanceAfter}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {waiting.length > 0 && (
        <p className="mt-2 rounded-lg border border-gold/40 bg-gold/10 px-3 py-2 text-xs text-text">
          {waiting.length} new {waiting.length === 1 ? "entry isn't" : "entries aren't"} printed in
          your passbook yet. Use the passbook printer by the wall, or take a B ticket for window 2.
        </p>
      )}
      <p className="mt-2 text-xs text-muted">
        Read it from the bottom up: each line's balance is the one before it, plus what came in,
        minus what went out.
      </p>

      <div className="mt-4 flex justify-end">
        <button
          autoFocus
          onClick={() => {
            audio.play("ui_close");
            onClose();
          }}
          className="rounded-full bg-gold px-5 py-2 text-sm font-semibold text-ink hover:brightness-110"
        >
          Close the passbook
        </button>
      </div>
    </Modal>
  );
}

/** Closing the account: confirm, then the balance comes back as cash. */
export function CloseAccount({ onClose }: { onClose: () => void }) {
  const account = useBankStore((s) => s.account);
  const busy = useBankStore((s) => s.busy);
  const [returned, setReturned] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (returned !== null) {
    return (
      <Modal onClose={onClose} width="sm">
        <h2 className="font-display text-xl font-semibold text-gold">Account closed</h2>
        <p className="mt-3 text-sm leading-relaxed text-text">
          "Done. ${returned} has been paid out to you in cash. You're welcome back any time. Opening
          a new account takes five minutes."
        </p>
        <div className="mt-5 flex justify-end">
          <button
            autoFocus
            onClick={onClose}
            className="rounded-full bg-gold px-5 py-2 text-sm font-semibold text-ink"
          >
            Thank you
          </button>
        </div>
      </Modal>
    );
  }
  if (!account) return null;

  if (account.activeLoan) {
    return (
      <Modal onClose={onClose} width="sm">
        <h2 className="font-display text-xl font-semibold text-gold">Close your account?</h2>
        <p className="mt-3 text-sm leading-relaxed text-text">
          "Not while you have a loan with us, I'm afraid. Repay it first at Sofia's desk, then I can
          close the account and pay the rest out to you."
        </p>
        <div className="mt-5 flex justify-end">
          <button
            autoFocus
            onClick={onClose}
            className="rounded-full bg-gold px-5 py-2 text-sm font-semibold text-ink"
          >
            I understand
          </button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal onClose={onClose} width="sm">
      <h2 className="font-display text-xl font-semibold text-gold">Close your account?</h2>
      <p className="mt-3 text-sm leading-relaxed text-text">
        "If you close it, I'll pay the whole balance, ${account.balance}, out to you in cash. Your
        card stops working and your statement is cleared. Cash in your pocket doesn't earn
        interest."
      </p>
      {error && <p className="mt-2 text-sm text-red-300">{error}</p>}
      <div className="mt-5 flex justify-end gap-2">
        <button
          autoFocus
          onClick={onClose}
          className="rounded-full border border-line/70 px-4 py-2 text-sm text-muted hover:text-text"
        >
          Keep my account
        </button>
        <button
          disabled={busy}
          onClick={async () => {
            try {
              setReturned(await closeAccount());
              audio.play("ui_close");
            } catch (e) {
              setError(e instanceof Error ? e.message : "Something went wrong.");
            }
          }}
          className="rounded-full bg-red-400/90 px-4 py-2 text-sm font-semibold text-ink hover:brightness-110 disabled:opacity-60"
        >
          {busy ? "Closing…" : "Close the account"}
        </button>
      </div>
    </Modal>
  );
}
