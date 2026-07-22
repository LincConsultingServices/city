// World store (Zustand) — the DISCRETE world/interaction state shared across the
// Pixi↔React seam (PRD §12.2). The Pixi ticker reads target/path/zoomStep each
// frame via getState()/subscribe (never through React) and writes nearestVenue/
// characterState only when they change. React DOM reads slices via the hook.
//
// Per-FRAME transforms (character pixel position, camera offset) do NOT live
// here — they live on the Pixi objects + the `viewport` singleton, so 60fps
// updates never trigger React renders.

import { create } from 'zustand';
import type { Cell } from '@/lib/iso';

export type CharacterState = 'idle' | 'walk' | 'enter';

export interface NearestVenue {
  id: string;
  inRange: boolean;
}

interface WorldState {
  zoomStep: number; // 0=street, 1=block, 2=district
  target: Cell | null; // click-to-move goal
  path: Cell[]; // remaining steps
  nearestVenue: NearestVenue | null;
  characterState: CharacterState;
  visitedVenues: string[];

  setTarget: (c: Cell | null) => void;
  setPath: (p: Cell[]) => void;
  setZoomStep: (n: number) => void;
  setNearestVenue: (v: NearestVenue | null) => void;
  setCharacterState: (s: CharacterState) => void;
  markVisited: (id: string) => void;
  reset: () => void;
}

export const ZOOM_STEPS = 3;

export const useWorldStore = create<WorldState>((set, get) => ({
  zoomStep: 0,
  target: null,
  path: [],
  nearestVenue: null,
  characterState: 'idle',
  visitedVenues: [],

  setTarget: (target) => set({ target }),
  setPath: (path) => set({ path }),
  setZoomStep: (zoomStep) => set({ zoomStep: Math.max(0, Math.min(ZOOM_STEPS - 1, zoomStep)) }),
  setNearestVenue: (nearestVenue) => set({ nearestVenue }),
  setCharacterState: (characterState) => set({ characterState }),
  markVisited: (id) =>
    set(get().visitedVenues.includes(id) ? {} : { visitedVenues: [...get().visitedVenues, id] }),
  reset: () =>
    set({
      zoomStep: 0,
      target: null,
      path: [],
      nearestVenue: null,
      characterState: 'idle',
      visitedVenues: [],
    }),
}));
