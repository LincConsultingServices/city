// Audio manager — WebAudio directly, no dependency (the archived Godot build's
// autoload/audio_manager.gd is prior art for the bus layout).
//
// Rules that shape this design:
//  • MUTED BY DEFAULT. Sound is opt-in and the choice persists; nothing should
//    ever ambush someone who opened a training app in an open-plan office.
//  • Browsers refuse to start an AudioContext before a user gesture, so the
//    context is created lazily on the first unmuted play and resumed on demand.
//  • Every buffer is fetched once and cached; a failed fetch degrades to
//    silence rather than throwing into a caller that only wanted a click.
import { loadJson, saveJson } from "@/lib/persist";

const STORAGE_KEY = "city.audio.v1";
const BASE = "/assets/audio";

/**
 * Independent gain buses so world ambience never drowns the interface. `music`
 * carries the short jingles (they are effects, and follow the effects volume);
 * `bgm` carries the background score alone, so it can have its own slider.
 */
export type Bus = "ui" | "world" | "music" | "bgm";

export type SoundName =
  | "ui_click"
  | "ui_confirm"
  | "ui_error"
  | "ui_close"
  | "ui_open"
  | "step_grass_1"
  | "step_grass_2"
  | "step_hard_1"
  | "step_hard_2"
  | "jingle_win"
  | "jingle_badge";

const BUS_OF: Record<SoundName, Bus> = {
  ui_click: "ui",
  ui_confirm: "ui",
  ui_error: "ui",
  ui_close: "ui",
  ui_open: "ui",
  step_grass_1: "world",
  step_grass_2: "world",
  step_hard_1: "world",
  step_hard_2: "world",
  jingle_win: "music",
  jingle_badge: "music",
};

/** Each bus's level at full slider. The score sits well under everything else. */
const BUS_GAIN: Record<Bus, number> = { ui: 0.5, world: 0.32, music: 0.45, bgm: 0.32 };

/** What the player has set in Options → Audio. */
export interface AudioSettings {
  /** Master switch. Off by default — sound is opt-in. */
  enabled: boolean;
  /** Background music, when sound is on. */
  music: boolean;
  /** 0..1 */
  musicVolume: number;
  /** 0..1 — interface sounds, footsteps and jingles. */
  effectsVolume: number;
}

const DEFAULTS: AudioSettings = {
  enabled: false,
  music: true,
  musicVolume: 0.5,
  effectsVolume: 0.8,
};

/** Older saves carry only `enabled`; anything missing takes its default. */
interface Persisted {
  enabled: boolean;
  music?: boolean;
  musicVolume?: number;
  effectsVolume?: number;
}
const isPersisted = (v: unknown): v is Persisted =>
  typeof v === "object" && v !== null && typeof (v as Persisted).enabled === "boolean";

const clamp01 = (n: number) => (Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0);

let ctx: AudioContext | null = null;
/** Everything goes through this. Muting closes it, so silence is immediate. */
let master: GainNode | null = null;
let buses: Record<Bus, GainNode> | null = null;
const buffers = new Map<SoundName, AudioBuffer>();
const pending = new Map<SoundName, Promise<AudioBuffer | null>>();

const saved = loadJson(STORAGE_KEY, isPersisted);
let settings: AudioSettings = {
  enabled: saved?.enabled ?? DEFAULTS.enabled,
  music: saved?.music ?? DEFAULTS.music,
  musicVolume: clamp01(saved?.musicVolume ?? DEFAULTS.musicVolume),
  effectsVolume: clamp01(saved?.effectsVolume ?? DEFAULTS.effectsVolume),
};
let enabled = settings.enabled;
const listeners = new Set<(on: boolean) => void>();
const settingsListeners = new Set<(s: AudioSettings) => void>();

/** The level a bus should sit at, given the sliders. */
function busLevel(bus: Bus): number {
  const slider = bus === "bgm" ? settings.musicVolume : settings.effectsVolume;
  return BUS_GAIN[bus] * slider;
}

function applyBusLevels(): void {
  if (!ctx || !buses) return;
  for (const bus of Object.keys(buses) as Bus[]) {
    // A short ramp, so dragging a slider never clicks.
    buses[bus].gain.setTargetAtTime(busLevel(bus), ctx.currentTime, 0.05);
  }
}

/**
 * Mute means silent now. Without this the music, which is scheduled ahead and
 * fades out rather than cutting, kept sounding for a second and a half after
 * the button said it had stopped.
 */
