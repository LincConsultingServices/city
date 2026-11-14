// Who you are in CEO City — made once, before the city opens.
//
// Everything chosen here becomes the player's identity
// (framework/player/identity.ts): the figure on the street and in every room,
// the portrait opposite every person who talks to them, the name on the HUD
// and in a manager's greeting. The preview shows both — the portrait and the
// walking figure — and in the three things they will wear: their own clothes,
// the café's uniform, and the suit they will earn.
import { useId, useMemo, useState, type ReactNode } from "react";
import { audio } from "@/framework/audio/audioManager";
import { useAuth } from "@/framework/auth/AuthProvider";
import {
  BEARDS,
  BUILDS_FOR,
  CAP_COLOURS,
  CLOTHES,
  EARRINGS,
  EYE_COLOURS,
  FACES_FOR,
  GENDERS,
  GLASSES,
  HAIRSTYLES_FOR,
  HAIR_COLOURS,
  NAME_MAX,
  OUTFIT_COLOURS,
  SHOE_COLOURS,
  SKIN_TONES,
  SUIT_COLOURS,
  TROUSER_COLOURS,
  cleanName,
  defaultIdentity,
  lookOf,
  paletteFor,
  randomIdentity,
  useIdentity,
  withGender,
  type PlayerIdentity,
  type Swatch,
} from "@/framework/player/identity";
import type { PlayerOutfit } from "./characters";
import type { Cardinal } from "@/world/assets";
import { Portrait } from "./Portrait";
import { WorldFigurePreview } from "./WorldFigurePreview";

const hex = (n: number) => `#${n.toString(16).padStart(6, "0")}`;

const OUTFITS: { value: PlayerOutfit; label: string }[] = [
  { value: "casual", label: "Your clothes" },
  { value: "uniform", label: "On the counter" },
  { value: "professional", label: "In charge" },
];

const TURN: Cardinal[] = ["S", "E", "N", "W"];

