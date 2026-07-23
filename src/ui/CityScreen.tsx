import { useEffect, useState } from "react";
import { CityCanvas } from "@/world/CityCanvas";
import { VENUES, type CityBuilding } from "@/world/cityMap";
import { useWorldStore } from "@/world/worldStore";
import { Hud } from "./Hud";
import { ActivityListPanel } from "@/activities/ActivityListPanel";
import { PlayerShell } from "@/activities/PlayerShell";
import type { LevelActivity } from "@/framework/api/schemas";

export function CityScreen() {
  const nearVenueId = useWorldStore((s) => s.nearVenueId);
  const setInputLocked = useWorldStore((s) => s.setInputLocked);
  const [openVenue, setOpenVenue] = useState<CityBuilding | null>(null);
  const [playing, setPlaying] = useState<LevelActivity | null>(null);
  const [worldReady, setWorldReady] = useState(false);

  const nearVenue = nearVenueId ? (VENUES.find((v) => v.id === nearVenueId) ?? null) : null;
  const panelOpen = openVenue !== null || playing !== null;

  useEffect(() => {
    setInputLocked(panelOpen);
  }, [panelOpen, setInputLocked]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (playing) setPlaying(null);
        else if (openVenue) setOpenVenue(null);
        return;
      }
      if ((e.key === "e" || e.key === "E" || e.key === "Enter") && !panelOpen && nearVenue) {
        setOpenVenue(nearVenue);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [nearVenue, panelOpen, openVenue, playing]);

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-ink">
      <CityCanvas onReady={() => setWorldReady(true)} />
      {!worldReady && (
        <div className="absolute inset-0 z-20 grid place-items-center bg-ink">
          <div className="text-center">
            <h1 className="font-display text-3xl font-semibold text-gold">THE CITY</h1>
            <p className="mt-2 text-sm text-muted">Entering the city…</p>
          </div>
        </div>
      )}
      <Hud />
      <ControlsHint />

      {nearVenue && !panelOpen && (
        <div className="pointer-events-none absolute bottom-10 left-1/2 z-10 -translate-x-1/2">
          <button
            onClick={() => setOpenVenue(nearVenue)}
            className="pointer-events-auto rounded-full border border-gold/60 bg-surface/90 px-5 py-2.5 text-sm text-text shadow-lg backdrop-blur"
          >
            Enter <span className="font-semibold text-gold">{nearVenue.displayName}</span>
            <span className="ml-2 rounded bg-line/50 px-1.5 py-0.5 text-xs text-muted">E</span>
          </button>
        </div>
      )}

      {openVenue && !playing && openVenue.kind === "competency" && (
        <ActivityListPanel
          venue={openVenue}
          onClose={() => setOpenVenue(null)}
          onPlay={(a) => setPlaying(a)}
        />
      )}
      {openVenue && !playing && openVenue.kind !== "competency" && (
        <InfoPanel venue={openVenue} onClose={() => setOpenVenue(null)} />
      )}

      {playing && openVenue && (
        <PlayerShell
          activity={playing}
          venueName={openVenue.displayName}
          onClose={() => setPlaying(null)}
        />
      )}
    </div>
  );
}

function InfoPanel({ venue, onClose }: { venue: CityBuilding; onClose: () => void }) {
  const copy: Record<string, { title: string; body: string }> = {
    shop: {
      title: "The Shop",
      body: "Spend your coins on cosmetics here. Opens once the economy endpoints land (a later phase).",
    },
    trophy: {
      title: "Trophy Hall",
      body: "Your earned badges will stand on these shelves. Coming in a later phase.",
    },
    locked: {
      title: "Custom venue",
      body: "A client-configurable venue — ships disabled until a client is set up.",
    },
    cafe: {
      title: "Café",
      body: "A dedicated venue, scaffolded and ready — wire up its activities, theme and competency draw whenever you're ready.",
    },
  };
  const c = copy[venue.kind] ?? { title: venue.displayName, body: "Coming soon." };
  return (
    <div
      className="absolute inset-0 z-20 grid place-items-center bg-ink/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-line bg-surface p-6 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-display text-2xl font-semibold text-gold">{c.title}</h2>
        <p className="mt-3 text-sm text-muted">{c.body}</p>
        <button
          onClick={onClose}
          className="mt-5 rounded-lg bg-gold px-5 py-2 font-medium text-ink hover:brightness-110"
        >
          Got it
        </button>
      </div>
    </div>
  );
}

function ControlsHint() {
  return (
    <div className="pointer-events-none absolute bottom-4 left-4 z-10 rounded-lg border border-line/60 bg-surface/70 px-3 py-2 text-xs text-muted backdrop-blur">
      <span className="text-text">WASD</span> / <span className="text-text">click</span> to move ·{" "}
      <span className="text-text">E</span> to enter
    </div>
  );
}
