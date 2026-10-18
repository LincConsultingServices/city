// Background music — composed in code, played through WebAudio.
//
// There is no music file. The city's score is generated: a slow, warm loop of
// four seventh chords on a soft pad, a round bass note on the downbeats, and a
// sparse electric-piano line picked from the chord with plenty of rests. Calm,
// unhurried, a little jazzy — the sound of a café on a quiet morning, sitting
// well under footsteps and interface clicks. It never ends and never repeats a
// melody exactly, because the melody is drawn bar by bar from a seeded random.
//
// Two halves. `composeBar` is pure — which chord, which notes, when — and is
// what the tests hold. `createMusic` turns those notes into oscillators, and is
// the only part that touches WebAudio.

/** Beats per minute. Slow enough to sit under everything. */
export const BPM = 72;
export const BEATS_PER_BAR = 4;
export const BAR_S = (60 / BPM) * BEATS_PER_BAR;

/**
 * The loop, one chord a bar: Fmaj7 → Em7 → Dm7 → Cmaj7, a gentle descent that
 * resolves home. Close voicings around middle C, as MIDI note numbers.
 */
export const PROGRESSION: ReadonlyArray<{ name: string; notes: readonly number[] }> = [
  { name: "Fmaj7", notes: [53, 57, 60, 64] },
  { name: "Em7", notes: [52, 55, 59, 62] },
  { name: "Dm7", notes: [50, 53, 57, 60] },
  { name: "Cmaj7", notes: [48, 52, 55, 59] },
];

export interface Note {
  /** MIDI note number. */
  midi: number;
  /** Seconds from the start of the bar. */
  at: number;
  /** Seconds it sounds for, before its release. */
  dur: number;
  /** 0..1, relative to its voice. */
  vel: number;
}

export interface Bar {
  chord: string;
  pad: Note[];
  bass: Note[];
  melody: Note[];
}

export function midiToHz(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/** A small deterministic random, so bar n always sounds the same in tests. */
function seeded(seed: number): () => number {
  let s = (seed * 2654435761) >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 10000) / 10000;
  };
}

/**
 * Bar `n` of the score.
 *
 * The melody walks eighth notes over the chord, an octave up, playing about a
 * third of them — mostly chord tones, the odd neighbour tone, and always at
 * least one rest in each half bar so it breathes.
 */
export function composeBar(n: number): Bar {
  const chord = PROGRESSION[((n % PROGRESSION.length) + PROGRESSION.length) % PROGRESSION.length];
  const beat = 60 / BPM;
  const rand = seeded(n + 1);

  const pad = chord.notes.map((midi) => ({ midi, at: 0, dur: BAR_S, vel: 0.55 }));

  const root = chord.notes[0] - 12;
  const bass: Note[] = [
    { midi: root, at: 0, dur: beat * 1.6, vel: 0.9 },
    { midi: root + (rand() < 0.5 ? 7 : 12), at: beat * 2, dur: beat * 1.4, vel: 0.6 },
  ];

  const tones = [...chord.notes.map((m) => m + 12), chord.notes[1] + 24];
  const melody: Note[] = [];
  let last = tones[Math.floor(rand() * tones.length)];
  for (let i = 0; i < BEATS_PER_BAR * 2; i++) {
    // Every fourth bar the line rests entirely: a phrase, then air.
    if (n % 4 === 3) break;
    if (rand() > 0.38) continue;
    // Step to a nearby chord tone more often than leaping.
    const near = tones.filter((t) => Math.abs(t - last) <= 5);
    const pool = near.length > 0 && rand() < 0.75 ? near : tones;
    last = pool[Math.floor(rand() * pool.length)];
    melody.push({ midi: last, at: (i * beat) / 2, dur: beat * 0.9, vel: 0.45 + rand() * 0.3 });
  }

  return { chord: chord.name, pad, bass, melody };
}

// ── Playback ─────────────────────────────────────────────────────────────────

/** How far ahead notes are scheduled. Long enough to survive a throttled timer. */
const LOOKAHEAD_S = 1.6;
const TICK_MS = 200;
/** Fade in and out, so music never starts or stops abruptly. */
const FADE_S = 2.5;

export interface Music {
  start(): void;
  stop(): void;
  isPlaying(): boolean;
}

/**
 * The player for the score. `output` is called each time playback starts, and
 * returns where to play into (the audio manager's music bus), or null if sound
 * is not available yet.
 */
