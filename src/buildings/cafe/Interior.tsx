// The Café interior — the DOM half. Owns the full-bleed layer, the contextual
// prompts, the live region and the keyboard, and hosts <CafeCanvas> for the room
// itself. Default-exported because the framework mounts it through `lazy()`
// (framework/building/BuildingGate.tsx).
//
// The prompts here deliberately read like the city's "Enter <venue>" pill — same
// shape, same key badge — so stepping indoors doesn't change the vocabulary.
import { useEffect, useState } from "react";
import type { InteriorProps } from "@/framework/building/manifest";
import { audio } from "@/framework/audio/audioManager";
import { Icon } from "@/ui/Icon";
import { CafeCanvas } from "./CafeCanvas";
import { resetCafeState, toggleFlap, useCafeStore } from "./cafeStore";
import { GATES, zoneAt } from "./room";

export default function CafeInterior({ manifest, onExit }: InteriorProps) {
  const [ready, setReady] = useState(false);
  const charCell = useCafeStore((s) => s.charCell);
  const nearExit = useCafeStore((s) => s.nearExit);
  const nearGateId = useCafeStore((s) => s.nearGateId);
  const flapOpen = useCafeStore((s) => s.flapOpen);
  const announcement = useCafeStore((s) => s.announcement);

  // Every visit starts at the door with the flap down, which keeps the store and
  // the canvas's own gate set in step (the canvas boots with no gates open).
  useEffect(() => {
    resetCafeState();
  }, []);

  const gate = nearGateId ? (GATES.find((g) => g.id === nearGateId) ?? null) : null;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        leave();
        return;
      }
      if (e.key !== "e" && e.key !== "E" && e.key !== "Enter") return;
      if (useCafeStore.getState().inputLocked) return;
      // The door wins when you're standing in it; otherwise work the flap.
      if (useCafeStore.getState().nearExit) leave();
      else if (useCafeStore.getState().nearGateId) toggleFlap();
    }
    function leave() {
      audio.play("ui_close");
      onExit();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onExit]);

  const prompt = nearExit
    ? "leave the café"
    : gate
      ? flapOpen
        ? gate.closePrompt
        : gate.openPrompt
      : null;

  const act = () => {
    if (nearExit) {
      audio.play("ui_close");
      onExit();
    } else if (gate) {
      toggleFlap();
    }
  };

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

      {prompt && (
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

      <p className="pointer-events-none absolute bottom-4 left-5 z-10 text-xs text-muted">
        WASD or click to move · E to interact
      </p>

      {/* A change a sighted player sees must reach everyone else too. The city has
          no live region of its own yet, so the Café carries one. */}
      <p aria-live="polite" className="sr-only">
        {announcement.text}
      </p>
    </div>
  );
}
