// MAISON's interior — the DOM half. Owns the full-bleed layer, the contextual
// prompts, the live region and the keyboard, and hosts <MaisonCanvas> for the
// room itself. Default-exported because the framework mounts it through `lazy()`
// (framework/building/BuildingGate.tsx).
//
// §15 is why the DOM half is not thin. The rail is the building's primary
// non-verbal channel and must therefore be fully verbal too: every zone you
// enter, and every change to the collection, reaches the live region in plain
// language. A player who cannot see the rail reads the same season off it.
import { useEffect, useRef, useState } from "react";
import type { InteriorProps } from "@/framework/building/manifest";
import type { LevelActivity } from "@/framework/api/schemas";
import { audio } from "@/framework/audio/audioManager";
import { PlayerShell } from "@/activities/PlayerShell";
import { Icon } from "@/ui/Icon";
import { VENUES } from "@/world/cityMap";
import { MaisonCanvas } from "./MaisonCanvas";
import { MaisonPanel } from "./MaisonPanel";
import { resetRoomState, useRoomStore } from "./roomStore";
import { stationById, zoneAt } from "./room";
import { useMaisonStore } from "./maisonStore";
import { describeAtelier, describeCash, describePress, describeRail } from "./world";

export default function MaisonInterior({ manifest, onExit }: InteriorProps) {
  const [ready, setReady] = useState(false);
  // The season, opened from the desk. M4 moves the beats out to their stations
  // (§8) so they arrive where they happen; until then the desk is where the
  // collection is worked on, which is also where §13 says the lookbook lives.
  const [boardOpen, setBoardOpen] = useState(false);
  const [playing, setPlaying] = useState<LevelActivity | null>(null);
  const charCell = useRoomStore((s) => s.charCell);
  const zoneId = useRoomStore((s) => s.zoneId);
  const nearExit = useRoomStore((s) => s.nearExit);
  const nearStationId = useRoomStore((s) => s.nearStationId);
  const announcement = useRoomStore((s) => s.announcement);
  const world = useMaisonStore((s) => s.world);

  // Every visit starts at the desk, facing the rail (§3.2).
  useEffect(() => {
    resetRoomState();
  }, []);

  // §15: entering a zone announces the zone AND its state — the atelier's mood
  // is carried by how much noise the work makes, so it has to be said in words
  // too. Skipped on the first pass so arriving does not announce twice.
  const firstZone = useRef(true);
  useEffect(() => {
    if (firstZone.current) {
      firstZone.current = false;
      return;
    }
    const zone = zoneAt(useRoomStore.getState().charCell);
    const detail =
      zone.id === "z_atelier"
        ? ` — ${describeAtelier(world).replace("the atelier — ", "")}`
        : zone.id === "z_rail"
          ? ` — ${describeRail(world)}`
          : zone.id === "z_stair"
            ? ` — ${describePress(world)}`
            : "";
    useRoomStore.getState().announce(`${zone.label}${detail}`);
  }, [zoneId, world]);

  // §3.3: every rail change is announced, wherever you are standing.
  const firstRail = useRef(true);
  useEffect(() => {
    if (firstRail.current) {
      firstRail.current = false;
      return;
    }
    useRoomStore.getState().announce(describeRail(world));
  }, [world]);

  const station = nearStationId ? stationById(nearStationId) : undefined;
  const prompt = nearExit ? "leave MAISON" : (station?.prompt ?? null);
  /** The city's record of this venue — MaisonPanel wants the same one the street does. */
  const venue = VENUES.find((v) => v.id === manifest.id) ?? null;

  // A panel over the room freezes the room, exactly as a panel over the city
  // freezes the city — so a click meant for the board never also walks you.
  const panelOpen = boardOpen || playing !== null;
  useEffect(() => {
    useRoomStore.getState().setInputLocked(panelOpen);
  }, [panelOpen]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        // The panels own Escape while they are up; the door only wins when
        // there is nothing between you and it.
        if (useRoomStore.getState().inputLocked) return;
        leave();
        return;
      }
      if (e.key !== "e" && e.key !== "E" && e.key !== "Enter") return;
      if (useRoomStore.getState().inputLocked) return;
      // The door wins when you are standing in it; otherwise use the station.
      if (useRoomStore.getState().nearExit) leave();
      else act();
    }
    function leave() {
      audio.play("ui_close");
      onExit();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onExit]);

  /**
   * What a station does. M4 hangs the beats off this; for now the readouts —
   * the rail, the press wall, the countdown — already work, because they are
   * the building's feedback channel rather than its content (§3.3, §11).
   */
  function act() {
    const id = useRoomStore.getState().nearStationId;
    const w = useMaisonStore.getState().world;
    const say = useRoomStore.getState().announce;
    if (id === "st_desk") {
      audio.play("ui_open");
      setBoardOpen(true);
      return;
    }
    audio.play("ui_click");
    if (id === "st_rail") say(describeRail(w));
    else if (id === "st_press_wall") say(describePress(w));
    else if (id === "st_column") say(`The column reads ${w.countdown}.`);
    else if (id === "st_cutting_table" || id === "st_bench") say(describeCash(w));
  }

  return (
    // Transparent and click-through by default: the room is drawn into the
    // city's own canvas underneath this layer. Interactive children opt back in.
    <div className="pointer-events-none absolute inset-0 z-20 animate-fade-in">
      <MaisonCanvas onReady={() => setReady(true)} />

      {!ready && (
        <div className="absolute inset-0 grid place-items-center bg-ink">
          <p className="text-sm text-muted">The door is heavy…</p>
        </div>
      )}

      {/* Where you are, in the house's own words — and the countdown, which §15
          requires in the DOM and not only chalked on a column. */}
      <div className="pointer-events-none absolute left-5 top-5 z-10">
        <p className="font-display text-lg font-semibold text-gold">{manifest.displayName}</p>
        <p className="text-xs uppercase tracking-widest text-muted">{zoneAt(charCell).label}</p>
        <p className="mt-1 text-xs tabular-nums text-muted">{world.countdown} to the show</p>
      </div>

      <button
        onClick={() => {
          audio.play("ui_close");
          onExit();
        }}
        className="pointer-events-auto absolute right-5 top-5 z-10 flex items-center gap-2 rounded-full border border-line/70 bg-surface/80 px-4 py-2 text-sm text-text backdrop-blur hover:brightness-110"
      >
        <Icon name="home" className="h-4 w-4" />
        Back to the street
        <span className="rounded bg-line/50 px-1.5 py-0.5 text-xs text-muted">Esc</span>
      </button>

      {prompt && (
        <div className="pointer-events-none absolute bottom-10 left-1/2 z-10 -translate-x-1/2 animate-slide-up">
          <button
            onClick={() => (nearExit ? onExit() : act())}
            className="pointer-events-auto rounded-full border border-gold/60 bg-surface/90 px-5 py-2.5 text-sm text-text shadow-lg backdrop-blur"
          >
            <span className="font-semibold text-gold">{prompt}</span>
            <span className="ml-2 rounded bg-line/50 px-1.5 py-0.5 text-xs text-muted">E</span>
          </button>
        </div>
      )}

      <p className="pointer-events-none absolute bottom-4 left-5 z-10 text-xs text-muted">
        WASD or click to move · E to look
      </p>

      {/* The season, worked on at the desk. These are `pointer-events-auto`
          islands over a click-through layer, so the room keeps its own clicks. */}
      {boardOpen && !playing && venue && (
        <div className="pointer-events-auto">
          <MaisonPanel venue={venue} onClose={() => setBoardOpen(false)} onPlay={setPlaying} />
        </div>
      )}
      {playing && (
        <div className="pointer-events-auto">
          <PlayerShell
            activity={playing}
            venueName={manifest.displayName}
            onClose={() => setPlaying(null)}
          />
        </div>
      )}

      {/* §15: the rail is the primary non-verbal channel, so it is fully verbal
          too. Zone changes and every change to the collection land here. */}
      <p aria-live="polite" className="sr-only">
        {announcement.text}
      </p>
    </div>
  );
}