export function createMusic(output: () => { ctx: AudioContext; out: GainNode } | null): Music {
  let playing = false;
  let timer: number | null = null;
  let nextBar = 0;
  let barIndex = 0;
  let voice: { ctx: AudioContext; master: GainNode; echo: GainNode } | null = null;

  function build(ctx: AudioContext, out: GainNode) {
    const master = ctx.createGain();
    master.gain.value = 0;
    // Warmth: roll off the top so nothing in the score is bright.
    const tone = ctx.createBiquadFilter();
    tone.type = "lowpass";
    tone.frequency.value = 2400;
    tone.Q.value = 0.4;
    master.connect(tone).connect(out);
    // A soft echo for the melody, for a sense of room.
    const echo = ctx.createGain();
    const delay = ctx.createDelay(1);
    delay.delayTime.value = (60 / BPM) * 0.75;
    const feedback = ctx.createGain();
    feedback.gain.value = 0.28;
    const wet = ctx.createGain();
    wet.gain.value = 0.22;
    echo.connect(master);
    echo.connect(delay);
    delay.connect(feedback).connect(delay);
    delay.connect(wet).connect(master);
    return { ctx, master, echo };
  }

  /** One note: a voice of oscillators through its own envelope. */
  function play(
    v: NonNullable<typeof voice>,
    note: Note,
    t0: number,
    kind: "pad" | "bass" | "keys",
  ): void {
    const { ctx } = v;
    const start = t0 + note.at;
    const env = ctx.createGain();
    const peak = (kind === "pad" ? 0.06 : kind === "bass" ? 0.16 : 0.085) * note.vel;
    const attack = kind === "pad" ? 1.2 : kind === "bass" ? 0.02 : 0.01;
    const release = kind === "pad" ? 1.6 : kind === "bass" ? 0.6 : 1.1;
    env.gain.setValueAtTime(0, start);
    env.gain.linearRampToValueAtTime(peak, start + attack);
    if (kind === "pad") {
      env.gain.setValueAtTime(peak, start + note.dur);
    } else {
      // Plucked: it starts to fade the moment it is struck.
      env.gain.setTargetAtTime(peak * 0.35, start + attack, note.dur * 0.35);
    }
    env.gain.setTargetAtTime(0, start + note.dur, release / 4);
    env.connect(kind === "keys" ? v.echo : v.master);

    const hz = midiToHz(note.midi);
    const voices: Array<[OscillatorType, number, number]> =
      kind === "pad"
        ? [
            ["triangle", hz, -6],
            ["sine", hz, 6],
          ]
        : kind === "bass"
          ? [["sine", hz, 0]]
          : [
              ["sine", hz, 0],
              ["triangle", hz * 2, 0],
            ];
    const end = start + note.dur + release + 0.1;
    voices.forEach(([type, freq, detune], i) => {
      const osc = ctx.createOscillator();
      osc.type = type;
      osc.frequency.value = freq;
      osc.detune.value = detune;
      if (kind === "keys" && i === 1) {
        // The bell-like overtone of an electric piano, much quieter.
        const g = ctx.createGain();
        g.gain.value = 0.18;
        osc.connect(g).connect(env);
      } else {
        osc.connect(env);
      }
      osc.start(start);
      osc.stop(end);
    });
  }

  function schedule(): void {
    if (!voice) return;
    while (nextBar < voice.ctx.currentTime + LOOKAHEAD_S) {
      const bar = composeBar(barIndex);
      for (const n of bar.pad) play(voice, n, nextBar, "pad");
      for (const n of bar.bass) play(voice, n, nextBar, "bass");
      for (const n of bar.melody) play(voice, n, nextBar, "keys");
      nextBar += BAR_S;
      barIndex += 1;
    }
  }

  return {
    isPlaying: () => playing,

    start() {
      if (playing) return;
      const o = output();
      if (!o) return;
      playing = true;
      if (!voice || voice.ctx !== o.ctx) voice = build(o.ctx, o.out);
      const now = voice.ctx.currentTime;
      voice.master.gain.cancelScheduledValues(now);
      voice.master.gain.setValueAtTime(voice.master.gain.value, now);
      voice.master.gain.linearRampToValueAtTime(1, now + FADE_S);
      nextBar = Math.max(nextBar, now + 0.1);
      schedule();
      timer = window.setInterval(schedule, TICK_MS);
    },

    stop() {
      if (!playing) return;
      playing = false;
      if (timer !== null) window.clearInterval(timer);
      timer = null;
      if (!voice) return;
      const now = voice.ctx.currentTime;
      voice.master.gain.cancelScheduledValues(now);
      voice.master.gain.setValueAtTime(voice.master.gain.value, now);
      voice.master.gain.linearRampToValueAtTime(0, now + FADE_S * 0.6);
      // Notes already scheduled play out under the fade; the next start picks
      // up after them rather than on top of them.
    },
  };
}
