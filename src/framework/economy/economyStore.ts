// The wallet, mirrored (PRD §9, §12.1).
//
// **Updated only from server responses.** It holds no fake data and computes no
// balance of its own: coins are granted server-side, once, against an
// idempotency key, and a client that added them up locally would be a client
// that could be wrong about somebody's money. Until a real balance arrives the
// HUD shows an em dash rather than a zero, because "we do not know yet" and "you
// have none" are different things and only one of them is true.
import { create } from "zustand";

interface EconomyState {
  /** Cash: the wallet, the money in your pocket. */
  coinBalance: number | null;
  /**
   * What is in your bank account: null until the bank has answered, and
   * `false` once it has said you have no account — "no account" and "we do not
   * know yet" are different, exactly as for the wallet.
   */
  bankBalance: number | false | null;
  applyBank: (view: { account: { balance: number } | null; cash?: number } | undefined) => void;
  applyBankBalance: (balance: number, cash?: number) => void;
  /** Everything ever earned, which is not the same as what is left. */
  lifetimeCoins: number | null;
  applyCoinBalance: (balance: number | undefined) => void;
  applyWallet: (wallet: { coins?: number; lifetimeCoins?: number } | undefined) => void;
}

export const useEconomyStore = create<EconomyState>((set) => ({
  coinBalance: null,
  lifetimeCoins: null,
  bankBalance: null,
  applyBank: (view) => {
    if (!view) return;
    const next: Partial<EconomyState> = { bankBalance: view.account ? view.account.balance : false };
    if (typeof view.cash === "number") next.coinBalance = view.cash;
    set(next);
  },
  applyBankBalance: (balance, cash) => {
    const next: Partial<EconomyState> = { bankBalance: balance };
    if (typeof cash === "number") next.coinBalance = cash;
    set(next);
  },
  applyCoinBalance: (balance) => {
    if (typeof balance === "number") set({ coinBalance: balance });
  },
  applyWallet: (wallet) => {
    if (!wallet) return;
    const next: Partial<EconomyState> = {};
    if (typeof wallet.coins === "number") next.coinBalance = wallet.coins;
    if (typeof wallet.lifetimeCoins === "number") next.lifetimeCoins = wallet.lifetimeCoins;
    set(next);
  },
}));
