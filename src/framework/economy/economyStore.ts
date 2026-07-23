// Economy mirror (PRD §9, §12.1) — updated ONLY from server responses (submit /me /
// wallet). Holds NO fake data: coinBalance stays null until a real balance arrives,
// so the HUD shows "—" rather than inventing coins. The wallet/shop/avatar endpoints
// are additive backend work (§21 BE-1..BE-4); this seam starts feeding the moment
// they land or a submit returns coinBalance.
import { create } from "zustand";

interface EconomyState {
  coinBalance: number | null;
  applyCoinBalance: (balance: number | undefined) => void;
}

export const useEconomyStore = create<EconomyState>((set) => ({
  coinBalance: null,
  applyCoinBalance: (balance) => {
    if (typeof balance === "number") set({ coinBalance: balance });
  },
}));
