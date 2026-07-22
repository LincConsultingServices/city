// HUD (PRD §9.1) — persistent, minimal. Top-left avatar chip, top-right coin
// pill (shows "—" until the backend has a wallet — BE-1), bottom-right map
// button, logout. The coin balance's source of truth is the last server value
// via the Economy seam; the client never invents it.

import { useEffect, useRef, useState } from 'react';
import { economy } from '@/framework/economy/economy';
import { events } from '@/framework/events';
import { logout } from '@/framework/auth/session';
import { useSessionStore } from '@/framework/stores/sessionStore';
import { useUiStore } from '@/framework/stores/uiStore';

export function Hud() {
  const user = useSessionStore((s) => s.user);
  const addToast = useUiStore((s) => s.addToast);
  const [balance, setBalance] = useState<number | null>(
    economy.hasBalance() ? economy.coinBalance : null,
  );
  const pillRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return events.on('coins_changed', ({ balance }) => {
      setBalance(balance);
      // Retrigger the pop animation.
      const el = pillRef.current;
      if (el) {
        el.classList.remove('animate-coin-pop');
        void el.offsetWidth; // reflow
        el.classList.add('animate-coin-pop');
      }
    });
  }, []);

  const initials = (user?.displayName || user?.email || 'C').trim().slice(0, 1).toUpperCase();

  return (
    <div className="pointer-events-none absolute inset-0 z-10 select-none">
      {/* Avatar chip */}
      <button
        type="button"
        onClick={() => addToast('Customization opens in a later phase.', 'info')}
        className="pointer-events-auto absolute left-4 top-4 flex items-center gap-2 rounded-full border border-white/10 bg-black/35 py-1 pl-1 pr-3 backdrop-blur"
      >
        <span className="grid h-8 w-8 place-items-center rounded-full bg-accent font-semibold text-night">
          {initials}
        </span>
        <span className="max-w-[160px] truncate text-sm text-white/85">
          {user?.displayName || user?.email || 'Player'}
        </span>
      </button>

      {/* Coin pill */}
      <div
        ref={pillRef}
        className="absolute right-4 top-4 flex items-center gap-1.5 rounded-full border border-white/10 bg-black/35 px-3 py-1.5 backdrop-blur"
        aria-label="Coin balance"
      >
        <span className="text-accent" aria-hidden="true">
          ●
        </span>
        <span className="text-sm font-semibold text-white">{balance === null ? '—' : balance}</span>
      </div>

      {/* Map button (F0 stub) */}
      <button
        type="button"
        onClick={() => addToast('The city map opens in a later phase.', 'info')}
        className="pointer-events-auto absolute bottom-4 right-4 rounded-full border border-white/10 bg-black/35 px-4 py-2 text-sm text-white/85 backdrop-blur hover:bg-black/50"
      >
        Map
      </button>

      {/* Logout */}
      <button
        type="button"
        onClick={() => void logout()}
        className="pointer-events-auto absolute bottom-4 left-4 rounded-full border border-white/10 bg-black/35 px-4 py-2 text-sm text-white/70 backdrop-blur hover:bg-black/50"
      >
        Log out
      </button>
    </div>
  );
}
