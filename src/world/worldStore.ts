// World store (Zustand) — the small slice of world state the DOM UI needs to read
// (PRD §12.2: React never re-renders the Pixi world; it reads selectors). The Pixi
// ticker owns per-frame motion; it publishes the current cell + nearby venue here.
import { create } from "zustand";
import type { Cell } from "@/lib/pathfinding";
import { SPAWN } from "./cityMap";

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
  setCharCell: (cell: Cell) => void;
  setNearVenue: (id: string | null) => void;
  setInputLocked: (locked: boolean) => void;
  setInteriorOpen: (open: boolean) => void;
}

export const useWorldStore = create<WorldState>((set) => ({
  charCell: { ...SPAWN },
  nearVenueId: null,
  inputLocked: false,
  interiorOpen: false,
  setCharCell: (charCell) => set({ charCell }),
  setNearVenue: (nearVenueId) => set((s) => (s.nearVenueId === nearVenueId ? s : { nearVenueId })),
  setInputLocked: (inputLocked) => set({ inputLocked }),
  setInteriorOpen: (interiorOpen) =>
    set((s) => (s.interiorOpen === interiorOpen ? s : { interiorOpen })),
}));
