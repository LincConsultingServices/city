// AudioManager — Music / Ambient / SFX / UI buses with per-bus volume + master
// mute, persisted to localStorage (PRD §15). All playback goes through here; no
// scattered players in building modules (buildings register ambience on a bus).
//
// F0 is a STUB: the bus/volume API is frozen so callers can wire against it, but
// no audio assets exist yet (CC0 pass lands in F4). play() is a safe no-op until
// a source is registered.

import { Howl } from 'howler';

export type Bus = 'music' | 'ambient' | 'sfx' | 'ui';

const STORAGE_KEY = 'city.audio';
const DEFAULT_VOLUMES: Record<Bus, number> = { music: 0.5, ambient: 0.5, sfx: 0.7, ui: 0.7 };

interface Persisted {
  volumes: Record<Bus, number>;
  muted: boolean;
}

class AudioManager {
  private volumes: Record<Bus, number> = { ...DEFAULT_VOLUMES };
  private muted = false;
  private sounds = new Map<string, { howl: Howl; bus: Bus }>();

  constructor() {
    this.load();
  }

  /** Register a source under a key on a bus (F4). Idempotent. */
  register(key: string, src: string[], bus: Bus, opts: { loop?: boolean } = {}): void {
    if (this.sounds.has(key)) return;
    const howl = new Howl({ src, loop: opts.loop ?? false, volume: this.effective(bus) });
    this.sounds.set(key, { howl, bus });
  }

  play(key: string): void {
    this.sounds.get(key)?.howl.play();
  }

  stop(key: string): void {
    this.sounds.get(key)?.howl.stop();
  }

  setBusVolume(bus: Bus, volume: number): void {
    this.volumes[bus] = Math.max(0, Math.min(1, volume));
    this.apply();
    this.save();
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    this.apply();
    this.save();
  }

  getBusVolume(bus: Bus): number {
    return this.volumes[bus];
  }

  isMuted(): boolean {
    return this.muted;
  }

  private effective(bus: Bus): number {
    return this.muted ? 0 : this.volumes[bus];
  }

  private apply(): void {
    for (const { howl, bus } of this.sounds.values()) howl.volume(this.effective(bus));
  }

  private load(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const p = JSON.parse(raw) as Partial<Persisted>;
      if (p.volumes) this.volumes = { ...DEFAULT_VOLUMES, ...p.volumes };
      if (typeof p.muted === 'boolean') this.muted = p.muted;
    } catch {
      /* first run / bad blob → defaults */
    }
  }

  private save(): void {
    try {
      const p: Persisted = { volumes: this.volumes, muted: this.muted };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
    } catch {
      /* storage unavailable → in-memory only */
    }
  }
}

export const audioManager = new AudioManager();
