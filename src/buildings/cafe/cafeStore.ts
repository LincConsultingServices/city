// Building-owned world state for the Café interior. Mirrors the split the city
// proved in world/worldStore.ts: the Pixi ticker writes through `getState()`,
// React reads through selectors, and nothing about the room re-renders React
// except the handful of fields the DOM actually shows.
//
// Setters are identity-guarded — they return the same state object when nothing
// changed — because the ticker calls them every frame.
import { create } from "zustand";
import type { Cell } from "@/lib/pathfinding";
import { audio } from "@/framework/audio/audioManager";
import { GATES, HOTSPOTS, SPAWN, zoneAt, type GateId, type ZoneId } from "./room";
import { castById, type CastId } from "./cast";
import {
  OPENING_WORLD,
  announcementFor,
  applyPatch,
  changedKeys,
  type World,
  type WorldPatch,
} from "./world";

export interface Announcement {
  text: string;
  /** Bumped on every push so repeating the same text still re-announces. */
  seq: number;
}

interface CafeState {
  charCell: Cell;
  zoneId: ZoneId;
  /** Standing on or beside the door. */
  nearExit: boolean;
  /** The gate you are close enough to work, if any. */
  nearGateId: GateId | null;
  /** The hotspot you are close enough to read, if any. */
  nearHotspotId: string | null;
  /** The person you are close enough to speak to, if any. */
  nearCastId: CastId | null;
  /** The hotspot whose panel is open, if any. */
  openHotspotId: string | null;
  /** Who you are mid-conversation with, if anyone. */
  speakingToId: CastId | null;
  /** What they just said. Held here so the DOM and the live region agree. */
  spokenLine: string;
  flapOpen: boolean;
  /**
   * A request from the DOM for the room to walk somewhere — the keyboard station
   * list. The canvas paths there and clears it, the same shape `flapOpen` uses.
   */
  walkTo: Cell | null;
  /**
   * The ten keys of PRD §12. Presentation only — nothing here reaches the
   * submitted trace, and nothing here decides a proficiency.
   */
  world: World;
  /** True while a DOM panel is up — the room ignores clicks and WASD. */
  inputLocked: boolean;
  announcement: Announcement;

  setCharCell: (cell: Cell) => void;
  setNearExit: (near: boolean) => void;
  setNearGate: (id: GateId | null) => void;
  setNearHotspot: (id: string | null) => void;
  setNearCast: (id: CastId | null) => void;
  setOpenHotspot: (id: string | null) => void;
  setSpeaking: (id: CastId | null, line: string) => void;
  setFlapOpen: (open: boolean) => void;
  setWalkTo: (cell: Cell | null) => void;
  setInputLocked: (locked: boolean) => void;
  announce: (text: string) => void;
}

export const useCafeStore = create<CafeState>((set) => ({
  charCell: { ...SPAWN },
  zoneId: zoneAt(SPAWN).id,
  nearExit: false,
  nearGateId: null,
  nearHotspotId: null,
  nearCastId: null,
  openHotspotId: null,
  speakingToId: null,
  spokenLine: "",
  world: { ...OPENING_WORLD },
  flapOpen: false,
  walkTo: null,
  inputLocked: false,
  announcement: { text: "", seq: 0 },

  setCharCell: (charCell) =>
    set((s) => {
      if (s.charCell.x === charCell.x && s.charCell.y === charCell.y) return s;
      const zoneId = zoneAt(charCell).id;
      return zoneId === s.zoneId ? { charCell } : { charCell, zoneId };
    }),
  setNearExit: (nearExit) => set((s) => (s.nearExit === nearExit ? s : { nearExit })),
  setNearGate: (nearGateId) => set((s) => (s.nearGateId === nearGateId ? s : { nearGateId })),
  setNearHotspot: (nearHotspotId) =>
    set((s) => (s.nearHotspotId === nearHotspotId ? s : { nearHotspotId })),
  setNearCast: (nearCastId) => set((s) => (s.nearCastId === nearCastId ? s : { nearCastId })),
  setOpenHotspot: (openHotspotId) =>
    set((s) =>
      s.openHotspotId === openHotspotId
        ? s
        : { openHotspotId, inputLocked: openHotspotId !== null },
    ),
  setSpeaking: (speakingToId, spokenLine) =>
    set({ speakingToId, spokenLine, inputLocked: speakingToId !== null }),
  setWalkTo: (walkTo) => set({ walkTo }),
  setFlapOpen: (flapOpen) => set((s) => (s.flapOpen === flapOpen ? s : { flapOpen })),
  setInputLocked: (inputLocked) =>
    set((s) => (s.inputLocked === inputLocked ? s : { inputLocked })),
  announce: (text) => set((s) => ({ announcement: { text, seq: s.announcement.seq + 1 } })),
}));

