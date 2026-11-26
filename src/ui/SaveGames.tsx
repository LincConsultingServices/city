// Options → Game save: six named slots, the Autosave slot, the autosave switch
// and restarting. GTA-style: pick a slot, name it, overwrite it when you like.
//
// Each card shows the name the player gave it and where they were in the
// story, with the money and badges at the time underneath. Loading puts all
// of it back — cash, bank, badges and all — and reloads the page.
import { useCallback, useEffect, useState } from "react";
import { audio } from "@/framework/audio/audioManager";
import type { SaveSlot, SaveState } from "@/framework/api";
import {
  deleteSlot,
  listSaves,
  loadSlot,
  renameSlot,
  restartGame,
  saveToSlot,
  setAutosave,
  storyLabel,
} from "@/framework/saves/saveGame";

/** "just now", "4 minutes ago", "2 days ago". */
function ago(iso: string | undefined, now = Date.now()): string {
  if (!iso) return "";
  const s = Math.max(0, Math.round((now - Date.parse(iso)) / 1000));
  if (s < 45) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} minute${m === 1 ? "" : "s"} ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hour${h === 1 ? "" : "s"} ago`;
  const d = Math.round(h / 24);
  return `${d} day${d === 1 ? "" : "s"} ago`;
}

type Pending =
  | { kind: "save"; slot: SaveSlot; name: string }
  | { kind: "rename"; slot: SaveSlot; name: string }
  | { kind: "load"; slot: SaveSlot }
  | { kind: "delete"; slot: SaveSlot }
  | { kind: "restart" }
  | { kind: "autosave_off" };

const btn = "rounded-lg border border-line/70 px-3 py-1.5 text-xs text-text hover:border-gold/60 disabled:opacity-50";
const gold = "rounded-lg bg-gold px-3 py-1.5 text-xs font-medium text-ink hover:brightness-110 disabled:opacity-50";

export function SaveGames() {
  const [slots, setSlots] = useState<SaveSlot[] | null>(null);
  const [state, setState] = useState<SaveState | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const refresh = useCallback(() => {
    listSaves()
      .then((r) => {
        setSlots(r.slots);
        setState(r.state);
      })
      .catch(() => setNotice("Couldn't reach your saves just now. Try again in a moment."));
  }, []);
  useEffect(refresh, [refresh]);

  const run = async (what: () => Promise<unknown>, done: string) => {
    setBusy(true);
    setNotice(null);
    try {
      await what();
      audio.play("ui_confirm");
      setNotice(done);
      setPending(null);
      refresh();
    } catch (e) {
      audio.play("ui_error");
      setNotice(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  if (!slots || !state) {
    return <p className="text-sm text-muted">{notice ?? "Opening your saves…"}</p>;
  }

  const auto = slots.find((s) => s.slot === "auto");
  const manual = slots.filter((s) => s.slot !== "auto");

  return (
    <div className="space-y-5">
      {/* Autosave */}
      <section className="rounded-xl border border-line/60 bg-surface-2/40 p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-text">Autosave</p>
            <p className="mt-0.5 text-xs leading-relaxed text-muted">
              {state.autosave
                ? "On: the game saves itself to the Autosave slot as you play, and nothing is lost when you close it."
                : `Off: only your own saves are kept. Close the game without saving and you'll come back to ${
                    state.anchorName ? `“${state.anchorName}”` : "your last save"
                  }.`}
            </p>
          </div>
          <button
            role="switch"
            aria-checked={state.autosave}
            disabled={busy}
            onClick={() =>
              state.autosave
                ? setPending({ kind: "autosave_off" })
                : void run(() => setAutosave(true), "Autosave is on.")
            }
            className={`relative h-6 w-11 shrink-0 rounded-full transition ${state.autosave ? "bg-gold" : "bg-line"}`}
          >
            <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${state.autosave ? "left-[22px]" : "left-0.5"}`} />
          </button>
        </div>
        {pending?.kind === "autosave_off" && (
          <Ask
            text="Turn autosave off? From now on, if you close the game without saving, everything since your last save is lost. Your last save is right now."
            yes="Turn it off"
            onYes={() => void run(() => setAutosave(false), "Autosave is off.")}
            onNo={() => setPending(null)}
          />
        )}
        {auto && <SlotCard slot={auto} label="Autosave" busy={busy} onLoad={() => setPending({ kind: "load", slot: auto })} />}
        {pending?.kind === "load" && pending.slot.slot === "auto" && (
          <Ask
            text="Load the autosave? The game goes back to that moment: money, bank, badges and story."
            yes="Load it"
            onYes={() => void run(() => loadSlot("auto"), "Loading…")}
            onNo={() => setPending(null)}
          />
        )}
      </section>

      {/* The six slots */}
      <section>
        <p className="text-sm font-medium text-text">Your saves</p>
        <p className="mt-0.5 text-xs text-muted">Now: {storyLabel()}</p>
        <ul className="mt-3 space-y-2">
          {manual.map((s) => {
            const empty = !s.savedAt;
            const here = pending && "slot" in pending && pending.slot.slot === s.slot ? pending : null;
            return (
              <li key={s.slot} className="rounded-xl border border-line/60 bg-surface-2/40 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-widest text-muted">Slot {s.slot}</p>
                    {empty ? (
                      <p className="text-sm text-muted">Empty</p>
                    ) : (
                      <>
                        <p className="truncate text-sm font-semibold text-text">{s.name}</p>
                        <p className="truncate text-xs text-gold">{s.story}</p>
                        <p className="mt-0.5 text-[11px] text-muted">
                          {ago(s.savedAt)} · cash ${s.cash}
                          {typeof s.bank === "number" ? ` · bank $${s.bank}` : ""} · {s.badges} badge{s.badges === 1 ? "" : "s"}
                        </p>
                      </>
                    )}
                  </div>
                  {!here && (
                    <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
                      <button
                        className={gold}
                        disabled={busy}
                        onClick={() => setPending({ kind: "save", slot: s, name: empty ? "" : s.name })}
                      >
                        {empty ? "Save here" : "Overwrite"}
                      </button>
                      {!empty && (
                        <>
                          <button className={btn} disabled={busy} onClick={() => setPending({ kind: "load", slot: s })}>
                            Load
                          </button>
                          <button className={btn} disabled={busy} onClick={() => setPending({ kind: "rename", slot: s, name: s.name })}>
                            Rename
                          </button>
                          <button className={btn} disabled={busy} onClick={() => setPending({ kind: "delete", slot: s })}>
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {here?.kind === "save" && (
                  <NameIt
                    title={empty ? "Name this save" : `Overwrite “${s.name}” with the game as it is now?`}
                    name={here.name}
                    placeholder={storyLabel()}
                    yes={empty ? "Save" : "Overwrite"}
                    busy={busy}
                    onChange={(name) => setPending({ ...here, name })}
                    onYes={() => void run(() => saveToSlot(s.slot, here.name || storyLabel()), "Game saved.")}
                    onNo={() => setPending(null)}
                  />
                )}
                {here?.kind === "rename" && (
                  <NameIt
                    title="Rename this save"
                    name={here.name}
                    yes="Rename"
                    busy={busy}
                    onChange={(name) => setPending({ ...here, name })}
                    onYes={() => void run(() => renameSlot(s.slot, here.name), "Renamed.")}
                    onNo={() => setPending(null)}
                  />
                )}
                {here?.kind === "load" && (
                  <Ask
                    text={`Load “${s.name}”? The game goes back to that moment: money, bank, badges and story. Anything since then that isn't saved is lost.`}
                    yes="Load it"
                    onYes={() => void run(() => loadSlot(s.slot), "Loading…")}
                    onNo={() => setPending(null)}
                  />
                )}
                {here?.kind === "delete" && (
                  <Ask
                    text={`Delete “${s.name}”? This can't be undone. Your game itself isn't affected.`}
                    yes="Delete it"
                    danger
                    onYes={() => void run(() => deleteSlot(s.slot), "Save deleted.")}
                    onNo={() => setPending(null)}
                  />
                )}
              </li>
            );
          })}
        </ul>
        <p role="status" className="mt-2 min-h-[1rem] text-xs text-muted">
          {notice}
        </p>
      </section>

      {/* Restart, kept apart on purpose */}
      <section className="border-t border-line/60 pt-4">
        <p className="text-sm font-medium text-text">Restart the game</p>
        <p className="mt-1 text-xs leading-relaxed text-muted">
          A brand-new game: your cash goes back to the starting $100, and your badges, bank account, shop items and story
          progress are cleared. Your saves, your level choice and your settings are kept, so you can load a save afterwards.
        </p>
        {pending?.kind === "restart" ? (
          <Ask
            text="Restart from the very beginning? Everything that isn't in a save is lost."
            yes="Yes, restart"
            danger
            onYes={() => void run(() => restartGame(), "Restarting…")}
            onNo={() => setPending(null)}
          />
        ) : (
          <button
            onClick={() => setPending({ kind: "restart" })}
            disabled={busy}
            className="mt-3 rounded-lg border border-[#c0584f]/60 px-4 py-2 text-sm text-[#e08a82] transition hover:bg-[#c0584f]/10 disabled:opacity-50"
          >
            Restart…
          </button>
        )}
      </section>
    </div>
  );
}

function SlotCard({ slot, label, busy, onLoad }: { slot: SaveSlot; label: string; busy: boolean; onLoad: () => void }) {
  return (
    <div className="mt-3 flex items-start justify-between gap-3 rounded-lg border border-line/50 p-3">
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-widest text-muted">{label}</p>
        {slot.savedAt ? (
          <>
            <p className="truncate text-xs text-gold">{slot.story}</p>
            <p className="mt-0.5 text-[11px] text-muted">
              {ago(slot.savedAt)} · cash ${slot.cash}
              {typeof slot.bank === "number" ? ` · bank $${slot.bank}` : ""} · {slot.badges} badge{slot.badges === 1 ? "" : "s"}
            </p>
          </>
        ) : (
          <p className="text-xs text-muted">Nothing autosaved yet.</p>
        )}
      </div>
      {slot.savedAt && (
        <button className={btn} disabled={busy} onClick={onLoad}>
          Load
        </button>
      )}
    </div>
  );
}

function NameIt({
  title,
  name,
  placeholder,
  yes,
  busy,
  onChange,
  onYes,
  onNo,
}: {
  title: string;
  name: string;
  placeholder?: string;
  yes: string;
  busy: boolean;
  onChange: (name: string) => void;
  onYes: () => void;
  onNo: () => void;
}) {
  return (
    <div className="mt-3 rounded-lg border border-line/70 p-3">
      <p className="text-sm text-text">{title}</p>
      <input
        autoFocus
        maxLength={40}
        value={name}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && onYes()}
        className="mt-2 w-full rounded-lg border border-line/70 bg-surface-2/70 px-3 py-2 text-sm text-text outline-none focus:border-gold/70"
      />
      <div className="mt-3 flex gap-2">
        <button onClick={onYes} disabled={busy} className={gold}>
          {busy ? "Saving…" : yes}
        </button>
        <button onClick={onNo} className={btn}>
          Cancel
        </button>
      </div>
    </div>
  );
}

function Ask({ text, yes, danger, onYes, onNo }: { text: string; yes: string; danger?: boolean; onYes: () => void; onNo: () => void }) {
  return (
    <div role="alertdialog" aria-label={text} className="mt-3 rounded-lg border border-line/70 p-3">
      <p className="text-sm leading-relaxed text-text">{text}</p>
      <div className="mt-3 flex gap-2">
        <button
          autoFocus
          onClick={onYes}
          className={`rounded-lg px-4 py-1.5 text-sm font-medium transition hover:brightness-110 ${danger ? "bg-[#c0584f] text-white" : "bg-gold text-ink"}`}
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
