import { useCallback, useEffect, useRef, useState } from "react";
import { CityCanvas } from "@/world/CityCanvas";
import { VENUES, type CityBuilding } from "@/world/cityMap";
import { useWorldStore } from "@/world/worldStore";
import { events } from "@/framework/events";
import { useEggStore } from "@/framework/eggStore";
import { EGG_COUNT, KONAMI, konamiStep } from "@/lib/eggs";
import { audio } from "@/framework/audio/audioManager";
import { Hud } from "./Hud";
import { Toaster } from "./Toaster";
import { Celebration } from "./Celebration";
import { TrophyHall } from "./TrophyHall";
import { ActivityListPanel } from "@/activities/ActivityListPanel";
import { PlayerShell } from "@/activities/PlayerShell";
import type { LevelActivity } from "@/framework/api/schemas";

type WorldPanel = "billboard" | "plaque";

export function CityScreen() {
  const nearVenueId = useWorldStore((s) => s.nearVenueId);
  const setInputLocked = useWorldStore((s) => s.setInputLocked);
  const [openVenue, setOpenVenue] = useState<CityBuilding | null>(null);
  const [playing, setPlaying] = useState<LevelActivity | null>(null);
  const [worldPanel, setWorldPanel] = useState<WorldPanel | null>(null);
  const [worldReady, setWorldReady] = useState(false);
  const [loadPct, setLoadPct] = useState(0);
  const konamiRef = useRef(0);

  const nearVenue = nearVenueId ? (VENUES.find((v) => v.id === nearVenueId) ?? null) : null;
  const panelOpen = openVenue !== null || playing !== null || worldPanel !== null;

  const enterVenue = useCallback((v: CityBuilding) => {
    audio.play("ui_open");
    setOpenVenue(v);
    events.emit("venue_opened", v.id); // the world pops the building in response
  }, []);

  useEffect(() => {
    setInputLocked(panelOpen);
  }, [panelOpen, setInputLocked]);

  // World-side prop clicks (billboard headlines, founders' plaque) open DOM panels.
  useEffect(() => events.on("world_interact", ({ kind }) => setWorldPanel(kind)), []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // The code. Tracked only while roaming the streets — some codes never die.
      if (!panelOpen) {
        konamiRef.current = konamiStep(konamiRef.current, e.key.toLowerCase());
        if (konamiRef.current === KONAMI.length) {
          konamiRef.current = 0;
          useEggStore.getState().markFound("konami");
          events.emit("konami", null); // the world throws the block party
        }
      }
      if (e.key === "Escape") {
        if (playing) setPlaying(null);
        else if (openVenue) setOpenVenue(null);
        else if (worldPanel) setWorldPanel(null);
        return;
      }
      if ((e.key === "e" || e.key === "E" || e.key === "Enter") && !panelOpen && nearVenue) {
        enterVenue(nearVenue);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [nearVenue, panelOpen, openVenue, playing, worldPanel, enterVenue]);

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-ink">
      <CityCanvas onReady={() => setWorldReady(true)} onProgress={setLoadPct} />
      {!worldReady && <CityLoader pct={loadPct} />}
      <Hud />
      <Toaster />
      <Celebration />
      <ControlsHint />

      {nearVenue && !panelOpen && (
        <div className="pointer-events-none absolute bottom-10 left-1/2 z-10 -translate-x-1/2 animate-slide-up">
          <button
            onClick={() => enterVenue(nearVenue)}
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
      {openVenue && !playing && openVenue.kind === "trophy" && (
        <TrophyHall onClose={() => setOpenVenue(null)} />
      )}
      {openVenue && !playing && openVenue.kind !== "competency" && openVenue.kind !== "trophy" && (
        <InfoPanel venue={openVenue} onClose={() => setOpenVenue(null)} />
      )}

      {playing && openVenue && (
        <PlayerShell
          activity={playing}
          venueName={openVenue.displayName}
          onClose={() => setPlaying(null)}
        />
      )}

      {worldPanel === "billboard" && <BillboardPanel onClose={() => setWorldPanel(null)} />}
      {worldPanel === "plaque" && <FoundersPanel onClose={() => setWorldPanel(null)} />}
    </div>
  );
}

/** Boot screen with real asset-load progress (PRD §12.3 asks for it, and the
 * splash otherwise sits blank through the whole load). */
function CityLoader({ pct }: { pct: number }) {
  const shown = Math.round(Math.min(1, Math.max(0, pct)) * 100);
  return (
    <div className="absolute inset-0 z-20 grid place-items-center bg-ink">
      <div className="w-[min(20rem,80vw)] text-center">
        <h1 className="font-display text-3xl font-semibold tracking-wide text-gold">THE CITY</h1>
        <p className="mt-2 text-sm text-muted">
          {shown < 100 ? "Laying out the streets…" : "Opening the gates…"}
        </p>
        <div
          className="mt-5 h-1.5 w-full overflow-hidden rounded-full bg-surface-2"
          role="progressbar"
          aria-valuenow={shown}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Loading the city"
        >
          <div
            className="h-full rounded-full bg-gold transition-[width] duration-200 ease-out"
            style={{ width: `${shown}%` }}
          />
        </div>
        <p className="mt-2 text-xs tabular-nums text-muted">{shown}%</p>
      </div>
    </div>
  );
}

// City billboard headlines — half flavor, half genuinely useful training tips.
const CITY_TIPS = [
  "DOWNTOWN GAZETTE: Coin balances are server-verified. No funny business, ever.",
  "TRANSIT NOTICE: Crosswalks lead to venue doors. Follow the gold markers.",
  "MARKET WATCH: Needs before wants — the Bank's first lesson is free.",
  "CITY WIRE: Trophy Hall shelves polished daily. Bring badges.",
  "CLASSIFIEDS: Ice cream cart seeks apprentice who can price a scoop profitably.",
  "WEATHER: Clouds drifting northeast. The pigeons remain unbothered.",
  "TECH PARK BULLETIN: The rooftop pool is strictly for cooling servers. Sure.",
  "COMMUNITY: Try wishing at the civic fountain. Five wishes tell a story.",
];

function BillboardPanel({ onClose }: { onClose: () => void }) {
  const [idx, setIdx] = useState(() => Math.floor(Math.random() * CITY_TIPS.length));
  return (
    <div
      className="absolute inset-0 z-20 grid animate-fade-in place-items-center bg-ink/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md animate-pop-in rounded-2xl border border-line bg-surface p-6 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-xs uppercase tracking-widest text-muted">City Billboard</p>
        <h2 className="mt-2 font-display text-xl font-semibold text-gold">Today's headline</h2>
        <p className="mt-4 min-h-[3.5rem] text-sm text-text">{CITY_TIPS[idx]}</p>
        <div className="mt-5 flex justify-center gap-2">
          <button
            onClick={() => setIdx((i) => (i + 1) % CITY_TIPS.length)}
            className="rounded-lg border border-line bg-surface-2 px-4 py-2 text-sm text-text hover:brightness-110"
          >
            Next headline
          </button>
          <button
            onClick={onClose}
            className="rounded-lg bg-gold px-4 py-2 text-sm font-medium text-ink hover:brightness-110"
          >
            Back to the street
          </button>
        </div>
      </div>
    </div>
  );
}

function FoundersPanel({ onClose }: { onClose: () => void }) {
  const found = useEggStore((s) => s.found);
  return (
    <div
      className="absolute inset-0 z-20 grid animate-fade-in place-items-center bg-ink/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md animate-pop-in rounded-2xl border border-gold/40 bg-surface p-6 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-xs uppercase tracking-widest text-muted">Founders' Plaque</p>
        <h2 className="mt-2 font-display text-2xl font-semibold text-gold">THE CITY — EST. 2026</h2>
        <p className="mt-4 text-sm text-muted">
          Raised brick by brick for the WarRoom Academy, so learning a competency feels like walking
          into a building, not opening a form.
        </p>
        <p className="mt-3 text-xs text-muted">
          Sprite art from the wonderful CC0 isometric packs by Kenney (kenney.nl) — thank you.
        </p>
        <p className="mt-4 text-xs text-gold/80">
          Secrets discovered: {found.length}/{EGG_COUNT} — keep exploring.
        </p>
        <button
          onClick={onClose}
          className="mt-5 rounded-lg bg-gold px-5 py-2 font-medium text-ink hover:brightness-110"
        >
          Tip your hat
        </button>
      </div>
    </div>
  );
}

function InfoPanel({ venue, onClose }: { venue: CityBuilding; onClose: () => void }) {
  const copy: Record<string, { title: string; body: string }> = {
    shop: {
      title: "The Shop",
      body: "Racks of hats, jackets and questionable sunglasses for your future self. The till opens once the economy endpoints land — window shopping is free.",
    },
    trophy: {
      title: "Trophy Hall",
      body: "Your earned badges will stand on these shelves. Coming in a later phase.",
    },
    locked: {
      title: "Custom venue",
      body: "Paper over the windows, permits on the door. A client-configurable venue — ships disabled until a client is set up.",
    },
    cafe: {
      title: "Café",
      body: "Steam on the espresso machine, jazz on low. The barista is still training — activities for this venue plug in whenever they're ready. Smell the coffee on your way past.",
    },
  };
  const c = copy[venue.kind] ?? { title: venue.displayName, body: "Coming soon." };
  return (
    <div
      className="absolute inset-0 z-20 grid animate-fade-in place-items-center bg-ink/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md animate-pop-in rounded-2xl border border-line bg-surface p-6 text-center"
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
