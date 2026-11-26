// Cheques, the lessons (docs/PRD_Building_Bank.md §7.4) — pure, so each one
// is a test.
//
// Two things live here: the friendly check on a cheque the player writes (the
// server holds the same line on the date, signature and crossing), and the
// "spot the bad cheque" exercise at window 2, where the player is handed a few
// cheques that came in today and decides which the bank can pay.
import { wordsMatch } from "./words";

/** yyyy-mm-dd for a Date, in local time — what a date box writes. */
export function isoDay(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function addMonths(d: Date, n: number): Date {
  const x = new Date(d);
  x.setMonth(x.getMonth() + n);
  return x;
}

/** Days from `from` to `to`, both yyyy-mm-dd. */
function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000);
}

/** Banks refuse cheques older than about six months. */
export const STALE_DAYS = 180;

export type DateProblem = "missing" | "post_dated" | "stale" | null;

export function dateProblem(date: string, today: string): DateProblem {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return "missing";
  const d = daysBetween(today, date);
  if (d > 1) return "post_dated";
  if (d < -STALE_DAYS) return "stale";
  return null;
}

// ── Writing a cheque ─────────────────────────────────────────────────────────

export interface ChequeValues {
  date: string;
  amount: string;
  words: string;
  signature: string;
  crossed: boolean;
}

export type ChequeField = keyof ChequeValues;

export interface ChequeIssue {
  field: ChequeField;
  message: string;
}

export interface WriteContext {
  today: string;
  signature: string;
  /** The payee is yourself: a cheque cashed at the counter. */
  toSelf: boolean;
}

const same = (a: string, b: string) =>
  a.trim().toLowerCase().replace(/\s+/g, " ") === b.trim().toLowerCase().replace(/\s+/g, " ");

export function chequeAmount(v: ChequeValues): number {
  const n = Number(v.amount.replace(/[$,\s]/g, ""));
  return Number.isInteger(n) && n > 0 ? n : NaN;
}

export function checkCheque(v: ChequeValues, ctx: WriteContext): ChequeIssue[] {
  const issues: ChequeIssue[] = [];
  const dp = dateProblem(v.date, ctx.today);
  if (dp === "missing") issues.push({ field: "date", message: "Date the cheque. A cheque without a date can't be paid." });
  if (dp === "post_dated") {
    issues.push({ field: "date", message: "That date is in the future. A post-dated cheque can't be paid until that day comes." });
  }
  if (dp === "stale") {
    issues.push({ field: "date", message: "That date is more than six months ago. Banks refuse cheques that old: they're stale." });
  }

  const amount = chequeAmount(v);
  if (Number.isNaN(amount)) {
    issues.push({ field: "amount", message: "Write the amount in figures, right up against the $ sign, so nobody can add a digit in front." });
  } else if (!wordsMatch(v.words, amount)) {
    issues.push({
      field: "words",
      message: v.words.trim()
        ? "The words and the figures don't say the same amount. If they don't match, the bank won't pay the cheque."
        : "Write the amount in words as well, and finish with \"only\" so nothing can be added on the end.",
    });
  }

  if (!v.signature.trim()) {
    issues.push({ field: "signature", message: "Sign the cheque. An unsigned cheque is just a piece of paper." });
  } else if (!same(v.signature, ctx.signature)) {
    issues.push({ field: "signature", message: `Sign it the way you signed for your account ("${ctx.signature}").` });
  }

  if (ctx.toSelf && v.crossed) {
    issues.push({
      field: "crossed",
      message: "A crossed cheque can only be paid into an account, never cashed. To take cash out, leave it uncrossed.",
    });
  }
  return issues;
}

// ── Spot the bad cheque ──────────────────────────────────────────────────────

export type ChequeFault = "mismatch" | "unsigned" | "stale" | "post_dated" | "bearer";

export const FAULTS: Record<ChequeFault, { label: string; why: string }> = {
  mismatch: {
    label: "Words and figures don't match",
    why: "The words say one amount and the figures another. The bank can't know which was meant, so it pays neither.",
  },
  unsigned: {
    label: "Not signed",
    why: "Without the account holder's signature, the bank has no proof the cheque came from them.",
  },
  stale: {
    label: "Too old (stale)",
    why: "It's dated more than six months ago. Banks refuse cheques that old.",
  },
  post_dated: {
    label: "Dated in the future",
    why: "It's post-dated: the bank can't pay it until the date written on it.",
  },
  bearer: {
    label: "\"Or bearer\" left in, for a large amount",
    why: "With \"or bearer\" left in, anyone holding the cheque can cash it. If it's lost, a stranger could. For a large amount, cross it out.",
  },
};

export interface PracticeCheque {
  id: string;
  from: string;
  payee: string;
  date: string;
  amount: number;
  words: string;
  signature: string;
  bearerStruck: boolean;
  faults: ChequeFault[];
}

/**
 * The cheques that came in today. One is fine, so a player who rejects
 * everything is caught out as surely as one who accepts everything. Level B
 * adds one with two faults at once.
 */
export function practiceCheques(today: Date, levelB: boolean): PracticeCheque[] {
  const t = isoDay(today);
  const list: PracticeCheque[] = [
    {
      id: "p1", from: "Harbour Row Hardware", payee: "Meridian Bank", date: t, amount: 250,
      words: "Two hundred dollars only", signature: "J. Okoro", bearerStruck: true, faults: ["mismatch"],
    },
    {
      id: "p2", from: "Nadia Haddad", payee: "Ellery Fitch", date: t, amount: 75,
      words: "Seventy five dollars only", signature: "", bearerStruck: true, faults: ["unsigned"],
    },
    {
      id: "p3", from: "Old Mill Bakery", payee: "Ray Delacroix", date: isoDay(addMonths(today, -8)), amount: 40,
      words: "Forty dollars only", signature: "P. Mill", bearerStruck: true, faults: ["stale"],
    },
    {
      id: "p4", from: "Founders Court Florist", payee: "Tomas Bergström", date: t, amount: 120,
      words: "One hundred and twenty dollars only", signature: "L. Vance", bearerStruck: true, faults: [],
    },
  ];
  if (levelB) {
    list.push({
      id: "p5", from: "Riverside Motors", payee: "Priya Raman", date: isoDay(addMonths(today, 1)), amount: 4800,
      words: "Four thousand eight hundred dollars only", signature: "D. Shaw", bearerStruck: false,
      faults: ["post_dated", "bearer"],
    });
  }
  return list;
}

/** Whether the faults a player marked are exactly the cheque's faults. */
export function judged(cheque: PracticeCheque, marked: readonly ChequeFault[]): boolean {
  const a = [...new Set(marked)].sort();
  const b = [...cheque.faults].sort();
  return a.length === b.length && a.every((f, i) => f === b[i]);
}
