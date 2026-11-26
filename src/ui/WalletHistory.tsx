// Your wallet: the cash in your pocket, and where it came from and went.
//
// Opened from the HUD's cash chip. Reads the server's ledger rather than
// adding anything up: a client that computed a balance would be a client that
// could be wrong about somebody's money.
//
// **No proficiency, no tier, no score, no verdict beside an activity.** Twenty-
// five dollars next to a week's name IS the tier, spelled out — so a row says
// what it was for and what it was worth, in the city's own words, and the
// player draws their own conclusions (the silent-tier contract, ui tests).
import { useEffect, useMemo, useState } from "react";
import { api } from "@/framework/api";
import { useEconomyStore } from "@/framework/economy/economyStore";
import { Modal } from "./Modal";
import type { CoinTransaction } from "@/framework/api";

/** The ledger's machine codes, in the city's words. */
const REASONS: Record<string, string> = {
  ACTIVITY_COMPLETE: "A week's work",
  BADGE_AWARD: "Award",
  SHOP_PURCHASE: "Bought at The Shop",
  STARTER_GRANT: "Starting money",
  ADMIN_GRANT: "A deposit",
  SALARY: "Café salary",
  journey_revenue: "Earnings from the café",
  BANK_DEPOSIT: "Paid into the bank",
  BANK_WITHDRAWAL: "Taken out of the bank",
  BANK_CLOSE: "Bank account closed",
};

type Filter = "all" | "in" | "out";
const PAGE = 50;

