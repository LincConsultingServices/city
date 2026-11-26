// Deposit and withdrawal slips, checked the way Mei checks them at window 1
// (docs/PRD_Building_Bank.md §7.3).
//
// Pure, so every lesson is a test. A slip with a mistake comes back with a note
// that says why the box matters; nothing is ever charged for a mistake.
import { wordsMatch } from "./words";

/** The notes a deposit is counted in. */
export const NOTES = [100, 50, 20, 10, 5, 1] as const;
export type Note = (typeof NOTES)[number];

export type SlipKind = "deposit" | "withdrawal";

export interface SlipValues {
  date: string; // yyyy-mm-dd
  accountNumber: string;
  name: string;
  /** Deposits only: how many of each note. */
  notes: Record<Note, number>;
  /** The amount in figures. On a deposit, Level B writes the total itself. */
  amount: string;
  words: string;
  signature: string;
}

export type SlipField =
  "date" | "accountNumber" | "name" | "notes" | "amount" | "words" | "signature";

export interface SlipIssue {
  field: SlipField;
  message: string;
}

export interface SlipContext {
  kind: SlipKind;
  today: string; // yyyy-mm-dd
  accountNumber: string;
  holder: string;
  signature: string;
  /** Cash in your pocket (deposits) or in the account (withdrawals). */
  available: number;
  /** Level A: the slip adds up the notes for you. */
  autoTotal: boolean;
}

export function emptySlip(today: string): SlipValues {
  return {
    date: today,
    accountNumber: "",
    name: "",
    notes: { 100: 0, 50: 0, 20: 0, 10: 0, 5: 0, 1: 0 },
    amount: "",
    words: "",
    signature: "",
  };
}

export function notesTotal(notes: Record<Note, number>): number {
  return NOTES.reduce((sum, n) => sum + n * Math.max(0, Math.floor(notes[n] || 0)), 0);
}

/** The amount this slip is for: the notes on a Level A deposit, else the figures. */
export function slipAmount(v: SlipValues, ctx: SlipContext): number {
  if (ctx.kind === "deposit" && ctx.autoTotal) return notesTotal(v.notes);
  const n = Number(v.amount.replace(/[$,\s]/g, ""));
  return Number.isInteger(n) ? n : NaN;
}

const same = (a: string, b: string) =>
  a.trim().toLowerCase().replace(/\s+/g, " ") === b.trim().toLowerCase().replace(/\s+/g, " ");

export function checkSlip(v: SlipValues, ctx: SlipContext): SlipIssue[] {
  const issues: SlipIssue[] = [];
  const amount = slipAmount(v, ctx);

  if (v.date !== ctx.today) {
    issues.push({
      field: "date",
      message:
        "Write today's date. Every slip is dated, so your passbook shows when the money moved.",
    });
  }

  const acct = v.accountNumber.replace(/\s/g, "");
  if (!acct) {
    issues.push({
      field: "accountNumber",
      message: "Write your account number. It's on the first page of your passbook.",
    });
  } else if (acct !== ctx.accountNumber) {
    issues.push({
      field: "accountNumber",
      message:
        "That isn't your account number. One wrong digit and the money goes to someone else's account. Copy it from your passbook.",
    });
  }

  if (!same(v.name, ctx.holder)) {
    issues.push({
      field: "name",
      message: "Write the name the account is in, exactly as it is on your passbook.",
    });
  }

  if (ctx.kind === "deposit") {
    const counted = notesTotal(v.notes);
    if (counted === 0) {
      issues.push({
        field: "notes",
        message: "Count your notes into the table: how many hundreds, fifties, twenties and so on.",
      });
    } else if (!ctx.autoTotal && counted !== amount) {
      issues.push({
        field: "amount",
        message: `The notes add up to $${counted}, but the total says ${Number.isNaN(amount) ? "something else" : `$${amount}`}. I count your notes against the slip, so they have to match.`,
      });
    }
  }

  if (Number.isNaN(amount) || amount <= 0) {
    if (!(ctx.kind === "deposit" && notesTotal(v.notes) === 0)) {
      issues.push({
        field: "amount",
        message: "Write the amount in figures: whole dollars, like 250.",
      });
    }
  } else if (amount > ctx.available) {
    issues.push({
      field: "amount",
      message:
        ctx.kind === "deposit"
          ? `You only have $${ctx.available} in cash, so you can't pay in $${amount}.`
          : `There's $${ctx.available} in your account, so you can't take out $${amount}.`,
    });
  }

  if (!Number.isNaN(amount) && amount > 0 && !wordsMatch(v.words, amount)) {
    issues.push({
      field: "words",
      message: v.words.trim()
        ? "The words don't say the same amount as the figures. Words are harder to change than numbers, which is why the slip asks for both, and why they must match."
        : 'Write the amount in words too, like "Two hundred and fifty dollars only".',
    });
  }

  if (!v.signature.trim()) {
    issues.push({
      field: "signature",
      message: "Sign the slip. Without a signature, I can't accept it.",
    });
  } else if (ctx.signature && !same(v.signature, ctx.signature)) {
    issues.push({
      field: "signature",
      message: `That doesn't match the signature on your account ("${ctx.signature}"). Sign the same way every time, so the bank can tell it's really you.`,
    });
  }

  return issues;
}
