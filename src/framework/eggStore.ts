// Easter-egg discovery store (Zustand) — client-side flavor state only (never
// touches the server-authoritative economy). Persisted best-effort so finds
// survive reloads; emits egg_found for the DOM toast layer.
import { create } from "zustand";
import { EGGS, isEggIdArray, type EggId } from "@/lib/eggs";
import { loadJson, saveJson } from "@/lib/persist";
import { events } from "@/framework/events";

const STORAGE_KEY = "city.eggs.v1";

interface EggState {
  found: EggId[];
  /** Record a discovery. Returns true only the first time an egg is found. */
  markFound: (id: EggId) => boolean;
}

export const useEggStore = create<EggState>((set, get) => ({
  found: loadJson(STORAGE_KEY, isEggIdArray) ?? [],
  markFound: (id) => {
    if (get().found.includes(id)) return false;
    const found = [...get().found, id];
    set({ found });
    saveJson(STORAGE_KEY, found);
    events.emit("egg_found", { id, title: EGGS[id].title });
    return true;
  },
}));
