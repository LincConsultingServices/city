// Options: audio, the map, and your save.
//
// One panel, three sections down the side. Every setting takes effect the
// moment it changes — there is no Apply button to forget — and every one of
// them persists in this browser.
import { useEffect, useId, useState, type ReactNode } from "react";
import { audio, type AudioSettings } from "@/framework/audio/audioManager";
import { useSettings } from "@/framework/settings";
import { lastSavedToServer, saveAllNow } from "@/framework/session/sync";
import { useWorldStore } from "@/world/worldStore";
import { Modal, ModalClose } from "./Modal";

type Section = "audio" | "map" | "save";

const SECTIONS: Array<{ id: Section; label: string }> = [
  { id: "audio", label: "Audio" },
  { id: "map", label: "Map" },
  { id: "save", label: "Game save" },
];

export function OptionsMenu({
  onClose,
  onOpenMap,
}: {
  onClose: () => void;
  /** Close Options and open the full city map. */
  onOpenMap: () => void;
}) {
  const [section, setSection] = useState<Section>("audio");
  const titleId = useId();

  return (
    <Modal onClose={onClose} width="lg" labelledBy={titleId} className="!p-0">
      <div className="flex items-center justify-between border-b border-line/60 px-6 py-4">
        <h2 id={titleId} className="font-display text-xl font-semibold text-gold">
          Options
        </h2>
        <ModalClose onClose={onClose} />
      </div>

      <div className="flex flex-col sm:flex-row">
        <nav
          aria-label="Options sections"
          className="flex gap-1 border-b border-line/60 p-3 sm:w-44 sm:flex-col sm:border-b-0 sm:border-r"
        >
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              onClick={() => {
                audio.play("ui_click");
                setSection(s.id);
              }}
              aria-current={section === s.id ? "page" : undefined}
              className={`rounded-lg px-3 py-2 text-left text-sm transition ${
                section === s.id
                  ? "bg-gold/15 text-gold"
                  : "text-muted hover:bg-surface-2 hover:text-text"
              }`}
            >
              {s.label}
            </button>
          ))}
        </nav>

        <div className="min-h-[18rem] flex-1 p-6">
          {section === "audio" && <AudioSection />}
          {section === "map" && <MapSection onOpenMap={onOpenMap} />}
          {section === "save" && <SaveSection />}
        </div>
      </div>
    </Modal>
  );
}

// ── Audio ────────────────────────────────────────────────────────────────────

function useAudioSettings(): AudioSettings {
  const [s, setS] = useState(audio.getSettings());
  useEffect(() => audio.subscribeSettings(setS), []);
  return s;
}

function AudioSection() {
  const s = useAudioSettings();
  return (
    <div className="space-y-5">
      <Row label="Sound" hint="Interface sounds, footsteps and music. Off until you turn it on.">
        <Switch
          label="Sound"
          on={s.enabled}
          onChange={(on) => {
            audio.setEnabled(on);
            if (on) audio.play("ui_confirm");
          }}
        />
      </Row>

      <Row
        label="Background music"
        hint="A quiet score while you walk the city."
        disabled={!s.enabled}
      >
        <Switch
          label="Background music"
          on={s.music}
          disabled={!s.enabled}
          onChange={(on) => audio.setMusic(on)}
        />
      </Row>

      <Slider
        label="Music volume"
        value={s.musicVolume}
        disabled={!s.enabled || !s.music}
        onChange={(v) => audio.setMusicVolume(v)}
      />

      <Slider
        label="Effects volume"
        value={s.effectsVolume}
        disabled={!s.enabled}
        onChange={(v) => audio.setEffectsVolume(v)}
        // A click on release, so you hear the level you picked.
        onCommit={() => audio.play("ui_click")}
      />
    </div>
  );
}

// ── Map ──────────────────────────────────────────────────────────────────────

