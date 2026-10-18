// World store (Zustand) — the small slice of world state the DOM UI needs to read
// (PRD §12.2: React never re-renders the Pixi world; it reads selectors). The Pixi
// ticker owns per-frame motion; it publishes the current cell + nearby venue here.
import { create } from "zustand";
import type { Cell } from "@/lib/pathfinding";
import { SPAWN } from "./cityMap";
import { BOOT_PHASE_OFFSET_S, clockMinutes, dayPhase } from "@/lib/daycycle";
import type { Destination } from "./navigation";

interface WorldState {
  charCell: Cell;
  nearVenueId: string | null;
  inputLocked: boolean; // true while a panel is open → world ignores WASD/clicks
  /**
   * True while a building interior is mounted. The interior runs its own
   * Application and covers the screen completely, so the city freezes its ticker
   * rather than render a second world nobody can see (PRD §12.3 budgets).
   */
  interiorOpen: boolean;
  /** In-game minute of the day (0..1439), from the day/night cycle. */
  clockMinutes: number;
  /**
   * Where the player has marked on the map. The guide arrow points along the
   * route to it, and it clears itself on arrival.
   */
  destination: Destination | null;
  /**
   * A request from the map to walk the player to the destination. The world
   * paths there and clears it — the same shape the café's guided list uses.
   */
  walkRequested: boolean;
  setCharCell: (cell: Cell) => void;
  setNearVenue: (id: string | null) => void;
  setInputLocked: (locked: boolean) => void;
  setInteriorOpen: (open: boolean) => void;
  setClockMinutes: (minutes: number) => void;
  setDestination: (dest: Destination | null) => void;
  requestWalk: (walk: boolean) => void;
}

export const useWorldStore = create<WorldState>((set) => ({
  charCell: { ...SPAWN },
  nearVenueId: null,
  inputLocked: false,
  interiorOpen: false,
  clockMinutes: clockMinutes(dayPhase(BOOT_PHASE_OFFSET_S).t),
  destination: null,
  walkRequested: false,
  setCharCell: (charCell) => set({ charCell }),
  setNearVenue: (nearVenueId) => set((s) => (s.nearVenueId === nearVenueId ? s : { nearVenueId })),
  setInputLocked: (inputLocked) => set({ inputLocked }),
  setInteriorOpen: (interiorOpen) =>
    set((s) => (s.interiorOpen === interiorOpen ? s : { interiorOpen })),
  setClockMinutes: (minutes) =>
    set((s) => (s.clockMinutes === minutes ? s : { clockMinutes: minutes })),
  setDestination: (destination) => set({ destination, walkRequested: false }),
  requestWalk: (walkRequested) => set({ walkRequested }),
}));
