// The Café interior — the DOM half. Owns the contextual prompts, the hotspot
// panel, the station list, the live region and the keyboard, and hosts
// <CafeCanvas> for the room itself. Default-exported because the framework
// mounts it through `lazy()` (framework/building/BuildingGate.tsx).
//
// The prompts here deliberately read like the city's "Enter <venue>" pill — same
// shape, same key badge — so stepping indoors doesn't change the vocabulary.
import { useCallback, useEffect, useState } from "react";
import type { InteriorProps } from "@/framework/building/manifest";
import { audio } from "@/framework/audio/audioManager";
import { Icon } from "@/ui/Icon";
import { Modal } from "@/ui/Modal";
import { CafeCanvas } from "./CafeCanvas";
import { closeHotspot, openHotspot, resetCafeState, toggleFlap, useCafeStore } from "./cafeStore";
import { GATES, HOTSPOTS, STATIONS, zoneAt } from "./room";

export default function CafeInterior({ manifest, onExit }: InteriorProps) {
  const [ready, setReady] = useState(false);
  const charCell = useCafeStore((s) => s.charCell);
  const nearExit = useCafeStore((s) => s.nearExit);
  const nearGateId = useCafeStore((s) => s.nearGateId);
  const nearHotspotId = useCafeStore((s) => s.nearHotspotId);
  const openHotspotId = useCafeStore((s) => s.openHotspotId);
  const flapOpen = useCafeStore((s) => s.flapOpen);
  const announcement = useCafeStore((s) => s.announcement);

  // Every visit starts at the door with the flap down, which keeps the store and
  // the canvas's own gate set in step (the canvas boots with no gates open).
  useEffect(() => {
    resetCafeState();
  }, []);

  const gate = nearGateId ? (GATES.find((g) => g.id === nearGateId) ?? null) : null;
  const hotspot = nearHotspotId ? (HOTSPOTS.find((h) => h.id === nearHotspotId) ?? null) : null;
  const openSpot = openHotspotId ? (HOTSPOTS.find((h) => h.id === openHotspotId) ?? null) : null;

  /**
   * One prompt slot, three things competing for it. The door wins when you are
   * standing in it — leaving must never be harder than anything else in the room
   * — then the flap, then whatever you can read. Reads live state rather than
   * closing over props, so the keyboard and the button can share it.
   */
  const act = useCallback(() => {
    const s = useCafeStore.getState();
    if (s.nearExit) {
      audio.play("ui_close");
      onExit();
    } else if (s.nearGateId) {
      toggleFlap();
    } else if (s.nearHotspotId) {
      openHotspot(s.nearHotspotId);
    }
  }, [onExit]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        // A panel closes first; only then does Escape mean "leave".
        if (useCafeStore.getState().openHotspotId) closeHotspot();
        else leave();
        return;
      }
      if (e.key !== "e" && e.key !== "E" && e.key !== "Enter") return;
      if (useCafeStore.getState().inputLocked) return;
      act();
    }
    function leave() {
      audio.play("ui_close");
      onExit();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onExit, act]);

  const prompt = nearExit
    ? "leave the café"
    : gate
      ? flapOpen
        ? gate.closePrompt
        : gate.openPrompt
      : (hotspot?.prompt ?? null);

  return (
    // Transparent, and click-through by default. The room is drawn into the
    // city's own canvas underneath this layer, so an opaque background would
    // hide it and a solid hit area would swallow every click meant for it.
    // Interactive children opt back in with `pointer-events-auto`.
    <div className="pointer-events-none absolute inset-0 z-20 animate-fade-in">
      <CafeCanvas onReady={() => setReady(true)} />

      {!ready && (
        <div className="absolute inset-0 grid place-items-center bg-ink">
          <p className="text-sm text-muted">Pushing the door open…</p>
        </div>
      )}

      {/* Where you are, in the room's own words. */}
      <div className="pointer-events-none absolute left-5 top-5 z-10">
        <p className="font-display text-lg font-semibold text-gold">{manifest.displayName}</p>
        <p className="text-xs uppercase tracking-widest text-muted">{zoneAt(charCell).label}</p>
      </div>

      {/* The door is never blocked — you can always go, from anywhere. */}
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

      {prompt && !openSpot && (
        <div className="pointer-events-none absolute bottom-10 left-1/2 z-10 -translate-x-1/2 animate-slide-up">
          <button
            onClick={act}
            className="pointer-events-auto rounded-full border border-gold/60 bg-surface/90 px-5 py-2.5 text-sm text-text shadow-lg backdrop-blur"
          >
            <span className="font-semibold text-gold">{prompt}</span>
            <span className="ml-2 rounded bg-line/50 px-1.5 py-0.5 text-xs text-muted">E</span>
          </button>
        </div>
      )}

      {/* Guided navigation (PRD §14.2): cross the room without steering. The
          room's own words, never "object_04". */}
      <nav
        aria-label="Places in the café"
        className="pointer-events-auto absolute bottom-4 left-5 z-10 flex flex-wrap items-center gap-1.5"
      >
        <span className="mr-1 text-xs uppercase tracking-widest text-muted">go to</span>
        {STATIONS.map((s) => (
          <button
            key={s.id}
            onClick={() => useCafeStore.getState().setWalkTo(s.cell)}
            className="rounded-full border border-line/70 bg-surface/70 px-2.5 py-1 text-xs text-muted backdrop-blur hover:border-gold/60 hover:text-text"
          >
            {s.label}
          </button>
        ))}
      </nav>

      <p className="pointer-events-none absolute bottom-4 right-5 z-10 text-xs text-muted">
        WASD or click to move · E to interact
      </p>

      {openSpot && (
        <div className="pointer-events-auto">
          <Modal onClose={closeHotspot} width="sm">
            <h2 className="font-display text-xl font-semibold text-gold">{openSpot.title}</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted">{openSpot.body}</p>
            <button
              onClick={closeHotspot}
              className="mt-5 rounded-lg bg-gold px-5 py-2 font-medium text-ink hover:brightness-110"
            >
              Back to the room
            </button>
          </Modal>
        </div>
      )}

      {/* A change a sighted player sees must reach everyone else too. The city has
          no live region of its own yet, so the Café carries one. */}
      <p aria-live="polite" className="sr-only">
        {announcement.text}
      </p>
    </div>
  );
}