/**
 * Work the counter flap. Both call sites — clicking the flap in the room and
 * pressing E beside it — come through here, so the guard and the feedback are
 * identical either way.
 *
 * Closing it while you are standing on it is refused: the cell becomes a wall the
 * moment it shuts, and the player would be inside the counter.
 */
export function toggleFlap(): boolean {
  const s = useCafeStore.getState();
  const gate = GATES[0];
  const standingOnIt = s.charCell.x === gate.cell.x && s.charCell.y === gate.cell.y;

  if (s.flapOpen && standingOnIt) {
    audio.play("ui_error");
    s.announce("Step off the flap before you lower it.");
    return false;
  }

  const next = !s.flapOpen;
  s.setFlapOpen(next);
  audio.play(next ? "ui_open" : "ui_close");
  s.announce(next ? gate.openedSays : gate.closedSays);
  return true;
}

/**
 * Fresh state for a new visit: back at the door, flap down. Called on mount so
 * the store and the canvas's own gate set start in step — the canvas boots with
 * no gates open, and a stale `flapOpen: true` here would desync the two.
 */
export function resetCafeState(): void {
  resetSpoken();
  useCafeStore.setState({
    charCell: { ...SPAWN },
    zoneId: zoneAt(SPAWN).id,
    nearExit: false,
    nearGateId: null,
    nearHotspotId: null,
    nearCastId: null,
    openHotspotId: null,
    speakingToId: null,
    spokenLine: "",
    world: { ...OPENING_WORLD },
    flapOpen: false,
    walkTo: null,
    inputLocked: false,
    announcement: { text: "", seq: 0 },
  });
}

/**
 * Open a hotspot's panel. Locks the room's input while it is up, exactly as the
 * world does behind its own panels, so a click on the modal cannot also order
 * the player to walk somewhere.
 */
export function openHotspot(id: string): void {
  const s = useCafeStore.getState();
  const spot = HOTSPOTS.find((h) => h.id === id);
  if (!spot) return;
  audio.play("ui_open");
  s.setOpenHotspot(id);
  s.announce(`${spot.title}. ${spot.body}`);
}

export function closeHotspot(): void {
  audio.play("ui_close");
  useCafeStore.getState().setOpenHotspot(null);
}

/**
 * Change something about the room.
 *
 * Every key that actually moves is announced, because a consequence that exists
 * only in the picture is a consequence half the audience never receives (PRD
 * §15). Illegal writes are dropped by the reducer and therefore announce
 * nothing, which is the right failure: a typo in a decision's world write costs
 * a change, never a crash and never a wrong line.
 */
export function writeWorld(patch: WorldPatch): void {
  const s = useCafeStore.getState();
  const moved = changedKeys(s.world, patch);
  if (moved.length === 0) return;

  const next = applyPatch(s.world, patch);
  useCafeStore.setState({ world: next });

  const said = moved
    .map((k) => announcementFor(k, next[k] as never))
    .filter((line): line is string => line !== null);
  if (said.length > 0) s.announce(said.join(" "));
}

/**
 * Say hello. Which line comes out is a plain rotation rather than a random pick:
 * a room where the same person says the same random thing twice running reads as
 * broken, and cycling means a player who talks to Priya four times hears four
 * different things and then a repeat they can predict.
 */
const spokenCount = new Map<CastId, number>();

export function speakTo(id: CastId): void {
  const member = castById(id);
  if (!member || member.ambientLines.length === 0) return;
  const n = spokenCount.get(id) ?? 0;
  spokenCount.set(id, n + 1);
  const line = member.ambientLines[n % member.ambientLines.length];
  const s = useCafeStore.getState();
  audio.play("ui_open");
  s.setSpeaking(id, line);
  s.announce(`${member.name}. ${line}`);
}

export function stopSpeaking(): void {
  audio.play("ui_close");
  useCafeStore.getState().setSpeaking(null, "");
}

/** Fresh rotation for a fresh visit, so re-entering starts the room over. */
function resetSpoken(): void {
  spokenCount.clear();
}
