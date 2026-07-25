// Celebration overlay — CSS confetti + badge card, subscribed to the event
// bus's badge_awarded / activity_completed channels (previously emit-only).
// Values shown are always the server's; this layer only adds the sparkle.
import { useEffect, useState } from "react";
import { events } from "@/framework/events";
import type { Badge } from "@/framework/api/schemas";
import { prefersReducedMotion } from "@/lib/motion";

interface Burst {
  id: number;
  badge: Badge | null;
  pieces: Array<{ left: number; delay: number; duration: number; color: string; size: number }>;
}

const PIECE_COLORS = [
  "rgb(226 190 120)",
  "rgb(90 200 140)",
  "rgb(90 150 230)",
  "rgb(240 200 90)",
  "rgb(230 110 110)",
  "rgb(217 135 181)",
];

let nextBurstId = 1;

function makePieces(): Burst["pieces"] {
  if (prefersReducedMotion()) return [];
  return Array.from({ length: 36 }, (_, i) => ({
    left: Math.random() * 100,
    delay: Math.random() * 0.35,
    duration: 1.6 + Math.random() * 1.1,
    color: PIECE_COLORS[i % PIECE_COLORS.length],
    size: 5 + Math.random() * 5,
  }));
}

export function Celebration() {
  const [burst, setBurst] = useState<Burst | null>(null);

  useEffect(() => {
    let timeout = 0;
    const trigger = (badge: Badge | null) => {
      const id = nextBurstId++;
      setBurst({ id, badge, pieces: makePieces() });
      window.clearTimeout(timeout);
      // Outlive the longest piece (max delay 0.35s + max duration 2.7s) so
      // confetti lands instead of being unmounted mid-fall.
      timeout = window.setTimeout(() => setBurst((cur) => (cur?.id === id ? null : cur)), 3200);
    };
    const offBadge = events.on("badge_awarded", (b) => trigger(b));
    const offDone = events.on("activity_completed", (r) => {
      if (r.passed && (!r.badgesAwarded || r.badgesAwarded.length === 0)) trigger(null);
    });
    return () => {
      offBadge();
      offDone();
      window.clearTimeout(timeout);
    };
  }, []);

  if (!burst) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-40 overflow-hidden">
      {burst.pieces.map((p, i) => (
        <span
          key={`${burst.id}-${i}`}
          className="absolute top-0 rounded-[2px]"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size * 0.55,
            backgroundColor: p.color,
            animation: `confetti-fall ${p.duration}s ease-in ${p.delay}s forwards`,
            opacity: 0,
          }}
        />
      ))}
      {burst.badge && (
        <div className="absolute left-1/2 top-1/3 -translate-x-1/2 animate-pop-in">
          <div className="rounded-2xl border border-gold/60 bg-surface/95 px-6 py-4 text-center shadow-2xl backdrop-blur">
            <div className="text-3xl">🏅</div>
            <p className="mt-1 font-display text-lg font-semibold text-gold">{burst.badge.name}</p>
            <p className="text-xs text-muted">New badge earned</p>
          </div>
        </div>
      )}
    </div>
  );
}
