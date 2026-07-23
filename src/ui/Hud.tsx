import { useAuth } from "@/framework/auth/AuthProvider";
import { signOutUser } from "@/framework/auth/firebase";
import { useEconomyStore } from "@/framework/economy/economyStore";

// Persistent minimal HUD (PRD §9.1). Coin balance is server-authoritative; until
// the economy endpoints land (§21 BE-1) it shows "—" — never fake data.
export function Hud() {
  const { user } = useAuth();
  const coins = useEconomyStore((s) => s.coinBalance);
  const initial = (user?.displayName || user?.email || "?").charAt(0).toUpperCase();

  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      {/* Top-left: avatar chip */}
      <div className="pointer-events-auto absolute left-4 top-4 flex items-center gap-2 rounded-full border border-line/70 bg-surface/80 py-1 pl-1 pr-3 backdrop-blur">
        <div className="grid h-8 w-8 place-items-center rounded-full bg-gold font-semibold text-ink">
          {initial}
        </div>
        <span className="max-w-[140px] truncate text-sm text-text">
          {user?.displayName || user?.email || "Player"}
        </span>
      </div>

      {/* Top-right: coins + logout */}
      <div className="pointer-events-auto absolute right-4 top-4 flex items-center gap-2">
        <div
          className="flex items-center gap-1.5 rounded-full border border-line/70 bg-surface/80 px-3 py-1.5 backdrop-blur"
          title={coins === null ? "Wallet endpoint not live yet (PRD §21 BE-1)" : "Coins"}
        >
          <span className="grid h-4 w-4 place-items-center rounded-full bg-coin text-[10px] font-bold text-ink">
            ¢
          </span>
          <span className="tabular-nums text-sm text-text">{coins === null ? "—" : coins}</span>
        </div>
        <button
          onClick={() => void signOutUser()}
          className="rounded-full border border-line/70 bg-surface/80 px-3 py-1.5 text-sm text-muted backdrop-blur hover:text-text"
        >
          Log out
        </button>
      </div>
    </div>
  );
}