function when(iso: string): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "";
  const d = new Date(t);
  return `${d.toLocaleDateString(undefined, { day: "numeric", month: "short" })} ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

export function WalletHistory({ onClose }: { onClose: () => void }) {
  const coins = useEconomyStore((s) => s.coinBalance);
  const lifetime = useEconomyStore((s) => s.lifetimeCoins);
  const applyWallet = useEconomyStore((s) => s.applyWallet);
  const [ledger, setLedger] = useState<CoinTransaction[] | null>(null);
  const [more, setMore] = useState(false);
  const [reachable, setReachable] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  // Names for what the codes point at: badges and shop items.
  const [names, setNames] = useState<Record<string, string>>({});

  useEffect(() => {
    let live = true;
    void Promise.all([api.getWallet(), api.getWalletTransactions(PAGE)])
      .then(([wallet, history]) => {
        if (!live) return;
        applyWallet(wallet);
        setLedger(history.transactions);
        setMore(history.transactions.length === PAGE);
      })
      .catch(() => {
        if (live) setReachable(false);
      });
    // Best effort: without these the row still says what kind of thing it was.
    void Promise.allSettled([api.getBadges(), api.shopItems()]).then(([b, s]) => {
      if (!live) return;
      const n: Record<string, string> = {};
      if (b.status === "fulfilled") for (const x of b.value.badges) n[x.id] = x.name;
      if (s.status === "fulfilled") for (const x of s.value.items) n[x.id] = x.name;
      setNames(n);
    });
    return () => {
      live = false;
    };
  }, [applyWallet]);

  const loadMore = () => {
    if (!ledger) return;
    void api
      .getWalletTransactions(PAGE, ledger.length)
      .then((h) => {
        setLedger([...ledger, ...h.transactions]);
        setMore(h.transactions.length === PAGE);
      })
      .catch(() => setMore(false));
  };

  const shown = useMemo(
    () =>
      (ledger ?? []).filter((r) =>
        filter === "all" ? true : filter === "in" ? r.amount > 0 : r.amount < 0,
      ),
    [ledger, filter],
  );
  const totalIn = (ledger ?? []).filter((r) => r.amount > 0).reduce((s, r) => s + r.amount, 0);
  const totalOut = (ledger ?? []).filter((r) => r.amount < 0).reduce((s, r) => s - r.amount, 0);

  const describe = (r: CoinTransaction): { what: string; detail: string } => {
    const base = REASONS[r.reason] ?? "An adjustment";
    if (r.reason === "BADGE_AWARD")
      return { what: `${base}: ${names[r.refId] ?? "a badge"}`, detail: "" };
    if (r.reason === "SHOP_PURCHASE") return { what: base, detail: names[r.refId] ?? r.refId };
    if (r.reason === "BANK_WITHDRAWAL" && r.refType === "CHEQUE")
      return { what: "Cheque cashed at the bank", detail: `No. ${r.refId}` };
    if (r.reason === "ACTIVITY_COMPLETE") return { what: base, detail: r.refId };
    return { what: base, detail: "" };
  };

  return (
    <Modal onClose={onClose} width="md">
      <h2 className="font-display text-xl font-semibold text-gold">Your wallet</h2>
      <p className="mt-1 text-sm text-muted">
        The cash in your pocket, and where it came from and went.
      </p>

      <div className="mt-5 flex items-baseline gap-3 rounded-xl border border-line/70 bg-surface-2/50 px-5 py-4">
        <span aria-hidden className="font-display text-3xl text-coin">
          $
        </span>
        <span className="font-display text-3xl tabular-nums text-text">
          {coins === null ? "—" : coins}
        </span>
        {lifetime !== null && (
          <span className="ml-auto text-xs uppercase tracking-widest text-muted">
            ${lifetime} earned in all
          </span>
        )}
      </div>

      {ledger && ledger.length > 0 && (
        <div className="mt-3 grid grid-cols-2 gap-2 text-center">
          <div className="rounded-xl border border-line/60 bg-surface-2/40 p-2">
            <p className="text-[11px] uppercase tracking-widest text-muted">Money in</p>
            <p className="tabular-nums text-coin">+${totalIn}</p>
          </div>
          <div className="rounded-xl border border-line/60 bg-surface-2/40 p-2">
            <p className="text-[11px] uppercase tracking-widest text-muted">Money out</p>
            <p className="tabular-nums text-text">-${totalOut}</p>
          </div>
        </div>
      )}

      <div className="mt-5 flex items-center justify-between">
        <h3 className="text-xs uppercase tracking-widest text-muted">History</h3>
        <div className="flex gap-1">
          {(["all", "in", "out"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              aria-pressed={filter === f}
              className={`rounded-full border px-2.5 py-0.5 text-xs ${
                filter === f
                  ? "border-gold bg-gold/15 text-text"
                  : "border-line/70 text-muted hover:text-text"
              }`}
            >
              {f === "all" ? "All" : f === "in" ? "In" : "Out"}
            </button>
          ))}
        </div>
      </div>

      {!reachable ? (
        <p className="mt-3 text-sm text-muted">
          Can't reach your wallet just now. Your money is safe: it's kept on your account, not in
          this browser.
        </p>
      ) : ledger === null ? (
        <p className="mt-3 text-sm text-muted">Looking it up…</p>
      ) : shown.length === 0 ? (
        <p className="mt-3 text-sm text-muted">
          {ledger.length === 0 ? "Nothing yet. Go and run something." : "Nothing here."}
        </p>
      ) : (
        <ul className="mt-2 max-h-80 divide-y divide-line/50 overflow-y-auto">
          {shown.map((row, i) => {
            const d = describe(row);
            return (
              <li key={row.id || i} className="flex items-baseline gap-3 py-2.5 text-sm">
                <span className="min-w-0">
                  <span className="text-text">{d.what}</span>
                  {d.detail && <span className="ml-2 truncate text-xs text-muted">{d.detail}</span>}
                  {row.createdAt && (
                    <span className="block text-[11px] text-muted">{when(row.createdAt)}</span>
                  )}
                </span>
                <span
                  className={`ml-auto shrink-0 tabular-nums ${row.amount < 0 ? "text-muted" : "text-coin"}`}
                >
                  {row.amount > 0 ? `+$${row.amount}` : `-$${Math.abs(row.amount)}`}
                </span>
              </li>
            );
          })}
        </ul>
      )}
      {more && filter === "all" && (
        <button
          onClick={loadMore}
          className="mt-2 text-xs text-muted underline underline-offset-2 hover:text-text"
        >
          Show earlier
        </button>
      )}
      <p className="mt-3 text-xs text-muted">
        Money in your bank account is in your passbook. This is only the cash in your pocket.
      </p>
    </Modal>
  );
}
