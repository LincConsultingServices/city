// Options: audio, the map, and your save.
//
// One panel, three sections down the side. Every setting takes effect the
// moment it changes — there is no Apply button to forget — and every one of
// them persists in this browser.
import { useEffect, useId, useState, type ReactNode } from "react";
import { audio, type AudioSettings } from "@/framework/audio/audioManager";
import { useSettings } from "@/framework/settings";
import { lastSavedToServer, saveAllNow } from "@/framework/session/sync";
import {
  deleteManualSave,
  loadManualSave,
  readManualSave,
  restartGame,
  writeManualSave,
  type ManualSave,
} from "@/framework/saves/manualSave";
import { useWorldStore } from "@/world/worldStore";
import { Modal, ModalClose } from "./Modal";
import { describeSave } from "./saveSummary";

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
  if (h < 24) return `${h} hour${h === 1 ? "" : "s"} ago`;
  const d = Math.round(h / 24);
  return `${d} day${d === 1 ? "" : "s"} ago`;
}

/** Which question, if any, is waiting for a yes before it happens. */
type Confirm = null | "overwrite" | "load" | "delete" | "restart";

function SaveSection() {
  const [sync, setSync] = useState<"idle" | "saving" | "saved" | "offline" | "nothing">("idle");
  const [last, setLast] = useState(lastSavedToServer());
  const [save, setSave] = useState<ManualSave | null>(() => readManualSave());
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [notice, setNotice] = useState<string | null>(null);
  /** Loading or restarting: the page is about to reload, so every button rests. */
  const [busy, setBusy] = useState<null | "load" | "restart">(null);
  // Keep "x minutes ago" honest while the panel is open.
  const [, tick] = useState(0);
  useEffect(() => {
    const t = window.setInterval(() => tick((n) => n + 1), 30_000);
    return () => window.clearInterval(t);
  }, []);

  const syncNow = async () => {
    setSync("saving");
    const result = await saveAllNow();
    setSync(result);
    setLast(lastSavedToServer());
    audio.play(result === "offline" ? "ui_error" : "ui_confirm");
  };

  const saveGame = () => {
    setSave(writeManualSave());
    setConfirm(null);
    setNotice("Game saved.");
    audio.play("ui_confirm");
  };

  const deleteSave = () => {
    deleteManualSave();
    setSave(null);
    setConfirm(null);
    setNotice("Save deleted.");
    audio.play("ui_close");
  };

  // Loading and restarting rewrite every building, then reload: each building
  // reads its state when it starts, and a reload is the only way to be sure
  // nothing from before is still held in memory.
  const replaceThenReload = async (kind: "load" | "restart") => {
    setBusy(kind);
    setConfirm(null);
    const ok = kind === "load" && save ? await loadManualSave(save) : await restartGame();
    if (!ok) {
      // Still correct on this device; it uploads on the next good load. Say so
      // for a moment before the reload takes the panel away.
      setNotice("Couldn't reach your account — done on this device, and it will upload next time.");
      await new Promise((r) => window.setTimeout(r, 1800));
    }
    window.location.reload();
  };

  const locked = busy !== null;

  return (
    <div className="space-y-6">
      {/* Auto-save: always on, underneath everything else. */}
      <section aria-labelledby="autosave-h">
        <div className="flex items-center justify-between gap-4">
          <p id="autosave-h" className="text-sm font-medium text-text">
            Auto-save
          </p>
          <span className="rounded-full border border-gold/50 bg-gold/10 px-2 py-0.5 text-[11px] text-gold">
            On
          </span>
        </div>
        <p className="mt-1 text-xs leading-relaxed text-muted">
          Everything you do is saved to your WarRoom account as you play, so you can pick up on any
          device.{" "}
          {last ? (
            <>
              Last saved <span className="text-text">{ago(last)}</span>.
            </>
          ) : (
            "Not saved to your account yet this visit."
          )}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <button
            onClick={() => void syncNow()}
            disabled={sync === "saving" || locked}
            className="text-xs text-muted underline underline-offset-2 hover:text-text disabled:opacity-50"
          >
            {sync === "saving" ? "Saving…" : "Save to my account now"}
          </button>
          <p role="status" className="text-xs text-muted">
            {sync === "saved" && "Saved to your account."}
            {sync === "nothing" && "Nothing to save yet — progress starts inside a building."}
            {sync === "offline" &&
              "Couldn't save to your account just now. It's kept on this device and will upload next time."}
          </p>
        </div>
      </section>

      {/* The manual save: one slot, the player's own checkpoint. */}
      <section
        aria-labelledby="manual-h"
        className="rounded-xl border border-line/60 bg-surface-2/40 p-4"
      >
        <p id="manual-h" className="text-sm font-medium text-text">
          Manual save
        </p>
        {save ? (
          <div className="mt-2">
            <p className="text-xs text-muted">
              Saved <span className="text-text">{ago(save.savedAt)}</span> on this device
            </p>
            <ul className="mt-1.5 space-y-0.5 text-sm text-gold">
              {describeSave(save).map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="mt-1 text-xs leading-relaxed text-muted">
            No manual save yet. Save now to keep this moment — you can come back to it whenever you
            like.
          </p>
        )}

        {confirm === null ? (
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={() => (save ? setConfirm("overwrite") : saveGame())}
              disabled={locked}
              className="rounded-lg bg-gold px-4 py-2 text-sm font-medium text-ink transition hover:brightness-110 disabled:opacity-50"
            >
              Save game
            </button>
            {save && (
              <>
                <button
                  onClick={() => setConfirm("load")}
                  disabled={locked}
                  className="rounded-lg border border-line/70 px-4 py-2 text-sm text-text hover:border-gold/60 disabled:opacity-50"
                >
                  {busy === "load" ? "Loading…" : "Load this save"}
                </button>
                <button
                  onClick={() => setConfirm("delete")}
                  disabled={locked}
                  className="rounded-lg border border-line/70 px-4 py-2 text-sm text-muted hover:border-[#c0584f]/70 hover:text-text disabled:opacity-50"
                >
                  Delete save
                </button>
              </>
            )}
          </div>
        ) : confirm === "overwrite" ? (
          <Ask
            text="Replace your manual save with the game as it is now?"
            yes="Replace it"
            onYes={saveGame}
            onNo={() => setConfirm(null)}
          />
        ) : confirm === "load" ? (
          <Ask
            text="Go back to this save? Anything you've done since will be replaced. Coins and badges you've earned are kept."
            yes="Load it"
            onYes={() => void replaceThenReload("load")}
            onNo={() => setConfirm(null)}
          />
        ) : confirm === "delete" ? (
          <Ask
            text="Delete your manual save? This can't be undone. Your game and auto-save are not affected."
            yes="Delete it"
            danger
            onYes={deleteSave}
            onNo={() => setConfirm(null)}
          />
        ) : null}
        <p role="status" className="mt-2 min-h-[1rem] text-xs text-muted">
          {notice}
        </p>
      </section>

      {/* Starting over, kept apart from everything else on purpose. */}
      <section aria-labelledby="restart-h" className="border-t border-line/60 pt-5">
        <p id="restart-h" className="text-sm font-medium text-text">
          Restart the game
        </p>
        <p className="mt-1 text-xs leading-relaxed text-muted">
          Start your café career and MAISON season again from the beginning. Coins, badges, your
          level choice and your manual save are kept.
        </p>
        {confirm === "restart" ? (
          <Ask
            text="Restart from the beginning? Your progress in every building will be cleared."
            yes="Yes, restart"
            danger
            onYes={() => void replaceThenReload("restart")}
            onNo={() => setConfirm(null)}
          />
        ) : (
          <button
            onClick={() => setConfirm("restart")}
            // Not while another question is open in the manual save card.
            disabled={locked || confirm !== null}
            className="mt-3 rounded-lg border border-[#c0584f]/60 px-4 py-2 text-sm text-[#e08a82] transition hover:bg-[#c0584f]/10 disabled:opacity-50"
          >
            {busy === "restart" ? "Restarting…" : "Restart…"}
          </button>
        )}
      </section>
    </div>
  );
}

/** A yes/no asked in place, where the button was — never a second dialog on top. */
function Ask({
  text,
  yes,
  danger,
  onYes,
  onNo,
}: {
  text: string;
  yes: string;
  danger?: boolean;
  onYes: () => void;
  onNo: () => void;
}) {
  return (
    <div role="alertdialog" aria-label={text} className="mt-3 rounded-lg border border-line/70 p-3">
      <p className="text-sm leading-relaxed text-text">{text}</p>
      <div className="mt-3 flex gap-2">
        <button
          autoFocus
          onClick={onYes}
          className={`rounded-lg px-4 py-1.5 text-sm font-medium transition hover:brightness-110 ${
            danger ? "bg-[#c0584f] text-white" : "bg-gold text-ink"
          }`}
        >
          {yes}
        </button>
        <button
          onClick={() => {
            audio.play("ui_close");
            onNo();
          }}
          className="rounded-lg border border-line/70 px-4 py-1.5 text-sm text-muted hover:text-text"
        >
          Cancel
        </button>
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
