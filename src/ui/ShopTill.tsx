// The Shop's till. Window shopping was all it offered; now it sells, and takes
// cash or the Meridian debit card.
//
// Paying by card is where the bank meets the rest of the city: the price comes
// out of your account (with your PIN), the item and the payment land together
// or not at all, and the line shows up in your passbook as a card payment.
import { useCallback, useEffect, useState } from "react";
import { Modal } from "./Modal";
import { audio } from "@/framework/audio/audioManager";
import { api, ApiError } from "@/framework/api";
import type { ShopItemView } from "@/framework/api";
import { useEconomyStore } from "@/framework/economy/economyStore";
import { loadBank, pinRefusal, useBankStore } from "@/framework/bank/bankStore";

const primary =
  "rounded-full bg-gold px-4 py-2 text-sm font-semibold text-ink hover:brightness-110 disabled:opacity-50";
const secondary =
  "rounded-full border border-line/70 px-4 py-2 text-sm text-muted hover:border-gold/60 hover:text-text";

const CATEGORY: Record<string, string> = {
  SKIN: "Outfit",
  HAT: "Hat",
  BACKGROUND: "Backdrop",
  PET: "Companion",
};

export function ShopTill({ onClose }: { onClose: () => void }) {
  const [items, setItems] = useState<ShopItemView[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [buying, setBuying] = useState<ShopItemView | null>(null);

  const load = useCallback(() => {
    api
      .shopItems()
      .then((r) => setItems(r.items))
      .catch(() => setError("The till won't open just now. Try again in a moment."));
  }, []);
  useEffect(() => {
    load();
    // The bank too, so the till knows whether you can pay by card.
    loadBank().catch(() => undefined);
  }, [load]);

  if (buying) {
    return (
      <Checkout
        item={buying}
        onDone={() => {
          setBuying(null);
          load();
        }}
      />
    );
  }

  return (
    <Modal onClose={onClose} width="lg">
      <h2 className="font-display text-xl font-semibold text-gold">The Shop</h2>
      <p className="mt-1 text-sm text-muted">Pay with cash, or with your Meridian debit card.</p>
      {error && <p className="mt-3 text-sm text-red-300">{error}</p>}
      {items === null && !error && <p className="mt-4 text-sm text-muted">Opening the till…</p>}
      {items && (
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {items.map((it) => (
            <li
              key={it.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-line/60 bg-surface-2/50 p-3"
            >
              <div className="min-w-0">
                <p className="truncate font-semibold text-text">{it.name}</p>
                <p className="text-xs text-muted">
                  {CATEGORY[it.category] ?? it.category} ·{" "}
                  {it.priceCoins === 0 ? "free" : `$${it.priceCoins}`}
                </p>
              </div>
              {it.owned ? (
                <span className="text-xs uppercase tracking-widest text-muted">Yours</span>
              ) : it.locked ? (
                <span className="text-xs text-muted" title="Earn the badge that unlocks it">
                  Locked
                </span>
              ) : (
                <button className={primary} onClick={() => setBuying(it)}>
                  Buy
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      <div className="mt-5 flex justify-end">
        <button autoFocus className={secondary} onClick={onClose}>
          Leave the shop
        </button>
      </div>
    </Modal>
  );
}

function Checkout({ item, onDone }: { item: ShopItemView; onDone: () => void }) {
  const cash = useEconomyStore((s) => s.coinBalance) ?? 0;
  const account = useBankStore((s) => s.account);
  const [method, setMethod] = useState<"cash" | "card" | null>(
    item.priceCoins === 0 ? "cash" : null,
  );
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [paid, setPaid] = useState<string | null>(null);

  const canCard = Boolean(account?.cardLast4);
  const bank = account?.balance ?? 0;

  const pay = async () => {
    if (!method) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await api.shopPurchase(item.id, method, method === "card" ? pin : undefined);
      useEconomyStore.getState().applyCoinBalance(res.newBalance);
      if (typeof res.bankBalance === "number")
        useEconomyStore.getState().applyBankBalance(res.bankBalance);
      await loadBank().catch(() => undefined);
      audio.play("ui_confirm");
      setPaid(
        res.alreadyOwned
          ? "You already own this one. Nothing was charged."
          : res.paidBy === "card"
            ? `Paid $${item.priceCoins} by card. It's in your passbook as a card payment to The Shop.`
            : `Paid $${item.priceCoins} in cash.`,
      );
    } catch (e) {
      const r = pinRefusal(e);
      setPin("");
      if (r?.locked)
        setMessage("Too many wrong PINs. Your card is locked for a few minutes, for your safety.");
      else if (r)
        setMessage(`Wrong PIN. ${r.attemptsLeft} ${r.attemptsLeft === 1 ? "try" : "tries"} left.`);
      else if (e instanceof ApiError && e.code === "INSUFFICIENT_FUNDS")
        setMessage("Not enough cash for that.");
      else if (e instanceof ApiError && e.code === "INSUFFICIENT_BALANCE")
        setMessage("Card declined: there isn't enough in your account.");
      else setMessage(e instanceof Error ? e.message : "Something went wrong.");
      audio.play("ui_error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal onClose={onDone} width="sm">
      <h2 className="font-display text-xl font-semibold text-gold">{item.name}</h2>
      <p className="mt-1 text-sm text-muted">
        {item.priceCoins === 0 ? "Free" : `$${item.priceCoins}`}
      </p>

      {paid ? (
        <>
          <p className="mt-4 text-sm text-text">{paid}</p>
          <div className="mt-5 flex justify-end">
            <button autoFocus className={primary} onClick={onDone}>
              Done
            </button>
          </div>
        </>
      ) : (
        <>
          {item.priceCoins > 0 && (
            <div className="mt-4 grid gap-2">
              <button
                className={`rounded-xl border p-3 text-left ${method === "cash" ? "border-gold bg-gold/10" : "border-line/70"}`}
                onClick={() => setMethod("cash")}
                disabled={cash < item.priceCoins}
              >
                <p className="font-semibold text-text">Cash</p>
                <p className="text-xs text-muted">
                  You have ${cash}
                  {cash < item.priceCoins ? ": not enough" : ""}
                </p>
              </button>
              <button
                className={`rounded-xl border p-3 text-left ${method === "card" ? "border-gold bg-gold/10" : "border-line/70"}`}
                onClick={() => setMethod("card")}
                disabled={!canCard}
              >
                <p className="font-semibold text-text">
                  Debit card {canCard ? `•••• ${account!.cardLast4}` : ""}
                </p>
                <p className="text-xs text-muted">
                  {canCard
                    ? `From your account: $${bank}. The money leaves your account straight away.`
                    : "Open an account at Meridian Bank to get a card."}
                </p>
              </button>
            </div>
          )}
          {method === "card" && (
            <label className="mt-3 block">
              <span className="text-xs uppercase tracking-widest text-muted">
                PIN (cover the keypad)
              </span>
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                autoComplete="off"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                className="mt-1 w-full rounded-lg border border-line/70 bg-surface-2/70 px-3 py-2 font-mono tracking-[0.5em] text-text outline-none focus:border-gold/70"
              />
            </label>
          )}
          {message && <p className="mt-3 text-sm text-gold">{message}</p>}
          <div className="mt-5 flex justify-end gap-2">
            <button className={secondary} onClick={onDone}>
              Back
            </button>
            <button
              className={primary}
              disabled={busy || !method || (method === "card" && pin.length !== 4)}
              onClick={pay}
            >
              {busy ? "Paying…" : item.priceCoins === 0 ? "Take it" : `Pay $${item.priceCoins}`}
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}
