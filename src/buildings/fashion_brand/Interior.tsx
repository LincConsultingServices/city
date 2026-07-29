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
import { audio } from "@/framework/audio/audioManager";
import { PlayerShell } from "@/activities/PlayerShell";
import { Icon } from "@/ui/Icon";
import { MaisonCanvas } from "./MaisonCanvas";
import { Lookbook } from "./Lookbook";
import { DeskPhone, Mirror, RailReader, Threshold } from "./panels";
import { actHere, resetRoomState, useRoomStore } from "./roomStore";
import { stationById, zoneAt } from "./room";
import { useMaisonStore } from "./maisonStore";
import { beatActivityId, beatPrompt, liveBeatAt, nextBeat, seasonComplete } from "./beats";
import { SEASON_QUERY_KEY, fetchSeasonActivities } from "./seasonQuery";
import { describeAtelier, describePress, describeRail } from "./world";

export default function MaisonInterior({ manifest, onExit }: InteriorProps) {
  const [ready, setReady] = useState(false);
  // Which reader is up lives in the store, not here, so a click on the rail in
  // the room and the E key open it by the same path (§18.2.5).
  const panel = useRoomStore((s) => s.panel);
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

  // The season query lives here, so the room learns from here whether the beat
  // standing in front of you is one it can actually open.
  useEffect(() => {
    useRoomStore.getState().setBeatReady(Boolean(liveBeat && liveActivity));
  }, [liveBeat, liveActivity]);

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
  const panelOpen = needsTrack || panel !== null;
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
      else actHere();
    }
    function leave() {
      audio.play("ui_close");
      onExit();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onExit]);

  const close = () => useRoomStore.getState().setPanel(null);

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
            onClick={() => {
              // The same door as the key and the button, so it sounds the same.
              if (!nearExit) return void actHere();
              audio.play("ui_close");
              onExit();
            }}
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

      {/* These are `pointer-events-auto` islands over a click-through layer, so
          the room keeps its own clicks. */}
      {panel && (
        <div className="pointer-events-auto">
          {panel === "rail" && <RailReader onClose={close} />}
          {panel === "mirror" && <Mirror onClose={close} />}
          {panel === "phone" && (
            <DeskPhone competency={upNext?.competency ?? null} onClose={close} />
          )}
          {panel === "lookbook" && track && (
            <Lookbook track={track} activities={activities.data} onClose={close} />
          )}
          {panel === "beat" && liveActivity && (
            <PlayerShell activity={liveActivity} venueName={manifest.displayName} onClose={close} />
          )}
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