export function CharacterCreator({ onDone }: { onDone: () => void }) {
  const { user } = useAuth();
  const existing = useIdentity((s) => s.identity);
  const setIdentity = useIdentity((s) => s.setIdentity);
  /** What Reset goes back to: the character they came in with, or the default. */
  const start = useMemo(
    () => existing ?? defaultIdentity(user?.displayName?.split(" ")[0] ?? ""),
    // Fixed for the life of the screen — reset should not chase the store.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const [draft, setDraft] = useState<PlayerIdentity>(start);
  const [outfit, setOutfit] = useState<PlayerOutfit>("casual");
  const [turn, setTurn] = useState(0);
  const nameId = useId();

  const name = cleanName(draft.name);
  const set = (patch: Partial<PlayerIdentity>) => setDraft((d) => ({ ...d, ...patch }));
  const look = lookOf(draft, outfit);

  const confirm = () => {
    if (!name) return;
    audio.play("ui_confirm");
    setIdentity({ ...draft, name, confirmed: true });
    onDone();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="creator-title"
      className="absolute inset-0 z-50 overflow-y-auto bg-ink/95 backdrop-blur-sm"
    >
      <div className="mx-auto flex min-h-full w-full max-w-5xl flex-col px-4 py-6 sm:px-6">
        <header className="mb-5">
          <p className="text-xs uppercase tracking-widest text-muted">Before you arrive</p>
          <h1 id="creator-title" className="font-display text-3xl font-semibold text-gold">
            Who are you?
          </h1>
          <p className="mt-1 text-sm text-muted">
            This is you for the whole of CEO City — on the street, at work, and in every
            conversation. You can change it if you start the game over.
          </p>
        </header>

        <div className="grid flex-1 gap-6 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          {/* ── Preview ─────────────────────────────────────────────── */}
          <section
            aria-label="Preview"
            className="flex flex-col items-center rounded-2xl border border-line/60 bg-surface/60 p-4 md:sticky md:top-6 md:self-start"
          >
            <div className="flex w-full items-end justify-center gap-2">
              <Portrait look={look} title={name || "Your character"} className="h-64 w-auto" />
              <div className="flex flex-col items-center">
                <WorldFigurePreview
                  palette={paletteFor(draft, outfit)}
                  facing={TURN[turn]}
                  className="shrink-0"
                />
                <button
                  type="button"
                  onClick={() => setTurn((t) => (t + 1) % TURN.length)}
                  className="mt-1 rounded-full border border-line/70 px-3 py-1 text-xs text-muted hover:border-gold/60 hover:text-text"
                >
                  Turn ↻
                </button>
              </div>
            </div>
            <p className="mt-3 font-display text-xl text-text">{name || "Your name"}</p>
            <div
              role="tablist"
              aria-label="Preview outfit"
              className="mt-3 flex flex-wrap justify-center gap-1.5"
            >
              {OUTFITS.map((o) => (
                <button
                  key={o.value}
                  role="tab"
                  aria-selected={outfit === o.value}
                  onClick={() => setOutfit(o.value)}
                  className={`rounded-full px-3 py-1 text-xs transition ${
                    outfit === o.value
                      ? "bg-gold/20 text-gold"
                      : "border border-line/70 text-muted hover:text-text"
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
            <p className="mt-2 text-center text-[11px] leading-relaxed text-muted">
              At work you wear the uniform, then a suit — your face, hair and look stay yours.
            </p>
          </section>

          {/* ── Choices ─────────────────────────────────────────────── */}
          <section aria-label="Your character" className="space-y-5 pb-28">
            <Group title="Name">
              <label htmlFor={nameId} className="sr-only">
                Your name
              </label>
              <input
                id={nameId}
                autoFocus
                value={draft.name}
                maxLength={NAME_MAX}
                onChange={(e) => set({ name: e.target.value })}
                placeholder="What do people call you?"
                className="w-full rounded-lg border border-line/70 bg-surface-2 px-3 py-2 text-sm text-text placeholder:text-muted/70 focus:border-gold/60 focus:outline-none"
              />
            </Group>

            <Group title="You">
              <Chips
                label="Gender"
                options={GENDERS}
                value={draft.gender}
                onPick={(v) => setDraft((d) => withGender(d, v))}
              />
              <Chips
                label="Body type"
                options={BUILDS_FOR[draft.gender]}
                value={draft.build}
                onPick={(v) => set({ build: v })}
              />
            </Group>

            <Group title="Face">
              <Chips
                label="Face shape"
                options={FACES_FOR[draft.gender]}
                value={draft.face}
                onPick={(v) => set({ face: v })}
              />
              <Swatches
                label="Skin tone"
                options={SKIN_TONES}
                value={draft.skin}
                onPick={(v) => set({ skin: v })}
              />
              <Swatches
                label="Eye colour"
                options={EYE_COLOURS}
                value={draft.eyes}
                onPick={(v) => set({ eyes: v })}
              />
              {draft.gender === "male" && (
                <Chips
                  label="Facial hair"
                  options={BEARDS}
                  value={draft.beard}
                  onPick={(v) => set({ beard: v })}
                />
              )}
              <Chips
                label="Freckles"
                options={[
                  { value: false, label: "None" },
                  { value: true, label: "Freckles" },
                ]}
                value={draft.freckles}
                onPick={(v) => set({ freckles: v })}
              />
            </Group>

            <Group title="Hair">
              <Chips
                label="Hairstyle"
                options={HAIRSTYLES_FOR[draft.gender]}
                value={draft.hairStyle}
                onPick={(v) => set({ hairStyle: v })}
              />
              <Swatches
                label="Hair colour"
                options={HAIR_COLOURS}
                value={draft.hair}
                onPick={(v) => set({ hair: v })}
              />
            </Group>

            <Group title="Clothes">
              <Chips
                label="What you wear"
                options={CLOTHES}
                value={draft.clothes}
                onPick={(v) => set({ clothes: v })}
              />
              <Swatches
                label="Main colour"
                options={OUTFIT_COLOURS}
                value={draft.top}
                onPick={(v) => set({ top: v })}
              />
              <Swatches
                label="Second colour"
                options={OUTFIT_COLOURS}
                value={draft.accent}
                onPick={(v) => set({ accent: v })}
              />
              <Swatches
                label="Trousers"
                options={TROUSER_COLOURS}
                value={draft.legs}
                onPick={(v) => set({ legs: v })}
              />
              <Swatches
                label="Shoes"
                options={SHOE_COLOURS}
                value={draft.shoes}
                onPick={(v) => set({ shoes: v })}
              />
              <Swatches
                label="Your suit, once you're promoted"
                options={SUIT_COLOURS}
                value={draft.suit}
                onPick={(v) => {
                  set({ suit: v });
                  setOutfit("professional");
                }}
              />
            </Group>

            <Group title="Accessories">
              <Chips
                label="Glasses"
                options={GLASSES}
                value={draft.glasses}
                onPick={(v) => set({ glasses: v })}
              />
              <Chips
                label="Earrings"
                options={EARRINGS}
                value={draft.earrings}
                onPick={(v) => set({ earrings: v })}
              />
              <Chips
                label="Cap"
                options={CAP_COLOURS}
                value={draft.cap}
                onPick={(v) => {
                  set({ cap: v });
                  setOutfit("casual");
                }}
                dot
              />
              <Chips
                label="Sunglasses"
                options={[
                  { value: false, label: "None" },
                  { value: true, label: "Pushed up in your hair" },
                ]}
                value={draft.sunglasses}
                onPick={(v) => set({ sunglasses: v })}
              />
            </Group>
          </section>
        </div>
      </div>

      {/* Always in reach, however far down the choices go. */}
      <footer className="sticky bottom-0 border-t border-line/60 bg-ink/95 px-4 py-3 backdrop-blur sm:px-6">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              audio.play("ui_click");
              // Randomize within the gender they chose.
              setDraft((d) => randomIdentity(d.name, Math.random, d.gender));
            }}
            className="rounded-lg border border-line/70 px-4 py-2 text-sm text-text hover:border-gold/60"
          >
            🎲 Randomize
          </button>
          <button
            type="button"
            onClick={() => {
              audio.play("ui_click");
              setDraft(start);
              setOutfit("casual");
            }}
            className="rounded-lg border border-line/70 px-4 py-2 text-sm text-muted hover:text-text"
          >
            Reset
          </button>
          <span className="ml-auto text-xs text-muted">
            {name ? "" : "Give your character a name to continue."}
          </span>
          <button
            type="button"
            onClick={confirm}
            disabled={!name}
            className="rounded-lg bg-gold px-5 py-2 text-sm font-semibold text-ink transition hover:brightness-110 disabled:opacity-40"
          >
            This is me →
          </button>
        </div>
      </footer>
    </div>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="rounded-2xl border border-line/60 bg-surface/40 p-4">
      <legend className="px-1 text-xs uppercase tracking-widest text-gold">{title}</legend>
      <div className="space-y-3">{children}</div>
    </fieldset>
  );
}

/** A row of colour swatches; one is chosen. */
function Swatches({
  label,
  options,
  value,
  onPick,
}: {
  label: string;
  options: readonly Swatch[];
  value: number;
  onPick: (v: number) => void;
}) {
  return (
    <div>
      <p className="mb-1.5 text-xs text-muted">{label}</p>
      <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1.5">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={value === o.value}
            aria-label={o.label}
            title={o.label}
            onClick={() => onPick(o.value)}
            className={`h-7 w-7 rounded-full border-2 transition ${
              value === o.value
                ? "border-gold ring-2 ring-gold/40"
                : "border-line/70 hover:border-text/60"
            }`}
            style={{ backgroundColor: hex(o.value) }}
          />
        ))}
      </div>
    </div>
  );
}

/** A row of labelled choices; one is chosen. `dot` shows a colour beside each. */
function Chips<T>({
  label,
  options,
  value,
  onPick,
  dot,
}: {
  label: string;
  options: readonly { value: T; label: string }[];
  value: T;
  onPick: (v: T) => void;
  dot?: boolean;
}) {
  return (
    <div>
      <p className="mb-1.5 text-xs text-muted">{label}</p>
      <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1.5">
        {options.map((o) => (
          <button
            key={String(o.value)}
            type="button"
            role="radio"
            aria-checked={value === o.value}
            onClick={() => onPick(o.value)}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs transition ${
              value === o.value
                ? "bg-gold/20 text-gold ring-1 ring-gold/50"
                : "border border-line/70 text-muted hover:text-text"
            }`}
          >
            {dot && typeof o.value === "number" && (
              <span
                aria-hidden
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: hex(o.value) }}
              />
            )}
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
