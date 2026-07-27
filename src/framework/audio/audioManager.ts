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

/** Independent gain buses so world ambience never drowns the interface. */
export type Bus = "ui" | "world" | "music";

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

const BUS_GAIN: Record<Bus, number> = { ui: 0.5, world: 0.32, music: 0.45 };

interface Persisted {
  enabled: boolean;
}
const isPersisted = (v: unknown): v is Persisted =>
  typeof v === "object" && v !== null && typeof (v as Persisted).enabled === "boolean";

let ctx: AudioContext | null = null;
let buses: Record<Bus, GainNode> | null = null;
const buffers = new Map<SoundName, AudioBuffer>();
const pending = new Map<SoundName, Promise<AudioBuffer | null>>();

let enabled = loadJson(STORAGE_KEY, isPersisted)?.enabled ?? false;
const listeners = new Set<(on: boolean) => void>();

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
    const master = ctx.createGain();
    master.gain.value = 1;
    master.connect(ctx.destination);
    buses = {
      ui: ctx.createGain(),
      world: ctx.createGain(),
      music: ctx.createGain(),
    };
    for (const [name, node] of Object.entries(buses) as Array<[Bus, GainNode]>) {
      node.gain.value = BUS_GAIN[name];
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
    enabled = on;
    saveJson(STORAGE_KEY, { enabled: on });
    if (on) ensureContext();
    listeners.forEach((l) => l(on));
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
