// UI store (Zustand) — DOM-only UI state: toasts and the active venue overlay.
// The world-anchored "Press E" prompt derives from worldStore.nearestVenue, so
// it is not duplicated here.

import { create } from 'zustand';

export type ToastLevel = 'info' | 'success' | 'error';

export interface Toast {
  id: number;
  message: string;
  level: ToastLevel;
}

interface UiState {
  toasts: Toast[];
  activeOverlay: string | null; // building id, or null

  addToast: (message: string, level: ToastLevel) => void;
  removeToast: (id: number) => void;
  setOverlay: (id: string | null) => void;
}

let nextToastId = 1;

export const useUiStore = create<UiState>((set) => ({
  toasts: [],
  activeOverlay: null,

  addToast: (message, level) =>
    set((s) => ({ toasts: [...s.toasts, { id: nextToastId++, message, level }] })),
  removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  setOverlay: (activeOverlay) => set({ activeOverlay }),
}));
