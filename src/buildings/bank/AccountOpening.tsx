// Opening an account at Daniel's desk (docs/PRD_Building_Bank.md §7.2).
//
// Three steps, in the order a real branch does them: the form (with your pocket
// open beside it, because copying from your ID is the point), the card and its
// PIN, and the welcome — your passbook and card in your hands, and where to go
// next. A form with mistakes comes back with Daniel's notes on it: the returned
// form is the lesson, so every note says why the box matters.
import { useMemo, useState } from "react";
import { Modal } from "@/ui/Modal";
import { Portrait } from "@/ui/Portrait";
import { audio } from "@/framework/audio/audioManager";
import { currentIdentity } from "@/framework/player/identity";
import { formProblem, issueCard, openAccount, useBankStore } from "@/framework/bank/bankStore";
import { BANK_CAST } from "@/ui/characters";
import { CITY_ADDRESSES, pocketFor, type IdCard } from "./pocket";
import {
  checkAccountForm,
  emptyForm,
  pinProblem,
  toRequest,
  type AccountFormValues,
  type FormField,
  type FormIssue,
} from "./accountForm";

const SIGNATURE_FONT = '"Segoe Script", "Brush Script MT", "Snell Roundhand", cursive';

type Step = "form" | "pin" | "welcome";

export function AccountOpening({ onClose }: { onClose: () => void }) {
  const account = useBankStore((s) => s.account);
  // Coming back to the desk with an account but no card picks up at the card.
  const [step, setStep] = useState<Step>(account ? (account.cardLast4 ? "welcome" : "pin") : "form");

  return (
    <Modal onClose={onClose} width="lg">
      <div className="flex items-center gap-3">
        <Portrait look={BANK_CAST.daniel.look} artId="bank_daniel" className="h-14 w-auto shrink-0" />
        <div>
          <p className="font-display text-lg font-semibold text-gold">New Accounts</p>
          <p className="text-xs uppercase tracking-widest text-muted">
            {step === "form" ? "1 · The form" : step === "pin" ? "2 · Your card" : "3 · Welcome"}
          </p>
        </div>
      </div>
      {step === "form" && <FormStep onDone={() => setStep("pin")} />}
      {step === "pin" && <PinStep onDone={() => setStep("welcome")} />}
      {step === "welcome" && <WelcomeStep onClose={onClose} />}
    </Modal>
  );
}

// ── Step 1: the form ─────────────────────────────────────────────────────────