function MapSection({ onOpenMap }: { onOpenMap: () => void }) {
  const showMinimap = useSettings((s) => s.showMinimap);
  const showGuide = useSettings((s) => s.showGuide);
  const set = useSettings((s) => s.set);
  const dest = useWorldStore((s) => s.destination);
  const setDestination = useWorldStore((s) => s.setDestination);

  return (
    <div className="space-y-5">
      <Row
        label="Minimap"
        hint="The round map in the bottom-left corner. M still opens the full map."
      >
        <Switch label="Minimap" on={showMinimap} onChange={(on) => set({ showMinimap: on })} />
      </Row>

      <Row label="Guide arrow" hint="The arrow at your feet that points to your marker.">
        <Switch label="Guide arrow" on={showGuide} onChange={(on) => set({ showGuide: on })} />
      </Row>

      <div className="rounded-xl border border-line/60 bg-surface-2/40 p-4">
        <p className="text-sm text-text">
          {dest ? (
            <>
              Heading to <span className="text-gold">{dest.label}</span>
            </>
          ) : (
            "No marker set."
          )}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            onClick={() => {
              audio.play("ui_open");
              onOpenMap();
            }}
            className="rounded-lg bg-gold px-4 py-2 text-sm font-medium text-ink transition hover:brightness-110"
          >
            Open the full map
          </button>
          {dest && (
            <button
              onClick={() => {
                audio.play("ui_close");
                setDestination(null);
              }}
              className="rounded-lg border border-line/70 px-4 py-2 text-sm text-muted hover:text-text"
            >
              Clear marker
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Game save ────────────────────────────────────────────────────────────────

/** "just now", "4 minutes ago", "2 hours ago". */
function ago(iso: string, now = Date.now()): string {
  const s = Math.max(0, Math.round((now - Date.parse(iso)) / 1000));
  if (s < 45) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} minute${m === 1 ? "" : "s"} ago`;
  const h = Math.round(m / 60);
  return `${h} hour${h === 1 ? "" : "s"} ago`;
}

function SaveSection() {
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "offline" | "nothing">("idle");
  const [last, setLast] = useState(lastSavedToServer());
  // Keep "x minutes ago" honest while the panel is open.
  const [, tick] = useState(0);
  useEffect(() => {
    const t = window.setInterval(() => tick((n) => n + 1), 30_000);
    return () => window.clearInterval(t);
  }, []);

  const save = async () => {
    setStatus("saving");
    const result = await saveAllNow();
    setStatus(result);
    setLast(lastSavedToServer());
    audio.play(result === "offline" ? "ui_error" : "ui_confirm");
  };

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-medium text-text">Your progress saves automatically</p>
        <p className="mt-1 text-sm leading-relaxed text-muted">
          Everything you do in the city is saved to your WarRoom account as you play — every answer,
          every decision, and where you are in each building. Sign in on another device and you pick
          up where you left off.
        </p>
      </div>

      <div className="rounded-xl border border-line/60 bg-surface-2/40 p-4">
        <p className="text-sm text-text">
          {last ? (
            <>
              Last saved to your account <span className="text-gold">{ago(last)}</span>
            </>
          ) : (
            "Not saved to your account yet this visit."
          )}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            onClick={() => void save()}
            disabled={status === "saving"}
            className="rounded-lg bg-gold px-4 py-2 text-sm font-medium text-ink transition hover:brightness-110 disabled:opacity-50"
          >
            {status === "saving" ? "Saving…" : "Save now"}
          </button>
          <p role="status" className="text-xs text-muted">
            {status === "saved" && "Saved to your account."}
            {status === "nothing" && "Nothing to save yet — progress starts inside a building."}
            {status === "offline" &&
              "Couldn't save to your account just now. Your progress is kept on this device and will upload the next time it can."}
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Controls ─────────────────────────────────────────────────────────────────

function Row({
  label,
  hint,
  disabled,
  children,
}: {
  label: string;
  hint: string;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={`flex items-start justify-between gap-6 ${disabled ? "opacity-50" : ""}`}>
      <div>
        <p className="text-sm font-medium text-text">{label}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-muted">{hint}</p>
      </div>
      {children}
    </div>
  );
}

function Switch({
  label,
  on,
  disabled,
  onChange,
}: {
  label: string;
  on: boolean;
  disabled?: boolean;
  onChange: (on: boolean) => void;
}) {
  return (
    <button
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!on)}
      className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full border transition disabled:cursor-not-allowed ${
        on ? "border-gold/70 bg-gold/80" : "border-line bg-surface-2"
      }`}
    >
      <span
        className={`absolute top-0.5 h-[18px] w-[18px] rounded-full bg-text shadow transition-all ${
          on ? "left-[22px] bg-ink" : "left-0.5"
        }`}
      />
    </button>
  );
}

function Slider({
  label,
  value,
  disabled,
  onChange,
  onCommit,
}: {
  label: string;
  value: number;
  disabled?: boolean;
  onChange: (v: number) => void;
  onCommit?: () => void;
}) {
  const id = useId();
  return (
    <div className={disabled ? "opacity-50" : ""}>
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="text-sm font-medium text-text">
          {label}
        </label>
        <span className="text-xs tabular-nums text-muted">{Math.round(value * 100)}%</span>
      </div>
      <input
        id={id}
        type="range"
        min={0}
        max={100}
        step={1}
        value={Math.round(value * 100)}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value) / 100)}
        onPointerUp={onCommit}
        onKeyUp={onCommit}
        className="mt-2 w-full cursor-pointer accent-[#e2be78] disabled:cursor-not-allowed"
      />
    </div>
  );
}
