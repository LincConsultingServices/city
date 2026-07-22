// Economy — mirrors of wallet / inventory / avatar, updated ONLY from server
// responses (PRD §9, §11.2). The client never invents coins or awards.
// Ported as a concept from the Godot F0 (autoload/economy.gd).
//
// F0/F1 STATUS: the live backend has NO wallet/shop/inventory/avatar routes and
// its submit response carries NO coinsEarned/coinBalance yet (backend BE-1). So
// this is a WIRED-BUT-UNFED seam: the plumbing (applySubmitResponse → events)
// is complete and unit-testable, holds NO fake data, and starts feeding the
// moment those fields appear. Until then the HUD coin pill shows "—".

import { events } from '@/framework/events';

const UNKNOWN_BALANCE = -1;

interface SubmitLike {
  coinBalance?: number;
  coinsEarned?: number;
  badgesAwarded?: unknown[];
}

class Economy {
  coinBalance = UNKNOWN_BALANCE; // -1 until the first server value
  inventory: unknown[] = []; // owned cosmetics (GET /inventory — future)
  equipped: Record<string, unknown> = {}; // { SKIN, HAT, BACKGROUND, PET } (future)

  hasBalance(): boolean {
    return this.coinBalance !== UNKNOWN_BALANCE;
  }

  /**
   * Fold a submit response into the mirrors and announce changes. Server is the
   * only source. Safe to call with today's response (no coin fields) — it emits
   * nothing for coins and whatever badges the server did award.
   */
  applySubmitResponse(resp: SubmitLike): void {
    if (typeof resp.coinBalance === 'number') {
      const balance = resp.coinBalance;
      const delta = resp.coinsEarned ?? 0;
      this.coinBalance = balance;
      events.emit('coins_changed', { balance, delta });
    }
    for (const badge of resp.badgesAwarded ?? []) {
      events.emit('badge_awarded', { badge });
    }
  }

  /** Direct wallet set (from a future GET /me or GET /wallet response). */
  setBalance(balance: number): void {
    this.coinBalance = balance;
    events.emit('coins_changed', { balance, delta: 0 });
  }

  reset(): void {
    this.coinBalance = UNKNOWN_BALANCE;
    this.inventory = [];
    this.equipped = {};
  }
}

export const economy = new Economy();