function FormStep({ onDone }: { onDone: () => void }) {
  const name = currentIdentity()?.name ?? "";
  const pocket = useMemo(() => pocketFor(name), [name]);
  const [form, setForm] = useState<AccountFormValues>(() => emptyForm(pocket.name));
  const [issues, setIssues] = useState<FormIssue[] | null>(null);
  const [looking, setLooking] = useState<IdCard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const busy = useBankStore((s) => s.busy);

  const set = <K extends FormField>(k: K, v: AccountFormValues[K]) => setForm((f) => ({ ...f, [k]: v }));
  const issueFor = (k: FormField) => issues?.find((i) => i.field === k)?.message;

  const submit = async () => {
    setError(null);
    const found = checkAccountForm(form, pocket);
    setIssues(found);
    if (found.length > 0) {
      audio.play("ui_error");
      return;
    }
    try {
      await openAccount(toRequest(form));
      audio.play("ui_open");
      onDone();
    } catch (e) {
      const p = formProblem(e);
      if (p) setIssues([{ field: p.field as FormField, message: p.message }]);
      else setError(e instanceof Error ? e.message : "Something went wrong. Try again.");
      audio.play("ui_error");
    }
  };

  return (
    <div className="mt-4 grid gap-5 md:grid-cols-[15rem_1fr]">
      {/* Your pocket. Click a card to look at it closely. */}
      <aside>
        <p className="text-xs uppercase tracking-widest text-muted">Your pocket</p>
        <ul className="mt-2 space-y-2">
          {pocket.cards.map((c) => (
            <li key={c.id}>
              <button
                onClick={() => setLooking(c)}
                className="w-full rounded-xl border border-white/10 p-3 text-left text-white shadow transition hover:-translate-y-0.5 hover:border-gold/60"
                style={{ background: `linear-gradient(135deg, ${c.colour}, #11151f)` }}
              >
                <p className="text-[11px] uppercase tracking-widest opacity-80">{c.title}</p>
                <p className="mt-1 text-sm font-semibold">{c.name}</p>
                <p className="text-[11px] opacity-80">{c.address}</p>
                <p className="mt-1 text-[11px] font-semibold opacity-90">{c.status}</p>
              </button>
            </li>
          ))}
          <li className="rounded-xl border border-line/60 bg-surface-2/60 p-3">
            <p className="text-[11px] uppercase tracking-widest text-muted">Your phone</p>
            <p className="mt-1 font-mono text-sm tabular-nums text-text">{formatPhone(pocket.phone)}</p>
          </li>
        </ul>
        {looking && (
          <p className="mt-2 rounded-lg bg-surface-2/60 p-2 text-xs text-muted">
            {looking.title}: {looking.status}.{" "}
            <button className="text-gold underline" onClick={() => { set("idDocument", looking.id); setLooking(null); }}>
              Hand this one over
            </button>
          </p>
        )}
      </aside>

      {/* The form. */}
      <div className="space-y-3">
        <p className="text-sm text-muted">
          "Fill this in from your ID and I'll check it. Take your time: everyone gets one box wrong the first time."
        </p>

        <Field label="Full name" issue={issueFor("holder")}>
          <input value={form.holder} onChange={(e) => set("holder", e.target.value)} className={input} />
        </Field>

        <Field label="Address" issue={issueFor("address")}>
          <select value={form.address} onChange={(e) => set("address", e.target.value)} className={input}>
            <option value="">Choose…</option>
            {CITY_ADDRESSES.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Phone number" issue={issueFor("phone")}>
          <input
            value={form.phone}
            inputMode="numeric"
            placeholder="10 digits"
            onChange={(e) => set("phone", e.target.value)}
            className={input}
          />
        </Field>

        <Field label="Proof of identity" issue={issueFor("idDocument")}>
          <div className="flex flex-wrap gap-1.5">
            {pocket.cards.map((c) => (
              <button
                key={c.id}
                type="button"
                aria-pressed={form.idDocument === c.id}
                onClick={() => set("idDocument", c.id)}
                className={`rounded-full border px-3 py-1 text-xs ${
                  form.idDocument === c.id ? "border-gold bg-gold/15 text-text" : "border-line/70 text-muted hover:text-text"
                }`}
              >
                {c.title}
              </button>
            ))}
          </div>
        </Field>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Nominee (optional)" issue={issueFor("nomineeName")}>
            <input value={form.nomineeName} onChange={(e) => set("nomineeName", e.target.value)} className={input} />
          </Field>
          <Field label="Relationship" issue={issueFor("nomineeRelation")}>
            <input
              value={form.nomineeRelation}
              placeholder="parent, sibling, friend…"
              onChange={(e) => set("nomineeRelation", e.target.value)}
              className={input}
            />
          </Field>
        </div>
        <p className="-mt-1 text-[11px] text-muted">
          A nominee is who receives the money if something ever happens to you.
        </p>

        <Field label="Account type" issue={issueFor("type")}>
          <div className="grid gap-2 sm:grid-cols-2">
            <TypeCard
              on={form.type === "savings"}
              onPick={() => set("type", "savings")}
              title="Savings"
              text="For keeping and growing your own money. Pays 1% interest every month, and it compounds."
            />
            <TypeCard
              on={form.type === "current"}
              onPick={() => set("type", "current")}
              title="Current"
              text="For businesses that pay and get paid all day. No limit on transactions, but no interest."
            />
          </div>
        </Field>

        <Field label="Signature" issue={issueFor("signature")}>
          <input
            value={form.signature}
            placeholder="Sign here"
            onChange={(e) => set("signature", e.target.value)}
            className={`${input} text-xl`}
            style={{ fontFamily: SIGNATURE_FONT }}
          />
        </Field>

        {issues && issues.length > 0 && (
          <p className="rounded-xl border border-gold/40 bg-gold/10 p-3 text-sm text-text">
            Daniel hands the form back: "Nearly there. I've marked {issues.length === 1 ? "one box" : `${issues.length} boxes`} for you."
          </p>
        )}
        {error && <p className="text-sm text-red-300">{error}</p>}

        <div className="flex justify-end">
          <button
            onClick={submit}
            disabled={busy}
            className="rounded-full bg-gold px-5 py-2 text-sm font-semibold text-ink hover:brightness-110 disabled:opacity-60"
          >
            {busy ? "Daniel is checking…" : "Hand the form to Daniel"}
          </button>
        </div>
      </div>
    </div>
  );
}

const input =
  "w-full rounded-lg border border-line/70 bg-surface-2/70 px-3 py-2 text-sm text-text outline-none focus:border-gold/70";

function Field({ label, issue, children }: { label: string; issue?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-widest text-muted">{label}</span>
      <div className={`mt-1 ${issue ? "rounded-lg ring-2 ring-gold/70 ring-offset-2 ring-offset-surface" : ""}`}>{children}</div>
      {issue && <span className="mt-1 block text-xs leading-relaxed text-gold">✎ {issue}</span>}
    </label>
  );
}

function TypeCard({ on, onPick, title, text }: { on: boolean; onPick: () => void; title: string; text: string }) {
  return (
    <button
      type="button"
      onClick={onPick}
      aria-pressed={on}
      className={`rounded-xl border p-3 text-left ${on ? "border-gold bg-gold/10" : "border-line/70 hover:border-gold/50"}`}
    >
      <p className="font-semibold text-text">{title}</p>
      <p className="mt-1 text-xs leading-relaxed text-muted">{text}</p>
    </button>
  );
}

function formatPhone(p: string): string {
  return `${p.slice(0, 3)} ${p.slice(3, 6)} ${p.slice(6)}`;
}

// ── Step 2: the card and its PIN ─────────────────────────────────────────────

function PinStep({ onDone }: { onDone: () => void }) {
  const [pin, setPin] = useState("");
  const [again, setAgain] = useState("");
  const [problem, setProblem] = useState<string | null>(null);
  const busy = useBankStore((s) => s.busy);
  const holder = useBankStore((s) => s.account?.holder ?? "");

  const submit = async () => {
    const p = pinProblem(pin) ?? (pin !== again ? "The two PINs don't match. Type the same four digits twice." : null);
    setProblem(p);
    if (p) {
      audio.play("ui_error");
      return;
    }
    try {
      await issueCard(pin);
      audio.play("ui_open");
      onDone();
    } catch (e) {
      setProblem(formProblem(e)?.message ?? (e instanceof Error ? e.message : "Something went wrong."));
      audio.play("ui_error");
    }
  };

  return (
    <div className="mt-4 grid gap-5 md:grid-cols-2">
      <div>
        <p className="text-sm text-muted">
          "Your account is open. Here's your debit card. It takes money straight from your account, at the ATM or in
          shops. Choose a four-digit PIN to protect it."
        </p>
        <BankCardArt holder={holder} last4="••••" expiry="--/--" />
      </div>
      <div className="space-y-3">
        <label className="block">
          <span className="text-xs uppercase tracking-widest text-muted">Choose a PIN</span>
          <input
            type="password"
            inputMode="numeric"
            maxLength={4}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
            className={`${input} mt-1 font-mono tracking-[0.5em]`}
            autoComplete="new-password"
          />
        </label>
        <label className="block">
          <span className="text-xs uppercase tracking-widest text-muted">Type it again</span>
          <input
            type="password"
            inputMode="numeric"
            maxLength={4}
            value={again}
            onChange={(e) => setAgain(e.target.value.replace(/\D/g, ""))}
            className={`${input} mt-1 font-mono tracking-[0.5em]`}
            autoComplete="new-password"
          />
        </label>
        {problem && <p className="text-xs leading-relaxed text-gold">✎ {problem}</p>}
        <ul className="space-y-1 text-xs text-muted">
          <li>• Not your birthday, and not 1234 or 0000: those are the first ones a thief tries.</li>
          <li>• Never write it on the card, and never tell anyone, even someone who says they're from the bank.</li>
          <li>• Cover the keypad when you type it.</li>
        </ul>
        <div className="flex justify-end">
          <button
            onClick={submit}
            disabled={busy}
            className="rounded-full bg-gold px-5 py-2 text-sm font-semibold text-ink hover:brightness-110 disabled:opacity-60"
          >
            {busy ? "Setting your PIN…" : "Set my PIN"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function BankCardArt({ holder, last4, expiry }: { holder: string; last4: string; expiry: string }) {
  return (
    <div
      className="mt-3 aspect-[1.586] w-full max-w-xs rounded-2xl p-4 text-white shadow-lg"
      style={{ background: "linear-gradient(135deg, #26385f 0%, #1a2440 60%, #3a2f17 100%)" }}
      aria-label={`Meridian debit card ending ${last4}`}
    >
      <div className="flex items-center justify-between">
        <span className="font-display text-sm font-semibold text-[#e5c77a]">MERIDIAN</span>
        <span className="text-[10px] uppercase tracking-widest opacity-70">Debit</span>
      </div>
      <div className="mt-5 h-7 w-10 rounded-md bg-gradient-to-br from-[#e5c77a] to-[#9a7a35]" />
      <p className="mt-3 font-mono text-base tracking-widest">•••• •••• •••• {last4}</p>
      <div className="mt-2 flex items-end justify-between text-[11px]">
        <span className="truncate uppercase tracking-wider">{holder}</span>
        <span className="opacity-80">{expiry}</span>
      </div>
    </div>
  );
}

// ── Step 3: welcome ──────────────────────────────────────────────────────────

function WelcomeStep({ onClose }: { onClose: () => void }) {
  const account = useBankStore((s) => s.account);
  if (!account) return null;
  return (
    <div className="mt-4 grid gap-5 md:grid-cols-2">
      <div className="rounded-2xl border border-gold/40 bg-[#1f2d4d] p-5 text-white shadow-lg">
        <p className="text-[11px] uppercase tracking-widest text-[#e5c77a]">Meridian Bank · Passbook</p>
        <p className="mt-3 font-display text-xl">{account.holder}</p>
        <dl className="mt-3 grid grid-cols-2 gap-y-1 text-sm">
          <dt className="opacity-70">Account no.</dt>
          <dd className="font-mono tabular-nums">{account.accountNumber}</dd>
          <dt className="opacity-70">Type</dt>
          <dd className="capitalize">{account.type}</dd>
          <dt className="opacity-70">Branch</dt>
          <dd>Downtown</dd>
          <dt className="opacity-70">Balance</dt>
          <dd className="tabular-nums">${account.balance}</dd>
        </dl>
      </div>
      <div>
        <BankCardArt holder={account.holder} last4={account.cardLast4 ?? "••••"} expiry={account.cardExpiry ?? "--/--"} />
        <p className="mt-4 text-sm leading-relaxed text-text">
          "Welcome to Meridian! Your account number is on the first page of your passbook. You'll need it on every
          slip, so keep it handy."
        </p>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          "Your account is empty for now. Take a ticket from the machine by the door, and when your number's called,
          Mei at window 1 will pay your cash in."
        </p>
        <div className="mt-4 flex justify-end">
          <button
            autoFocus
            onClick={onClose}
            className="rounded-full bg-gold px-5 py-2 text-sm font-semibold text-ink hover:brightness-110"
          >
            Thank you, Daniel
          </button>
        </div>
      </div>
    </div>
  );
}
