import { useState } from "react";
import type { InteriorProps } from "@/framework/building/manifest";
import type { LevelActivity } from "@/framework/api/schemas";
import { PlayerShell } from "@/activities/PlayerShell";
import { CAFE_ACTIVITY_IDS } from "@/activities/content/cafe";

// Café interior (PRD_Cafe_Interior.md §5): an explorable room, not a flat activity
// list. Four hotspots, each a physical thing in the café; picking one reveals
// "who you'd talk to" (a competency), then a level, then the scene itself plays
// through the framework's own PlayerShell + DecisionTreeRenderer — the building
// consumes the player shell, it never reimplements it (PRD §7.3).
const COMPETENCY_NAME: Record<string, string> = {
  C1: "Problem Sensing",
  C2: "Learning Agility",
  C3: "Courage to Commit",
  C4: "Financial Discipline",
  C5: "Strategic Thinking",
  C6: "Power & Influence",
  C7: "People Management",
  C8: "Value Creation & Credibility",
  C9: "Perseverance & Adaptability",
};

interface Hotspot {
  id: string;
  label: string;
  icon: string;
  hook: string;
  competencies: string[];
}

const HOTSPOTS: Hotspot[] = [
  {
    id: "corkboard",
    label: "Corkboard",
    icon: "📌",
    hook: "A regular's been asking about oat milk, and that new drink isn't moving like you hoped.",
    competencies: ["C1", "C2", "C9"],
  },
  {
    id: "register",
    label: "Register",
    icon: "🧾",
    hook: "The till's telling its own story about this month — and about the app fees.",
    competencies: ["C4", "C5"],
  },
  {
    id: "crate",
    label: "Supplier crate",
    icon: "📦",
    hook: "A delivery just came with more than groceries — a food truck and a bulk deal both want an answer.",
    competencies: ["C3", "C6"],
  },
  {
    id: "staff",
    label: "Staff board",
    icon: "🧑‍🍳",
    hook: "Someone's schedule — and someone's standards — need your attention today.",
    competencies: ["C7", "C8"],
  },
];

export default function CafeInterior({ onExit }: InteriorProps) {
  const [hotspot, setHotspot] = useState<Hotspot | null>(null);
  const [competency, setCompetency] = useState<string | null>(null);
  const [playing, setPlaying] = useState<LevelActivity | null>(null);

  function play(code: string, levelKey: "A" | "B") {
    setPlaying({
      id: CAFE_ACTIVITY_IDS[code][levelKey],
      competencyCode: code,
      level: levelKey === "A" ? "BEGINNER" : "INTERMEDIATE",
      activityType: "DECISION_TREE",
      title: `${COMPETENCY_NAME[code]} — Level ${levelKey}`,
      status: "NOT_STARTED",
    });
  }

  return (
    <div
      className="absolute inset-0 z-20 grid place-items-center bg-ink/70 p-4 backdrop-blur-sm"
      onClick={onExit}
    >
      <div
        className="w-full max-w-xl rounded-2xl border border-line bg-surface p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl font-semibold text-gold">The Café</h2>
          <button
            onClick={onExit}
            className="text-muted hover:text-text"
            aria-label="Leave the café"
          >
            ✕
          </button>
        </div>

        {!hotspot && (
          <>
            <p className="mt-1 text-xs text-muted">
              Four staff, a loyal set of regulars, a tight budget — and it's yours to run. Look
              around.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              {HOTSPOTS.map((h) => (
                <button
                  key={h.id}
                  type="button"
                  onClick={() => setHotspot(h)}
                  className="rounded-xl border border-line bg-surface-2 p-4 text-left transition hover:border-gold/60 hover:bg-gold/5"
                >
                  <div className="text-2xl">{h.icon}</div>
                  <p className="mt-2 font-medium text-text">{h.label}</p>
                  <p className="mt-1 text-xs text-muted">{h.hook}</p>
                </button>
              ))}
            </div>
          </>
        )}

        {hotspot && !competency && (
          <div className="mt-5">
            <button onClick={() => setHotspot(null)} className="text-xs text-muted hover:text-text">
              ← back to the room
            </button>
            <p className="mt-3 text-sm leading-relaxed text-text">{hotspot.hook}</p>
            <div className="mt-4 space-y-2">
              {hotspot.competencies.map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => setCompetency(code)}
                  className="flex w-full items-center justify-between rounded-lg border border-line bg-surface-2 px-4 py-2.5 text-left text-sm text-text transition hover:border-gold/60 hover:bg-gold/5"
                >
                  <span>{COMPETENCY_NAME[code]}</span>
                  <span className="text-xs text-muted">{code}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {hotspot && competency && (
          <div className="mt-5">
            <button
              onClick={() => setCompetency(null)}
              className="text-xs text-muted hover:text-text"
            >
              ← back
            </button>
            <p className="mt-3 text-sm text-text">
              {COMPETENCY_NAME[competency]} — pick who you're talking to today.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <button
                onClick={() => play(competency, "A")}
                className="rounded-lg bg-gold px-4 py-2 text-sm font-medium text-ink hover:brightness-110"
              >
                Level A
              </button>
              <button
                onClick={() => play(competency, "B")}
                className="rounded-lg border border-gold/60 px-4 py-2 text-sm font-medium text-gold hover:bg-gold/10"
              >
                Level B
              </button>
            </div>
          </div>
        )}
      </div>

      {playing && (
        <PlayerShell activity={playing} venueName="Café" onClose={() => setPlaying(null)} />
      )}
    </div>
  );
}
