// The manual save file — one slot, saved when the player says so.
//
// Auto-save keeps going underneath this exactly as before: every building's
// session is written to the account as you play. A manual save is a checkpoint
// on top of it — "keep this moment" — that the player can load back to, delete,
// or ignore. Restart is the same machinery pointed at nothing: every building
// goes back to its first visit.
//
// What a save carries is WHERE you are, never what you have earned:
//   - each building's session (the café career, its answers so far, the room);
//   - MAISON's season, which lives only in this browser;
// and not coins, badges, scores or the level choice, which the server owns and
// a client may not rewind. Replaying a graded stage after a load is a new
// attempt on the record, and a career's coins are paid once — the server's
// rules, not this file's (journey_service.go §bank, §nextAttemptNo).
//
// Kept on this device, scoped to the signed-in player. A copy on the account
// needs a backend endpoint; the session documents it would hold are capped at
// 8–16 KB and have no slot for it.
import { loadJson, saveJson } from "@/lib/persist";
import { heldBuildings, readSession, replaceSession, sessionOwner } from "@/framework/session/sync";
import { STORAGE_KEY as MAISON_KEY } from "@/buildings/fashion_brand/maisonStore";

export interface ManualSave {
  version: 1;
  /** When it was saved, ISO. */
  savedAt: string;
  /** Building id → that building's session blob, for every building with progress. */
  sessions: Record<string, unknown>;
  /** MAISON's season as stored, or null when there was none. */
  maison: unknown | null;
}

const isSave = (v: unknown): v is ManualSave =>
  typeof v === "object" &&
  v !== null &&
  (v as ManualSave).version === 1 &&
  typeof (v as ManualSave).savedAt === "string" &&
  typeof (v as ManualSave).sessions === "object" &&
  (v as ManualSave).sessions !== null;

const key = () => `city.${sessionOwner()}.save.manual.v1`;

/** The current save file, if there is one. */
export function readManualSave(): ManualSave | null {
  return loadJson(key(), isSave);
}

/**
 * Save the game now, replacing any earlier manual save. Reads what auto-save
 * has already written locally, which is always current — every change is
 * mirrored here before it is sent.
 */
export function writeManualSave(now: Date = new Date()): ManualSave {
  const sessions: Record<string, unknown> = {};
  for (const id of heldBuildings()) {
    const blob = readSession(id);
    if (blob != null) sessions[id] = blob;
  }
  const save: ManualSave = {
    version: 1,
    savedAt: now.toISOString(),
    sessions,
    maison: readRaw(MAISON_KEY),
  };
  saveJson(key(), save);
  return save;
}

/** Delete the manual save. Auto-save and the game itself are untouched. */
export function deleteManualSave(): void {
  try {
    window.localStorage.removeItem(key());
  } catch {
    /* storage unavailable — there was nothing to delete */
  }
}

/**
 * Put the game back where the save file left it.
 *
 * Every building with progress now but none in the save is reset, so loading
 * a save made before you ever entered MAISON takes MAISON back to its door.
 * Resolves true when the account accepted all of it; false means it is in
 * place on this device and uploads on the next good load.
 *
 * The caller reloads the page afterwards: the buildings read their state when
 * they start, and a reload is the one way to be sure nothing old is held.
 */
export async function loadManualSave(save: ManualSave): Promise<boolean> {
  return applySnapshot(save.sessions, save.maison);
}

/**
 * Start the game over: every building back to its first visit. Keeps coins,
 * badges, the level choice and the manual save itself. Same reload contract as
 * `loadManualSave`.
 */
export async function restartGame(): Promise<boolean> {
  return applySnapshot({}, null);
}

async function applySnapshot(
  sessions: Record<string, unknown>,
  maison: unknown | null,
): Promise<boolean> {
  const ids = new Set([...heldBuildings(), ...Object.keys(sessions)]);
  let allOk = true;
  for (const id of ids) {
    const ok = await replaceSession(id, sessions[id] ?? null);
    if (!ok) allOk = false;
  }
  if (maison != null) saveJson(MAISON_KEY, maison);
  else removeRaw(MAISON_KEY);
  return allOk;
}

function readRaw(k: string): unknown | null {
  try {
    const raw = window.localStorage.getItem(k);
    return raw == null ? null : (JSON.parse(raw) as unknown);
  } catch {
    return null;
  }
}

function removeRaw(k: string): void {
  try {
    window.localStorage.removeItem(k);
  } catch {
    /* storage unavailable */
  }
}
