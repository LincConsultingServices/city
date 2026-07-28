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
import { SPAWN, zoneAt, type ZoneId } from "./room";

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
  announcement: Announcement;

  setCharCell: (cell: Cell) => void;
  setNearExit: (near: boolean) => void;
  setNearStation: (id: string | null) => void;
  setInputLocked: (locked: boolean) => void;
  announce: (text: string) => void;
}

export const useRoomStore = create<RoomState>((set) => ({
  charCell: { ...SPAWN },
  zoneId: zoneAt(SPAWN).id,
  nearExit: false,
  nearStationId: null,
  inputLocked: false,
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
    announcement: { text: "", seq: 0 },
  });
}
