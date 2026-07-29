// Where you are in the room. Distinct from maisonStore, which holds the SEASON
// (the track, the world state, the beats you decided) and survives a reload —
// this is per-visit and dies with the interior.
//
// Mirrors the split the city proved in world/worldStore.ts: the Pixi ticker
// writes through `getState()`, React reads through selectors, and nothing
// re-renders except the handful of fields the DOM actually shows. Setters are
// identity-guarded because the ticker calls them every frame.
import { create } from "zustand";
import type { Cell } from "@/lib/pathfinding";
import { audio } from "@/framework/audio/audioManager";
import { SPAWN, zoneAt, type ZoneId } from "./room";
import { useMaisonStore } from "./maisonStore";
import type { GuideTarget } from "./guide";
import { describeCash, describePress, describeRail } from "./world";

/**
 * Which reader is up over the room. The shell renders them; the store decides
 * which one, so the click in the room and the E key reach the same panel by the
 * same path (§18.2.5).
 */
export type PanelId = "beat" | "rail" | "lookbook" | "phone" | "mirror";

export interface Announcement {
  text: string;
  /** Bumped on every push so repeating the same text still re-announces. */
  seq: number;
}

interface RoomState {
  charCell: Cell;
  zoneId: ZoneId;
  /** Standing on or beside the shopfront door. */
  nearExit: boolean;
  /** The station you are close enough to use, if any. */
  nearStationId: string | null;
  /** True while a DOM panel is up — the room ignores clicks and WASD. */
  inputLocked: boolean;
  /** The reader currently over the room, if any. */
  panel: PanelId | null;
  /**
   * A request from the DOM for the room to walk somewhere — the station list
   * (§7). The canvas paths there and clears it. Named and shaped to match the
   * Café's, because it is the same idea and interiors should not each invent
   * their own vocabulary for it.
   */
  walkTo: Cell | null;
  /**
   * Whether the beat waiting at this station is actually openable — the row has
   * loaded and has content. The season query lives in React, so the shell
   * publishes the answer here rather than the store reaching for it.
   */
  beatReady: boolean;
  announcement: Announcement;

  setCharCell: (cell: Cell) => void;
  setNearExit: (near: boolean) => void;
  setNearStation: (id: string | null) => void;
  setInputLocked: (locked: boolean) => void;
  setPanel: (panel: PanelId | null) => void;
  setWalkTo: (cell: Cell | null) => void;
  setBeatReady: (ready: boolean) => void;
  announce: (text: string) => void;
}

export const useRoomStore = create<RoomState>((set) => ({
  charCell: { ...SPAWN },
  zoneId: zoneAt(SPAWN).id,
  nearExit: false,
  nearStationId: null,
  inputLocked: false,
  panel: null,
  walkTo: null,
  beatReady: false,
  announcement: { text: "", seq: 0 },

  setCharCell: (charCell) =>
    set((s) => {
      if (s.charCell.x === charCell.x && s.charCell.y === charCell.y) return s;
      const zoneId = zoneAt(charCell).id;
      return zoneId === s.zoneId ? { charCell } : { charCell, zoneId };
    }),
  setNearExit: (nearExit) => set((s) => (s.nearExit === nearExit ? s : { nearExit })),
  setNearStation: (nearStationId) =>
    set((s) => (s.nearStationId === nearStationId ? s : { nearStationId })),
  setInputLocked: (inputLocked) =>
    set((s) => (s.inputLocked === inputLocked ? s : { inputLocked })),
  setPanel: (panel) => set((s) => (s.panel === panel ? s : { panel })),
  setWalkTo: (walkTo) => set({ walkTo }),
  setBeatReady: (beatReady) => set((s) => (s.beatReady === beatReady ? s : { beatReady })),
  announce: (text) => set((s) => ({ announcement: { text, seq: s.announcement.seq + 1 } })),
}));

/** Fresh state for a new visit: back at the desk, nothing open. */
export function resetRoomState(): void {
  useRoomStore.setState({
    charCell: { ...SPAWN },
    zoneId: zoneAt(SPAWN).id,
    nearExit: false,
    nearStationId: null,
    inputLocked: false,
    panel: null,
    walkTo: null,
    beatReady: false,
    announcement: { text: "", seq: 0 },
  });
}

/**
 * Send the player to a guided-navigation target (§7, §18.2.5).
 *
 * Announces where they are going before they go, because on a keyboard the
 * announcement IS the view — a walk that starts silently is a walk to nowhere
 * you can name. Returns false if the room is frozen under a panel.
 */
export function travelTo(target: GuideTarget): boolean {
  const s = useRoomStore.getState();
  if (s.inputLocked) return false;
  s.setWalkTo(target.cell);
  s.announce(`Walking to ${target.label}.`);
  return true;
}

/**
 * What the thing in front of you does.
 *
 * One guarded path, reached from both the E key and a click on the prop itself,
 * because a guard that lives in only one of them is a guard that drifts. It
 * returns whether it did anything, so the caller can tell a readout apart from
 * a shrug.
 *
 * Everything here reports. Nothing rates, ranks or congratulates (§11) — the
 * press wall says what the press said, and the rail says what is on the rail.
 */
export function actHere(): boolean {
  const s = useRoomStore.getState();
  if (s.inputLocked) return false;

  const open = (panel: PanelId, says?: string) => {
    audio.play("ui_open");
    s.setPanel(panel);
    if (says) s.announce(says);
    return true;
  };
  const read = (says: string) => {
    audio.play("ui_click");
    s.announce(says);
    return true;
  };

  const w = useMaisonStore.getState().world;

  // A waiting beat outranks the station's own readout: walking up to whoever is
  // holding this week's problem is how the season advances (§8).
  if (s.beatReady) return open("beat");

  switch (s.nearStationId) {
    case "st_phone":
      return open("phone");
    case "st_desk":
      return open("lookbook");
    case "st_rail":
      // The blocking a11y criterion (§18.2.4): inspecting the rail produces a
      // complete list of what is on it. A player who cannot see the rail reads
      // the same season off it.
      return open("rail", describeRail(w));
    case "st_fitting":
      return open("mirror");
    case "st_press_wall":
      return read(describePress(w));
    case "st_column":
      return read(`The column reads ${w.countdown}.`);
    case "st_cutting_table":
    case "st_bench":
      return read(describeCash(w));
  }

  // Nothing here. Say so — a keypress that does nothing and makes no sound is
  // indistinguishable from a broken one.
  audio.play("ui_error");
  s.announce("Nothing to look at from here.");
  return false;
}
