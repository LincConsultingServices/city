// Paying from the bank at Daniel's desk: transfers to the city's businesses,
// and salaries paid straight into the account.
//
// A transfer is the moment a wrong digit costs real money, so the lesson is
// built into the steps: type the number (or pick from the directory), and the
// bank tells you whose account it is BEFORE anything moves. You confirm the
// name, then the amount. Nothing is ever charged on top.
import { useMemo, useState } from "react";
import { Modal } from "@/ui/Modal";
import { Portrait } from "@/ui/Portrait";
import { audio } from "@/framework/audio/audioManager";
import { api, ApiError } from "@/framework/api";
import type { BankTransfer, Payee } from "@/framework/api";
import { usePayees } from "./usePayees";
import { formProblem, newKey, setSalaryToAccount, transfer, useBankStore } from "@/framework/bank/bankStore";
import { BANK_CAST } from "@/ui/characters";

const primary = "rounded-full bg-gold px-5 py-2 text-sm font-semibold text-ink hover:brightness-110 disabled:opacity-60";
const secondary = "rounded-full border border-line/70 px-4 py-2 text-sm text-muted hover:border-gold/60 hover:text-text";
const input = "w-full rounded-lg border border-line/70 bg-surface-2/70 px-3 py-2 text-sm text-text outline-none focus:border-gold/70";

function DanielSays({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <Portrait look={BANK_CAST.daniel.look} artId="bank_daniel" className="h-14 w-auto shrink-0" />
      <p className="text-sm leading-relaxed text-text">{children}</p>
    </div>
  );
}

type Step = "who" | "confirm" | "how_much" | "done";

