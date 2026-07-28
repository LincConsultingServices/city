// MAISON's interior — the DOM half. Owns the full-bleed layer, the contextual
// prompts, the live region and the keyboard, and hosts <MaisonCanvas> for the
// room itself. Default-exported because the framework mounts it through `lazy()`
// (framework/building/BuildingGate.tsx).
//
// §15 is why the DOM half is not thin. The rail is the building's primary
// non-verbal channel and must therefore be fully verbal too: every zone you
// enter, and every change to the collection, reaches the live region in plain
// language. A player who cannot see the rail reads the same season off it.
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { InteriorProps } from "@/framework/building/manifest";
import type { LevelActivity } from "@/framework/api/schemas";
import { audio } from "@/framework/audio/audioManager";
import { PlayerShell } from "@/activities/PlayerShell";
import { Icon } from "@/ui/Icon";
import { Modal, ModalClose } from "@/ui/Modal";
import { MaisonCanvas } from "./MaisonCanvas";
import { Lookbook } from "./Lookbook";
import { resetRoomState, useRoomStore } from "./roomStore";
import { stationById, zoneAt } from "./room";
import { useMaisonStore } from "./maisonStore";
import { beatActivityId, beatPrompt, liveBeatAt, nextBeat, seasonComplete } from "./beats";
import { SEASON_QUERY_KEY, fetchSeasonActivities } from "./seasonQuery";
import { TRACK_FRAMING, type Track } from "./season";
import { veraQuestion } from "./vera";
import { describeAtelier, describeCash, describePress, describeRail, railContents } from "./world";

