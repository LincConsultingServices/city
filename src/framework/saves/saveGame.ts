// Save games, GTA-style: six named slots, an Autosave slot, load, restart, and
// an autosave switch (academy-backend/internal/services/save_service.go).
//
// A save is the whole game — story, cash, the bank, badges, shop items, the
// character — and it lives on the account, so it follows the player to any
// device. The server does the saving and the loading; this module asks it to,
// says what the story is for the slot card, and makes sure that after a load
// or a restart nothing old is left in this browser to be sent back up.
//
// Autosave off means a session that ends without saving is lost: the game
// opens next time back at the last save (startGameSession).
import { api } from "@/framework/api";
import type { SaveSlot, SaveState } from "@/framework/api";
import { readSession, sessionOwner } from "@/framework/session/sync";
import { STORAGE_KEY as MAISON_KEY } from "@/buildings/fashion_brand/maisonStore";
import { ROLE_LABEL, stageById } from "@/buildings/cafe/journey";
import { useBankStore } from "@/framework/bank/bankStore";
import { defaultIdentity, storeIdentity, useIdentity } from "@/framework/player/identity";
import { events } from "@/framework/events";

// ── What the slot card says ──────────────────────────────────────────────────

/** Where the player is in the story, in a line: "Café · Employee · The Counter". */
export function storyLabel(): string {
  const parts: string[] = [];
  const cafe = readSession("cafe") as { stageId?: unknown; role?: unknown } | null;
  const stage = typeof cafe?.stageId === "string" ? stageById(cafe.stageId) : undefined;
  const role =
    typeof cafe?.role === "string" ? ROLE_LABEL[cafe.role as keyof typeof ROLE_LABEL] : "";

  if (stage?.kind === "exit") {
    if (cafe?.role === "ceo") {
      const bank = useBankStore.getState();
      parts.push(bank.account ? "Meridian Bank · account open" : "Café finished · on to the bank");
    } else {
      parts.push("Left the café");
    }
  } else if (stage) {
    parts.push(`Café · ${role ? `${role} · ` : ""}${stage.title}`);
  }

  const maison = readJson(MAISON_KEY) as { decided?: unknown } | null;
  if (maison && Array.isArray(maison.decided) && maison.decided.length > 0) {
    parts.push(
      `MAISON · ${maison.decided.length} ${maison.decided.length === 1 ? "beat" : "beats"}`,
    );
  }
  return parts.length ? parts.join(" · ") : "The start of the game";
}

// ── What only this browser holds ─────────────────────────────────────────────

function readJson(key: string): unknown | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw == null ? null : (JSON.parse(raw) as unknown);
  } catch {
    return null;
  }
}

/** MAISON's season lives only in this browser, so a save carries it along. */
function browserExtra(): string {
  try {
    return window.localStorage.getItem(MAISON_KEY) ?? "";
  } catch {
    return "";
  }
}

/**
 * Forget this browser's copies of the game, so after a load or restart the
 * page reads everything fresh from the server and sends nothing old back up.
 * The level choice and settings stay.
 */
function forgetLocalGame(extra: string): void {
  try {
    const prefix = `city.${sessionOwner()}.`;
    const doomed: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k && (k.startsWith(prefix) || k === "city.state" || k === MAISON_KEY)) doomed.push(k);
    }
    for (const k of doomed) window.localStorage.removeItem(k);
    if (extra) window.localStorage.setItem(MAISON_KEY, extra);
  } catch {
    /* storage unavailable: nothing held to forget */
  }
}

// ── Opening the game ─────────────────────────────────────────────────────────

let session: Promise<void> | null = null;

/**
 * Called before anything else reads the game. With autosave off and an
 * unsaved session behind it, the server has just put the game back at the
 * last save: forget this browser's copies and reload, with a note to say why.
 */
export function ensureGameSession(): Promise<void> {
  if (!session) {
    session = api
      .startGameSession()
      .then((res) => {
        autosaveOn = res.state.autosave;
        if (!res.reverted) return;
        forgetLocalGame(res.extra);
        try {
          window.sessionStorage.setItem(
            REVERT_NOTE,
            res.state.anchorName
              ? `You're back at your save “${res.state.anchorName}”.`
              : "You're back at your last save.",
          );
        } catch {
          /* no note, then */
        }
        window.location.reload();
        return new Promise<void>(() => undefined); // the page is going away
      })
      .catch(() => undefined); // offline: play on with what we have
  }
  return session;
}

const REVERT_NOTE = "city.save.reverted";

/** Said once after the game was put back at the last save. */
export function takeRevertNote(): string | null {
  try {
    const note = window.sessionStorage.getItem(REVERT_NOTE);
    if (note) window.sessionStorage.removeItem(REVERT_NOTE);
    return note ? `Autosave was off, so your last session wasn't kept. ${note}` : null;
  } catch {
    return null;
  }
}

// ── Saving, loading, restarting ──────────────────────────────────────────────

export interface Saves {
  slots: SaveSlot[];
  state: SaveState;
}

export function listSaves(): Promise<Saves> {
  return api.listSaves().then((r) => {
    autosaveOn = r.state.autosave;
    return r;
  });
}

export function saveToSlot(slot: string, name: string): Promise<SaveSlot | null> {
  return api.saveGame(slot, name, storyLabel(), browserExtra()).then((r) => r.slot);
}

export function renameSlot(slot: string, name: string): Promise<SaveSlot | null> {
  return api.renameSave(slot, name).then((r) => r.slot);
}

export function deleteSlot(slot: string): Promise<unknown> {
  return api.deleteSave(slot);
}

/** Load a slot, then reload the page so every building starts from it. */
export async function loadSlot(slot: string): Promise<void> {
  const res = await api.loadGame(slot);
  forgetLocalGame(res.extra);
  window.location.reload();
}

/**
 * A brand-new game: cash back to the starting $100, no badges, no bank
 * account, every building from the beginning. The character keeps its name
 * and gender (the creator opens on a fresh look); the level choice and the
 * saves are kept. Then the page reloads.
 */
export async function restartGame(): Promise<void> {
  const current = useIdentity.getState().identity;
  await api.restartGameOnServer();
  forgetLocalGame("");
  if (current) await storeIdentity(defaultIdentity(current.name, current.gender));
  window.location.reload();
}

// ── Autosave ─────────────────────────────────────────────────────────────────

let autosaveOn = true;
let lastAutosave = 0;
/** Never more often than this, however many moments call for one. */
const AUTOSAVE_GAP_MS = 60_000;

export function isAutosaveOn(): boolean {
  return autosaveOn;
}

export async function setAutosave(on: boolean): Promise<SaveState> {
  const r = await api.setAutosave(on, storyLabel(), browserExtra());
  autosaveOn = r.state.autosave;
  events.emit("toast", {
    message: on
      ? "Autosave is on."
      : "Autosave is off. Save before you close the game, or this session will be lost.",
    kind: "info",
  });
  return r.state;
}

/**
 * Write the Autosave slot — at a key moment (leaving a building, finishing a
 * stage, the bank) or on the timer. Does nothing when autosave is off, and is
 * throttled so a burst of moments costs one save.
 */
export function autosave(force = false): void {
  if (!autosaveOn) return;
  const now = Date.now();
  if (!force && now - lastAutosave < AUTOSAVE_GAP_MS) return;
  lastAutosave = now;
  void api.saveGame("auto", "Autosave", storyLabel(), browserExtra()).catch(() => undefined);
}
