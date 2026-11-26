// The bank, mirrored — the player's account as the server last reported it.
//
// Like the wallet, it is **updated only from server responses**: it never adds
// up a balance of its own. Every call that moves money returns both balances,
// and both land here and in the HUD at once.
//
// Shared by the bank building and the HUD, and later by any building that pays
// or charges through the bank.
import { create } from "zustand";
import { api, ApiError } from "@/framework/api";
import type {
  BankAccount,
  BankChequeWritten,
  BankView,
  Cheque,
  OpenAccountForm,
  QuoteMonth,
  StatementLine,
  TermDeposit,
  WriteChequeForm,
  Loan,
  Credit,
  LoanQuote,
} from "@/framework/api";
import { useEconomyStore } from "@/framework/economy/economyStore";

interface BankState {
  /** null until the bank has answered. */
  loaded: boolean;
  account: BankAccount | null;
  statement: StatementLine[];
  cheques: Cheque[];
  deposits: TermDeposit[];
  loans: Loan[];
  credit: Credit | null;
  rules: BankView["rules"] | null;
  /** Set while a request is in flight, so a button cannot be pressed twice. */
  busy: boolean;
}

export const useBankStore = create<BankState>(() => ({
  loaded: false,
  account: null,
  statement: [],
  cheques: [],
  deposits: [],
  loans: [],
  credit: null,
  rules: null,
  busy: false,
}));

function apply(view: BankView): void {
  useBankStore.setState({
    loaded: true,
    account: view.account,
    statement: view.statement,
    cheques: view.cheques,
    deposits: view.deposits,
    loans: view.loans,
    credit: view.credit ?? null,
    rules: view.rules,
  });
  useEconomyStore.getState().applyBank(view);
}

/** Read the bank (which also settles any bank months that have ended). */
export async function loadBank(): Promise<void> {
  apply(await api.getBank());
}

/** Whether the player has ever paid money in — the end of the first visit. */
export function hasDeposited(statement: readonly StatementLine[]): boolean {
  return statement.some((l) => l.kind === "deposit");
}

/** A problem with one box on a bank form, as the server reported it. */
export interface FormProblem {
  field: string;
  message: string;
}

/** Pull the field and message out of a FORM_INVALID error, if it is one. */
export function formProblem(e: unknown): FormProblem | null {
  if (!(e instanceof ApiError) || e.code !== "FORM_INVALID") return null;
  const err = (e.body as { error?: { field?: unknown; message?: unknown } } | undefined)?.error;
  return {
    field: typeof err?.field === "string" ? err.field : "",
    message: typeof err?.message === "string" ? err.message : e.message,
  };
}

async function busy<T>(fn: () => Promise<T>): Promise<T> {
  useBankStore.setState({ busy: true });
  try {
    return await fn();
  } finally {
    useBankStore.setState({ busy: false });
  }
}

/** Open the account from the form, then re-read the bank. */
export function openAccount(form: OpenAccountForm): Promise<void> {
  return busy(async () => {
    await api.openBankAccount(form);
    await loadBank();
  });
}

/** Issue the debit card with the PIN the player chose. */
export function issueCard(pin: string): Promise<void> {
  return busy(async () => {
    await api.issueBankCard(pin);
    await loadBank();
  });
}