export default function MaisonInterior({ manifest, onExit }: InteriorProps) {
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState<LevelActivity | null>(null);
  /** §15/§18.2.4: looking at the rail yields a readable list, not just a line. */
  const [railOpen, setRailOpen] = useState(false);
  /** The lookbook, on the desk where it has been all along (§13). */
  const [lookbookOpen, setLookbookOpen] = useState(false);
  /** The desk phone. Free, unscored, and available at every beat (§9.6). */
  const [callOpen, setCallOpen] = useState(false);
  const charCell = useRoomStore((s) => s.charCell);
  const zoneId = useRoomStore((s) => s.zoneId);
  const nearExit = useRoomStore((s) => s.nearExit);
  const nearStationId = useRoomStore((s) => s.nearStationId);
  const announcement = useRoomStore((s) => s.announcement);
  const world = useMaisonStore((s) => s.world);
  const track = useMaisonStore((s) => s.track);
  const decided = useMaisonStore((s) => s.decided);

  const activities = useQuery({
    queryKey: SEASON_QUERY_KEY,
    queryFn: fetchSeasonActivities,
    staleTime: 60_000,
  });

  // §8: one collection in order. Exactly one beat is live, and it is waiting at
  // its own station — Ines at the rail, Élise at her bench, Rio on the floor.
  // Approaching it is what triggers it; nothing here is on a timer.
  const liveBeat = useMemo(
    () => (track ? liveBeatAt(track, decided, nearStationId) : null),
    [track, decided, nearStationId],
  );
  const upNext = track ? nextBeat(track, decided) : null;
  const liveActivity =
    liveBeat && track ? activities.data?.get(beatActivityId(liveBeat, track)) : undefined;

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
  // A live beat outranks the station's own prompt: standing at the rail while
  // Ines is waiting there should say so, not offer to look at the collection.
  const finished = track ? seasonComplete(track, decided) : false;
  const prompt = nearExit
    ? "leave MAISON"
    : liveBeat && liveActivity
      ? beatPrompt(liveBeat)
      : station?.id === "st_desk"
        ? // §13: it has been on the desk all along. At nine of nine it is printed.
          finished
          ? "read the lookbook"
          : "look at the season so far"
        : (station?.prompt ?? null);

  // A panel over the room freezes the room, exactly as a panel over the city
  // freezes the city — so a click meant for a panel never also walks you.
  // §14: Élise asks the threshold question on first entry, once for the whole
  // city. Until it is answered there is no season to be on, so the room is
  // walkable and nothing is live.
  const needsTrack = track === null;
  const panelOpen = needsTrack || railOpen || lookbookOpen || callOpen || playing !== null;
  useEffect(() => {
    useRoomStore.getState().setInputLocked(panelOpen);
  }, [panelOpen]);

  // `act` closes over which beat is live, which changes as the season moves.
  // The key listener is bound once, so it has to reach the CURRENT act through
  // a ref — bound to the first one, pressing E would open whatever beat was
  // live when you walked in.
  const actRef = useRef(() => {});
  actRef.current = act;

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
      else actRef.current();
    }
    function leave() {
      audio.play("ui_close");
      onExit();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onExit]);

  /**
   * What a station does. A waiting beat wins — walking up to whoever is holding
   * this week's problem is how the season advances (§8). Everything else is a
   * readout: the building's feedback channel rather than its content.
   */
  function act() {
    const id = useRoomStore.getState().nearStationId;
    const w = useMaisonStore.getState().world;
    const say = useRoomStore.getState().announce;

    if (liveBeat && liveActivity) {
      audio.play("ui_open");
      setPlaying(liveActivity);
      return;
    }
    if (id === "st_phone") {
      audio.play("ui_open");
      setCallOpen(true);
      return;
    }
    if (id === "st_desk") {
      audio.play("ui_open");
      setLookbookOpen(true);
      return;
    }
    if (id === "st_rail") {
      // The blocking a11y criterion (§18.2.4): inspecting the rail produces a
      // complete list of what is on it, with prices and labels. A player who
      // cannot see the rail reads the same season off it.
      audio.play("ui_open");
      setRailOpen(true);
      say(describeRail(w));
      return;
    }
    audio.play("ui_click");
    if (id === "st_press_wall") say(describePress(w));
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
        {/* Where the season is, in the room's terms — never "3 of 9 complete". */}
        {upNext && (
          <p className="mt-0.5 text-xs text-muted">
            {upNext.host} is at {stationById(upNext.station)?.label ?? "the floor"}
          </p>
        )}
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

      {needsTrack && (
        <div className="pointer-events-auto">
          <Threshold />
        </div>
      )}

      {railOpen && (
        <div className="pointer-events-auto">
          <RailReader onClose={() => setRailOpen(false)} />
        </div>
      )}

      {/* These are `pointer-events-auto` islands over a click-through layer, so
          the room keeps its own clicks. */}
      {callOpen && (
        <div className="pointer-events-auto">
          <DeskPhone competency={upNext?.competency ?? null} onClose={() => setCallOpen(false)} />
        </div>
      )}
      {lookbookOpen && track && (
        <div className="pointer-events-auto">
          <Lookbook
            track={track}
            activities={activities.data}
            onClose={() => setLookbookOpen(false)}
          />
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

/**
 * The threshold question (§14) — asked by Élise on first entry, once for the
 * whole city. It picks the framing for the season, not a difficulty, so neither
 * answer is presented as the harder or the better one.
 */
function Threshold() {
  const chooseTrack = useMaisonStore((s) => s.chooseTrack);
  return (
    <Modal onClose={() => {}} width="sm" labelledBy="threshold-title">
      <p className="text-xs uppercase tracking-[0.2em] text-muted">MAISON</p>
      <h2 id="threshold-title" className="font-display text-2xl font-semibold text-gold">
        Élise looks up from her bench
      </h2>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        She holds it a beat longer than is comfortable, then asks the question she asks everyone
        once.
      </p>
      <p className="mt-3 font-display text-lg text-gold">
        “Is MAISON the label you&apos;re starting, or the one you&apos;re taking over?”
      </p>
      <div className="mt-5 space-y-2">
        {(["A", "B"] as Track[]).map((t) => (
          <button
            key={t}
            onClick={() => {
              audio.play("ui_confirm");
              chooseTrack(t);
            }}
            className="w-full rounded-xl border border-line bg-surface-2 px-4 py-3 text-left text-sm leading-relaxed text-text transition hover:border-gold/50 hover:brightness-110"
          >
            {TRACK_FRAMING[t]}
          </button>
        ))}
      </div>
    </Modal>
  );
}

/**
 * The desk phone (§9.6). Free, unscored, available at every beat — she asks a
 * question and never gives an answer, and calling her costs nothing, because a
 * lifeline that costs something is a lifeline nobody uses.
 */
function DeskPhone({ competency, onClose }: { competency: string | null; onClose: () => void }) {
  return (
    <Modal onClose={onClose} width="sm" labelledBy="phone-title">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted">The desk phone</p>
          <h2 id="phone-title" className="font-display text-2xl font-semibold text-gold">
            Véra
          </h2>
        </div>
        <ModalClose onClose={onClose} label="Hang up" />
      </div>
      <p className="mt-4 text-sm leading-relaxed text-text">{veraQuestion(competency)}</p>
      <p className="mt-4 text-xs text-muted">
        She waits. Calling her is free, it is not scored, and she is not going to tell you what to
        do.
      </p>
      <button
        onClick={onClose}
        className="mt-5 rounded-lg bg-gold px-5 py-2 font-medium text-ink hover:brightness-110"
      >
        Put the phone down
      </button>
    </Modal>
  );
}

/**
 * Standing in the pool of light, looking at what you have made (§3.3). Every
 * piece, its price and what its neck says — the same season the brass is
 * showing, in words, because §18.2.4 makes that blocking.
 *
 * It reports. Nothing here is lit, ordered or framed as better than anything
 * else on the rail (§11).
 */
function RailReader({ onClose }: { onClose: () => void }) {
  const world = useMaisonStore((s) => s.world);
  const pieces = railContents(world);
  return (
    <Modal onClose={onClose} width="sm" labelledBy="rail-title">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted">The collection</p>
          <h2 id="rail-title" className="font-display text-2xl font-semibold text-gold">
            On the rail
          </h2>
        </div>
        <ModalClose onClose={onClose} label="Step back" />
      </div>

      <p className="mt-3 text-sm leading-relaxed text-text">{describeRail(world)}</p>

      <ul className="mt-4 space-y-1.5">
        {pieces.map((piece, i) => (
          <li
            key={i}
            className="flex items-baseline justify-between gap-3 border-b border-line/60 pb-1.5 text-sm"
          >
            <span className="text-text">{piece.label}</span>
            <span className="text-xs text-muted">{piece.neck}</span>
            <span className="tabular-nums text-muted">{piece.price}</span>
          </li>
        ))}
      </ul>

      <p className="mt-4 text-xs text-muted">
        {pieces.length} {pieces.length === 1 ? "piece" : "pieces"} · {world.countdown} to the show
      </p>
    </Modal>
  );
}
