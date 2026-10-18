// Player preferences that are not audio (audio keeps its own, in audioManager).
//
// Per-browser conveniences — whether the minimap is showing, whether the guide
// arrow is — so localStorage is the right home: losing them costs a click, and
// none of it is progress.
import { create } from "zustand";
import { loadJson, saveJson } from "@/lib/persist";

const STORAGE_KEY = "city.settings.v1";

export interface Settings {
  /** The round minimap in the bottom-left corner. */
  showMinimap: boolean;
  /** The arrow at your feet pointing to your marker. */
  showGuide: boolean;
}

const DEFAULTS: Settings = { showMinimap: true, showGuide: true };

const isSettings = (v: unknown): v is Partial<Settings> => typeof v === "object" && v !== null;

interface SettingsState extends Settings {
  set: (patch: Partial<Settings>) => void;
}

export const useSettings = create<SettingsState>((set, get) => {
  const saved = loadJson(STORAGE_KEY, isSettings) ?? {};
  return {
    showMinimap: typeof saved.showMinimap === "boolean" ? saved.showMinimap : DEFAULTS.showMinimap,
    showGuide: typeof saved.showGuide === "boolean" ? saved.showGuide : DEFAULTS.showGuide,
    set: (patch) => {
      set(patch);
      const { showMinimap, showGuide } = get();
      saveJson(STORAGE_KEY, { showMinimap, showGuide });
    },
  };
});