function applyMute(): void {
  if (!ctx || !master) return;
  master.gain.setTargetAtTime(enabled ? 1 : 0, ctx.currentTime, 0.015);
}

function commit(next: AudioSettings): void {
  settings = next;
  enabled = next.enabled;
  saveJson(STORAGE_KEY, next);
  applyBusLevels();
  applyMute();
  settingsListeners.forEach((l) => l(next));
}

function ensureContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor: typeof AudioContext | undefined =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!ctx) {
    try {
      ctx = new Ctor();
    } catch {
      return null;
    }
    master = ctx.createGain();
    master.gain.value = enabled ? 1 : 0;
    master.connect(ctx.destination);
    buses = {
      ui: ctx.createGain(),
      world: ctx.createGain(),
      music: ctx.createGain(),
      bgm: ctx.createGain(),
    };
    for (const [name, node] of Object.entries(buses) as Array<[Bus, GainNode]>) {
      node.gain.value = busLevel(name);
      node.connect(master);
    }
  }
  // Autoplay policy parks the context until a gesture; resume is a no-op if running.
  if (ctx.state === "suspended") void ctx.resume().catch(() => {});
  return ctx;
}

async function buffer(name: SoundName): Promise<AudioBuffer | null> {
  const cached = buffers.get(name);
  if (cached) return cached;
  const inFlight = pending.get(name);
  if (inFlight) return inFlight;

  const load = (async () => {
    const c = ensureContext();
    if (!c) return null;
    try {
      const res = await fetch(`${BASE}/${name}.ogg`);
      if (!res.ok) return null;
      const decoded = await c.decodeAudioData(await res.arrayBuffer());
      buffers.set(name, decoded);
      return decoded;
    } catch {
      return null; // missing or undecodable (Safari lacks Ogg Vorbis) -> silence
    } finally {
      pending.delete(name);
    }
  })();
  pending.set(name, load);
  return load;
}

export const audio = {
  isEnabled: (): boolean => enabled,

  /** Turn sound on/off; persisted, and broadcast so the HUD toggle stays in sync. */
  setEnabled(on: boolean): void {
    if (on) ensureContext();
    commit({ ...settings, enabled: on });
    listeners.forEach((l) => l(on));
  },

  /** Everything Options → Audio shows. */
  getSettings: (): AudioSettings => settings,

  setMusic(on: boolean): void {
    commit({ ...settings, music: on });
  },

  setMusicVolume(v: number): void {
    commit({ ...settings, musicVolume: clamp01(v) });
  },

  setEffectsVolume(v: number): void {
    commit({ ...settings, effectsVolume: clamp01(v) });
  },

  /** Every settings change, including the master switch. */
  subscribeSettings(listener: (s: AudioSettings) => void): () => void {
    settingsListeners.add(listener);
    return () => settingsListeners.delete(listener);
  },

  /**
   * Where background music plays into, starting the audio context if it can.
   * Null when there is no WebAudio, or before the browser will allow sound.
   */
  bgmOutput(): { ctx: AudioContext; out: GainNode } | null {
    const c = ensureContext();
    if (!c || !buses) return null;
    return { ctx: c, out: buses.bgm };
  },

  toggle(): boolean {
    audio.setEnabled(!enabled);
    return enabled;
  },

  subscribe(listener: (on: boolean) => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  /** Fire and forget. Silent when muted, and never rejects into the caller. */
  play(name: SoundName, opts: { volume?: number; rate?: number } = {}): void {
    if (!enabled) return;
    void buffer(name).then((buf) => {
      // Re-check: the user may have muted during the fetch.
      if (!buf || !enabled || !ctx || !buses) return;
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.playbackRate.value = opts.rate ?? 1;
      const gain = ctx.createGain();
      gain.gain.value = opts.volume ?? 1;
      src.connect(gain).connect(buses[BUS_OF[name]]);
      src.start();
    });
  },

  /** Warm the cache for sounds that must feel instant (footsteps, clicks). */
  preload(names: SoundName[]): void {
    if (!enabled) return;
    names.forEach((n) => void buffer(n));
  },
};

// Development only: when this module is hot-replaced, the new copy builds its
// own context, and anything still playing through this one — the music, above
// all — would carry on with no mute button that can reach it. Close it.
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    void ctx?.close().catch(() => {});
    ctx = null;
    master = null;
    buses = null;
  });
}