export function TransferMoney({ onClose }: { onClose: () => void }) {
  const account = useBankStore((s) => s.account);
  const busy = useBankStore((s) => s.busy);
  const payees = usePayees();
  const key = useMemo(newKey, []);
  const [step, setStep] = useState<Step>("who");
  const [number, setNumber] = useState("");
  const [payee, setPayee] = useState<Payee | null>(null);
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const [done, setDone] = useState<BankTransfer | null>(null);

  if (!account) return null;

  const lookUp = async () => {
    setNote(null);
    const n = number.replace(/\s/g, "");
    if (!/^\d{10}$/.test(n)) {
      setNote("An account number is ten digits.");
      return;
    }
    try {
      const r = await api.bankLookupPayee(n);
      setPayee(r.payee);
      setStep("confirm");
      audio.play("ui_click");
    } catch (e) {
      setNote(
        e instanceof ApiError && e.code === "NO_SUCH_PAYEE"
          ? "There's no account with that number. Check every digit: one wrong digit and the money could go to a stranger."
          : "The bank couldn't check that number just now. Try again.",
      );
      audio.play("ui_error");
    }
  };

  const send = async () => {
    setNote(null);
    const n = Math.floor(Number(amount) || 0);
    if (n <= 0) {
      setNote("How much would you like to send?");
      return;
    }
    if (n > account.balance) {
      setNote(`There's $${account.balance} in your account.`);
      return;
    }
    try {
      const res = await transfer(payee!.accountNumber, n, reference, key);
      audio.play("ui_confirm");
      setDone(res);
      setStep("done");
    } catch (e) {
      setNote(formProblem(e)?.message ?? (e instanceof Error ? e.message : "Something went wrong."));
      audio.play("ui_error");
    }
  };

  return (
    <Modal onClose={onClose} width="md">
      {step === "who" && (
        <>
          <DanielSays>
            "Sending money? Tell me the account number. If you don't know it, the directory has every business in the
            city."
          </DanielSays>
          <label className="mt-4 block">
            <span className="text-xs uppercase tracking-widest text-muted">Their account number</span>
            <div className="mt-1 flex gap-2">
              <input className={`${input} font-mono tracking-widest`} inputMode="numeric" value={number} onChange={(e) => setNumber(e.target.value)} />
              <button className={primary} onClick={lookUp}>
                Check
              </button>
            </div>
          </label>
          {note && <p className="mt-2 text-xs leading-relaxed text-gold">✎ {note}</p>}
          <p className="mt-4 text-xs uppercase tracking-widest text-muted">Directory</p>
          <ul className="mt-2 max-h-56 space-y-1 overflow-y-auto">
            {payees.map((p) => (
              <li key={p.id}>
                <button
                  onClick={() => setNumber(p.accountNumber)}
                  className="flex w-full items-baseline justify-between gap-3 rounded-lg px-3 py-1.5 text-left text-sm hover:bg-surface-2"
                >
                  <span className="text-text">
                    {p.name} <span className="text-xs text-muted">· {p.kind}</span>
                  </span>
                  <span className="font-mono text-xs text-muted">{p.accountNumber}</span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      {step === "confirm" && payee && (
        <>
          <DanielSays>"Before anything moves, check whose account this is."</DanielSays>
          <div className="mt-4 rounded-xl border border-gold/50 bg-gold/10 p-4">
            <p className="text-xs uppercase tracking-widest text-muted">Account {payee.accountNumber} belongs to</p>
            <p className="mt-1 font-display text-xl text-text">{payee.name}</p>
            <p className="text-xs text-muted">{payee.about}</p>
          </div>
          <p className="mt-3 text-xs text-muted">
            If that isn't who you meant, go back and check the number. Money sent to the wrong account is very hard to
            get back.
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <button className={secondary} onClick={() => setStep("who")}>
              That's not right
            </button>
            <button autoFocus className={primary} onClick={() => setStep("how_much")}>
              Yes, that's who I mean
            </button>
          </div>
        </>
      )}

      {step === "how_much" && payee && (
        <>
          <DanielSays>
            "How much to {payee.name}? You have ${account.balance} in your account. Add a reference so you'll know
            later what it was for."
          </DanielSays>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs uppercase tracking-widest text-muted">Amount ($)</span>
              <input className={`${input} mt-1`} inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))} />
            </label>
            <label className="block">
              <span className="text-xs uppercase tracking-widest text-muted">Reference</span>
              <input className={`${input} mt-1`} maxLength={40} placeholder="e.g. Water bill" value={reference} onChange={(e) => setReference(e.target.value)} />
            </label>
          </div>
          {note && <p className="mt-2 text-xs text-gold">✎ {note}</p>}
          <div className="mt-5 flex justify-end gap-2">
            <button className={secondary} onClick={() => setStep("confirm")}>
              Back
            </button>
            <button className={primary} disabled={busy} onClick={send}>
              {busy ? "Sending…" : `Send $${Math.floor(Number(amount) || 0)}`}
            </button>
          </div>
        </>
      )}

      {step === "done" && done && (
        <>
          <DanielSays>
            "Sent: ${-done.line.amount} to {done.payee.name}. Your balance is now ${done.balance}. It's in your passbook
            as '{done.line.note}'."
          </DanielSays>
          <div className="mt-5 flex justify-end">
            <button autoFocus className={primary} onClick={onClose}>
              Thank you, Daniel
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}

export function SalarySetting({ onClose }: { onClose: () => void }) {
  const account = useBankStore((s) => s.account);
  const busy = useBankStore((s) => s.busy);
  const [error, setError] = useState<string | null>(null);
  if (!account) return null;
  const on = account.salaryToAccount;

  return (
    <Modal onClose={onClose} width="sm">
      <DanielSays>
        {on
          ? `"Your salary is paid straight into your account, number ${account.accountNumber}. It's safe there from the moment it's paid, and it starts earning interest the same day."`
          : `"At the moment your salary is paid to you in cash. You can have it paid straight into your account instead: it's safe there from the moment it's paid, and it earns interest. It's your choice."`}
      </DanielSays>
      {error && <p className="mt-2 text-sm text-red-300">{error}</p>}
      <div className="mt-5 flex justify-end gap-2">
        <button className={secondary} onClick={onClose}>
          Leave it as it is
        </button>
        <button
          className={primary}
          disabled={busy}
          onClick={async () => {
            try {
              await setSalaryToAccount(!on);
              audio.play("ui_confirm");
              onClose();
            } catch (e) {
              setError(e instanceof Error ? e.message : "Something went wrong.");
            }
          }}
        >
          {on ? "Pay my salary in cash" : "Pay my salary into my account"}
        </button>
      </div>
    </Modal>
  );
}