/** A fresh key for one slip or one ATM withdrawal: resend it and nothing moves twice. */
export function newKey(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** Cash into the account at the counter. Returns the line the passbook will print. */
export function deposit(amount: number, key: string): Promise<StatementLine> {
  return busy(async () => {
    const res = await api.bankDeposit(amount, key, "counter");
    useEconomyStore.getState().applyBankBalance(res.balance, res.cash);
    await loadBank();
    return res.line;
  });
}

/** Money out of the account at the counter. */
export function withdraw(amount: number, key: string): Promise<StatementLine> {
  return busy(async () => {
    const res = await api.bankWithdraw(amount, key, "counter");
    useEconomyStore.getState().applyBankBalance(res.balance, res.cash);
    await loadBank();
    return res.line;
  });
}

/** Check the PIN at the ATM. Throws WRONG_PIN or CARD_LOCKED. */
export function atmCheckPin(pin: string): Promise<unknown> {
  return busy(() => api.bankAtmPin(pin));
}

/** Cash from the ATM. */
export function atmWithdraw(pin: string, amount: number, key: string): Promise<StatementLine> {
  return busy(async () => {
    const res = await api.bankAtmWithdraw(pin, amount, key);
    useEconomyStore.getState().applyBankBalance(res.balance, res.cash);
    await loadBank();
    return res.line;
  });
}

/** Print the passbook up to date. Returns the new lines, oldest first. */
export function printPassbook(): Promise<StatementLine[]> {
  return busy(async () => {
    const res = await api.printPassbook();
    await loadBank();
    return res.lines;
  });
}

/** What a refused PIN said: tries left, or locked. */
export function pinRefusal(e: unknown): { locked: boolean; attemptsLeft: number } | null {
  if (!(e instanceof ApiError) || (e.code !== "WRONG_PIN" && e.code !== "CARD_LOCKED")) return null;
  const err = (e.body as { error?: { attemptsLeft?: unknown } } | undefined)?.error;
  return {
    locked: e.code === "CARD_LOCKED",
    attemptsLeft: typeof err?.attemptsLeft === "number" ? err.attemptsLeft : 0,
  };
}

/** Lines that have happened but are not printed in the passbook yet. */
export function unprinted(account: BankAccount | null, statement: readonly StatementLine[]): StatementLine[] {
  if (!account) return [];
  const through = account.printedThrough ? Date.parse(account.printedThrough) : -Infinity;
  return statement.filter((l) => Date.parse(l.at) > through);
}

/** A new cheque book. */
export function issueChequeBook(): Promise<void> {
  return busy(async () => {
    await api.issueChequeBook();
    await loadBank();
  });
}

/** Pay a received cheque in. Returns it, now clearing. */
export function depositCheque(id: string): Promise<Cheque> {
  return busy(async () => {
    const res = await api.depositCheque(id);
    await loadBank();
    return res.cheque;
  });
}

/** Present a cheque the player wrote. */
export function writeCheque(form: WriteChequeForm): Promise<BankChequeWritten> {
  return busy(async () => {
    const res = await api.writeCheque(form);
    useEconomyStore.getState().applyBankBalance(res.balance, res.cash);
    await loadBank();
    return res;
  });
}

/** What a deposit would grow to. The server's numbers, the same ones it pays. */
export function quote(kind: "fd" | "rd", amount: number, term: number): Promise<QuoteMonth[]> {
  return api.bankQuote(kind, amount, term).then((q) => q.months);
}

/** Open a fixed or recurring deposit. */
export function openDeposit(kind: "fd" | "rd", amount: number, term: number, key: string): Promise<TermDeposit> {
  return busy(async () => {
    const res = await api.openDeposit(kind, amount, term, key);
    await loadBank();
    return res.deposit;
  });
}

/** Take a deposit out early. Returns what it paid. */
export function breakDeposit(id: string): Promise<number> {
  return busy(async () => {
    const res = await api.breakDeposit(id);
    await loadBank();
    return res.payout;
  });
}

/** Everything in deposits that are still running, at today's value. */
export function inDeposits(deposits: readonly TermDeposit[]): number {
  return deposits.filter((d) => d.status === "active").reduce((sum, d) => sum + d.value, 0);
}

/** When the next deposit month ends (interest, an instalment or a maturity). */
export function nextDepositMonth(deposits: readonly TermDeposit[], monthHours: number | undefined): Date | null {
  if (!monthHours) return null;
  let best: number | null = null;
  for (const d of deposits) {
    if (d.status !== "active") continue;
    const t = Date.parse(d.openedAt) + (d.monthsDone + 1) * monthHours * 3_600_000;
    if (best === null || t < best) best = t;
  }
  return best === null ? null : new Date(best);
}

/** Send money to a business by account number. */
export function transfer(accountNumber: string, amount: number, reference: string, key: string) {
  return busy(async () => {
    const res = await api.bankTransfer(accountNumber, amount, reference, key);
    useEconomyStore.getState().applyBankBalance(res.balance);
    await loadBank();
    return res;
  });
}

/** Salaries into the account, or into your pocket. */
export function setSalaryToAccount(on: boolean): Promise<void> {
  return busy(async () => {
    await api.bankSalaryToAccount(on);
    await loadBank();
  });
}

/** What a loan would cost, at this player's rate. */
export function loanQuote(amount: number, term: number): Promise<LoanQuote> {
  return api.loanQuote(amount, term).then((r) => r.quote);
}

/** Borrow. */
export function borrow(amount: number, term: number, purpose: string, key: string): Promise<Loan> {
  return busy(async () => {
    const res = await api.openLoan(amount, term, purpose, key);
    await loadBank();
    return res.loan;
  });
}

/** Pay the loan off early: some of it, or all of it (amount 0). */
export function repayLoan(amount: number, key: string): Promise<number> {
  return busy(async () => {
    const res = await api.repayLoan(amount, key);
    await loadBank();
    return res.paid;
  });
}

/** The loan being repaid, if there is one. */
export function activeLoan(loans: readonly Loan[]): Loan | null {
  return loans.find((l) => l.status === "active") ?? null;
}

/** When the next loan instalment is due. */
export function nextLoanMonth(loans: readonly Loan[], monthHours: number | undefined): Date | null {
  const l = activeLoan(loans);
  if (!l || !monthHours) return null;
  return new Date(Date.parse(l.openedAt) + (l.monthsDone + 1) * monthHours * 3_600_000);
}

/** When the next paid-in cheque clears, if one is clearing. */
export function nextClearing(cheques: readonly Cheque[]): Date | null {
  let best: number | null = null;
  for (const c of cheques) {
    if (c.status !== "clearing" || !c.clearsAt) continue;
    const t = Date.parse(c.clearsAt);
    if (best === null || t < best) best = t;
  }
  return best === null ? null : new Date(best);
}

/** Close the account; the balance comes back as cash. */
export function closeAccount(): Promise<number> {
  return busy(async () => {
    const res = await api.closeBankAccount();
    await loadBank();
    return res.returned;
  });
}
