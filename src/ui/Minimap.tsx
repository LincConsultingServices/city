// The city map. While you walk it is a small round window in the bottom-left
// corner showing the few blocks around you, centred on you and sliding with you;
// a marker beyond its edge shows as an arrow on the rim. Click it and the whole
// city opens large, where a click marks somewhere to go.
//
// Drawn at the same isometric angle as the street, so "up and to the right" on
// the map is up and to the right on screen — a top-down map would rotate the
// city 45° and make every direction a puzzle. Drawn with Canvas 2D rather than
// Pixi: it is a DOM panel like the rest of the HUD, and the city's renderer is
// busy enough.
//
// The static city (ground, roads, buildings) is baked once per size; only you,
// your marker and the route are redrawn, and only when one of them moves.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Cell } from "@/lib/pathfinding";
import {
  FILLERS,
  GRID_H,
  GRID_W,
  PROPS,
  VENUES,
  districtAt,
  isParkBlock,
  isRoad,
  BLOCK,
  type District,
} from "@/world/cityMap";
import { useWorldStore } from "@/world/worldStore";
import { destinationAt, isPlace, placesToGo, routeTo, type Destination } from "@/world/navigation";
import { audio } from "@/framework/audio/audioManager";

const SPAN = GRID_W + GRID_H;

const COLORS = {
  void: "#151a24",
  road: "#5b6270",
  roadLine: "#7a8190",
  park: "#8fb978",
  tree: "#5e8f4f",
  filler: "#8a8173",
  fillerTop: "#a39a8b",
  venue: "#e2be78",
  venueEdge: "#8a6a2a",
  you: "#3d78d8",
  mark: "#ffc65c",
  ink: "#1d1a14",
} as const;

/** A soft ground colour per district, so the quarters read apart at a glance. */
const GROUND: Record<District, string> = {
  downtown: "#cbc3b4",
  market: "#d6c7a6",
  campus: "#b9caa0",
  tech: "#bcc6cf",
  industrial: "#bdb5a8",
  civic: "#c3cfae",
};

// ── Projection ───────────────────────────────────────────────────────────────

/** Cell centre in canvas pixels, for a map `width` px wide. */
function project(x: number, y: number, s: number): { px: number; py: number } {
  return { px: (x - y + GRID_H) * s, py: (x + y + 1) * (s / 2) };
}

/** The inverse: which cell a canvas point is over. */
function unproject(px: number, py: number, s: number): Cell {
  const u = px / s - GRID_H;
  const v = (2 * py) / s - 1;
  return { x: Math.round((u + v) / 2), y: Math.round((v - u) / 2) };
}

function diamond(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, k = 1): void {
  const { px, py } = project(x, y, s);
  ctx.beginPath();
  ctx.moveTo(px, py - (s / 2) * k);
  ctx.lineTo(px + s * k, py);
  ctx.lineTo(px, py + (s / 2) * k);
  ctx.lineTo(px - s * k, py);
  ctx.closePath();
}

const blockedBy = (() => {
  const filler = new Set(FILLERS.flatMap((f) => f.footprintTiles.map((t) => `${t.x},${t.y}`)));
  const venue = new Map<string, (typeof VENUES)[number]>();
  for (const v of VENUES) for (const t of v.footprintTiles) venue.set(`${t.x},${t.y}`, v);
  const tree = new Set(
    PROPS.filter((p) => p.blocking && /tree|conifer/.test(p.kind)).map(
      (p) => `${p.cell.x},${p.cell.y}`,
    ),
  );
  return { filler, venue, tree };
})();

/** The city without anyone in it. Baked once per size. */
function bakeCity(width: number, dpr: number, labels: boolean): HTMLCanvasElement {
  const s = width / SPAN;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round((width / 2) * dpr);
  const ctx = canvas.getContext("2d")!;
  ctx.scale(dpr, dpr);

  for (let y = 0; y < GRID_H; y++) {
    for (let x = 0; x < GRID_W; x++) {
      const key = `${x},${y}`;
      const park =
        isParkBlock(Math.floor((x - 1) / BLOCK), Math.floor((y - 1) / BLOCK)) && !isRoad(x, y);
      ctx.fillStyle = isRoad(x, y) ? COLORS.road : park ? COLORS.park : GROUND[districtAt(x, y)];
      diamond(ctx, x, y, s, 1.04);
      ctx.fill();
      if (blockedBy.filler.has(key)) {
        ctx.fillStyle = COLORS.filler;
        diamond(ctx, x, y, s, 0.96);
        ctx.fill();
      } else if (blockedBy.tree.has(key)) {
        ctx.fillStyle = COLORS.tree;
        const { px, py } = project(x, y, s);
        ctx.beginPath();
        ctx.arc(px, py, s * 0.35, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // Venues on top, gold, with an edge so they stand off the blocks around them.
  for (const v of VENUES) {
    for (const t of v.footprintTiles) {
      ctx.fillStyle = isPlace(v) ? COLORS.venue : COLORS.fillerTop;
      diamond(ctx, t.x, t.y, s, 0.98);
      ctx.fill();
    }
    if (isPlace(v)) {
      ctx.fillStyle = COLORS.venueEdge;
      diamond(ctx, v.entranceTile.x, v.entranceTile.y, s, 0.45);
      ctx.fill();
    }
  }

  if (labels) {
    ctx.font = `600 ${Math.max(10, Math.round(s * 1.15))}px Outfit, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (const v of VENUES) {
      if (!isPlace(v)) continue;
      const cx = v.footprintTiles.reduce((a, t) => a + t.x, 0) / v.footprintTiles.length;
      const cy = v.footprintTiles.reduce((a, t) => a + t.y, 0) / v.footprintTiles.length;
      const { px, py } = project(cx, cy, s);
      const text = v.displayName;
      const w = ctx.measureText(text).width + 10;
      const h = Math.max(14, s * 1.6);
      ctx.fillStyle = "rgba(21,26,36,0.82)";
      ctx.beginPath();
      ctx.roundRect(px - w / 2, py - s * 1.6 - h / 2, w, h, 4);
      ctx.fill();
      ctx.fillStyle = "#f3eadb";
      ctx.fillText(text, px, py - s * 1.6);
    }
  }
  return canvas;
}

/** You, your marker, and the route between. Redrawn when any of them moves. */
function drawLive(
  ctx: CanvasRenderingContext2D,
  city: HTMLCanvasElement,
  width: number,
  dpr: number,
  you: Cell,
  dest: Destination | null,
  route: readonly Cell[],
  hover: Destination | null,
): void {
  const s = width / SPAN;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.drawImage(city, 0, 0);
  ctx.scale(dpr, dpr);

  drawRoute(ctx, route, s);

  if (hover && (!dest || hover.cell.x !== dest.cell.x || hover.cell.y !== dest.cell.y)) {
    const { px, py } = project(hover.cell.x, hover.cell.y, s);
    ctx.strokeStyle = "rgba(255,198,92,0.7)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(px, py, s * 1.2, s * 0.6, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  if (dest) {
    const { px, py } = project(dest.cell.x, dest.cell.y, s);
    drawPin(ctx, px, py, Math.max(4, s * 0.9));
  }

  const { px, py } = project(you.x, you.y, s);
  drawYou(ctx, px, py, Math.max(3.5, s * 0.75));
}

function drawRoute(ctx: CanvasRenderingContext2D, route: readonly Cell[], s: number): void {
  if (route.length < 2) return;
  ctx.strokeStyle = COLORS.mark;
  ctx.lineWidth = Math.max(1.5, s * 0.35);
  ctx.setLineDash([s * 0.9, s * 0.7]);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.beginPath();
  route.forEach((c, i) => {
    const { px, py } = project(c.x, c.y, s);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  });
  ctx.stroke();
  ctx.setLineDash([]);
}

/** The marker: a gold drop-pin standing on its spot. */
function drawPin(ctx: CanvasRenderingContext2D, px: number, py: number, r: number): void {
  ctx.fillStyle = COLORS.mark;
  ctx.strokeStyle = COLORS.ink;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(px, py);
  ctx.lineTo(px - r * 0.8, py - r * 1.4);
  ctx.arc(px, py - r * 1.7, r * 0.85, Math.PI * 0.8, Math.PI * 0.2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

/** You: a blue dot in a white ring. */
function drawYou(ctx: CanvasRenderingContext2D, px: number, py: number, r: number): void {
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(px, py, r + 1.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COLORS.you;
  ctx.beginPath();
  ctx.arc(px, py, r, 0, Math.PI * 2);
  ctx.fill();
}

// ── The round minimap ────────────────────────────────────────────────────────

/** Diameter of the round minimap, in CSS pixels. */
const RADAR_D = 148;
/**
 * Half a tile's width on the round minimap. Large enough that streets and
 * buildings read as streets and buildings: the circle shows the few blocks
 * around you, not the whole city.
 */
const RADAR_S = 9;

/**
 * The round minimap: the city around you, centred on you. `center` is your
 * position in map pixels (eased by the caller so the map glides rather than
 * jumping a cell at a time).
 */
function drawRadar(
  ctx: CanvasRenderingContext2D,
  city: HTMLCanvasElement,
  dpr: number,
  center: { px: number; py: number },
  dest: Destination | null,
  route: readonly Cell[],
): void {
  const R = RADAR_D / 2;
  const s = RADAR_S;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.scale(dpr, dpr);

  ctx.save();
  ctx.beginPath();
  ctx.arc(R, R, R, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = COLORS.void;
  ctx.fillRect(0, 0, RADAR_D, RADAR_D);

  // The city, slid so you sit in the middle.
  const ox = R - center.px;
  const oy = R - center.py;
  ctx.drawImage(city, ox, oy, city.width / dpr, city.height / dpr);

  ctx.translate(ox, oy);
  drawRoute(ctx, route, s);
  let off: { x: number; y: number } | null = null;
  if (dest) {
    const { px, py } = project(dest.cell.x, dest.cell.y, s);
    const dx = px - center.px;
    const dy = py - center.py;
    if (Math.hypot(dx, dy) < R - 12) drawPin(ctx, px, py, 6);
    else off = { x: dx, y: dy };
  }
  ctx.translate(-ox, -oy);

  // Soften the rim, so the map fades into its frame rather than being cut off.
  const fade = ctx.createRadialGradient(R, R, R * 0.62, R, R, R);
  fade.addColorStop(0, "rgba(21,26,36,0)");
  fade.addColorStop(1, "rgba(21,26,36,0.55)");
  ctx.fillStyle = fade;
  ctx.fillRect(0, 0, RADAR_D, RADAR_D);
  ctx.restore();

  // A marker beyond the edge: a gold arrow on the rim, pointing at it.
  if (off) {
    const a = Math.atan2(off.y, off.x);
    const rr = R - 9;
    ctx.save();
    ctx.translate(R + Math.cos(a) * rr, R + Math.sin(a) * rr);
    ctx.rotate(a);
    ctx.fillStyle = COLORS.mark;
    ctx.strokeStyle = COLORS.ink;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(6, 0);
    ctx.lineTo(-5, -5);
    ctx.lineTo(-2.5, 0);
    ctx.lineTo(-5, 5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  drawYou(ctx, R, R, 4.5);
}

/** The round minimap's canvas, easing toward you as you walk. */
function RadarCanvas({
  you,
  dest,
  route,
}: {
  you: Cell;
  dest: Destination | null;
  route: readonly Cell[];
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const dpr = typeof window === "undefined" ? 1 : Math.min(2, window.devicePixelRatio || 1);
  const city = useMemo(() => bakeCity(SPAN * RADAR_S, dpr, false), [dpr]);
  const shown = useRef<{ px: number; py: number } | null>(null);
  const live = useRef({ dest, route });
  live.current = { dest, route };

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    canvas.width = Math.round(RADAR_D * dpr);
    canvas.height = Math.round(RADAR_D * dpr);

    const target = project(you.x, you.y, RADAR_S);
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    if (!shown.current || reduced) shown.current = { ...target };

    // Glide to the new cell over a few frames, then stop: nothing redraws
    // while you are standing still.
    let raf = 0;
    const step = () => {
      const c = shown.current!;
      c.px += (target.px - c.px) * 0.18;
      c.py += (target.py - c.py) * 0.18;
      const done = Math.abs(target.px - c.px) < 0.3 && Math.abs(target.py - c.py) < 0.3;
      if (done) Object.assign(c, target);
      drawRadar(ctx, city, dpr, c, live.current.dest, live.current.route);
      if (!done) raf = requestAnimationFrame(step);
    };
    step();
    return () => cancelAnimationFrame(raf);
  }, [city, dpr, you, dest, route]);

  return (
    <canvas ref={ref} className="block rounded-full" style={{ width: RADAR_D, height: RADAR_D }} />
  );
}

// ── The component ────────────────────────────────────────────────────────────

export function Minimap({
  open,
  showMini = true,
  onOpen,
  onClose,
}: {
  open: boolean;
  /** Options → Map → Minimap. Off hides the round map; the full map still opens. */
  showMini?: boolean;
  onOpen: () => void;
  onClose: () => void;
}) {
  const you = useWorldStore((s) => s.charCell);
  const dest = useWorldStore((s) => s.destination);
  const route = useMemo(() => (dest ? routeTo(you, dest) : []), [you, dest]);

  return (
    <>
      {!open && showMini && (
        <div className="pointer-events-none absolute bottom-4 left-4 z-10 flex flex-col items-center gap-1.5">
          <button
            onClick={() => {
              audio.play("ui_open");
              onOpen();
            }}
            className="group pointer-events-auto relative rounded-full border-2 border-line/80 bg-surface/80 p-[3px] shadow-xl backdrop-blur transition hover:border-gold/70"
            aria-label="Open the city map"
            title="Open the map (M)"
          >
            <RadarCanvas you={you} dest={dest} route={route} />
            {/* A thin gold inner rim, the HUD's accent, so the map has a frame. */}
            <span className="pointer-events-none absolute inset-[3px] rounded-full ring-1 ring-inset ring-gold/30" />
            <span className="pointer-events-none absolute -right-0.5 -top-0.5 rounded-full border border-line/70 bg-surface/95 px-1.5 py-0.5 text-[10px] text-muted transition group-hover:text-text">
              M
            </span>
          </button>
          {dest && (
            <span className="max-w-[11rem] truncate rounded-full border border-line/70 bg-surface/85 px-2.5 py-0.5 text-[11px] text-muted backdrop-blur">
              To <span className="text-gold">{dest.label}</span>
            </span>
          )}
        </div>
      )}
      {open && <MapPanel you={you} dest={dest} route={route} onClose={onClose} />}
    </>
  );
}

function MapPanel({
  you,
  dest,
  route,
  onClose,
}: {
  you: Cell;
  dest: Destination | null;
  route: readonly Cell[];
  onClose: () => void;
}) {
  const setDestination = useWorldStore((s) => s.setDestination);
  const requestWalk = useWorldStore((s) => s.requestWalk);
  const places = useMemo(() => placesToGo(), []);
  const [hover, setHover] = useState<Destination | null>(null);
  const frame = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(720);

  // Fit the map to the panel, keeping its 2:1 shape.
  useEffect(() => {
    const el = frame.current;
    if (!el) return;
    const fit = () => setWidth(Math.max(280, Math.floor(el.clientWidth)));
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const mark = useCallback(
    (d: Destination | null) => {
      if (!d) return;
      audio.play("ui_click");
      setDestination(d);
    },
    [setDestination],
  );

  const pick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return destinationAt(unproject(e.clientX - r.left, e.clientY - r.top, width / SPAN));
  };

  return (
    <div
      className="pointer-events-auto absolute inset-0 z-30 grid place-items-center bg-ink/70 p-4 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-label="City map"
        className="flex max-h-full w-[min(64rem,100%)] flex-col overflow-hidden rounded-2xl border border-line/70 bg-surface/95 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4 border-b border-line/60 px-5 py-3">
          <div>
            <h2 className="font-display text-lg font-semibold text-gold">City map</h2>
            <p className="text-xs text-muted">
              Click anywhere to mark where you want to go — the arrow at your feet will point the
              way.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full border border-line/70 px-3 py-1.5 text-xs text-muted hover:text-text"
          >
            Close <span className="ml-1 rounded bg-line/50 px-1.5 py-0.5 text-[10px]">Esc</span>
          </button>
        </div>

        <div className="min-h-0 overflow-auto p-4">
          <div ref={frame} className="w-full">
            <MapCanvas
              width={width}
              you={you}
              dest={dest}
              route={route}
              hover={hover}
              labels
              className="cursor-crosshair rounded-xl"
              onMouseMove={(e) => setHover(pick(e))}
              onMouseLeave={() => setHover(null)}
              onClick={(e) => mark(pick(e))}
            />
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
            <Legend color={COLORS.you} label="You" round />
            <Legend color={COLORS.mark} label="Your marker" round />
            <Legend color={COLORS.venue} label="Places you can go in" />
            <span className="ml-auto text-text/80">
              {hover ? (
                <>
                  Click to mark <span className="text-gold">{hover.label}</span>
                </>
              ) : dest ? (
                <>
                  Heading to <span className="text-gold">{dest.label}</span>
                </>
              ) : (
                "No marker set"
              )}
            </span>
          </div>

          <p className="mt-4 text-[11px] uppercase tracking-widest text-muted">Go to</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {places.map((p) => {
              const active = dest?.venueId === p.venueId;
              return (
                <button
                  key={p.venueId}
                  onClick={() => mark(p)}
                  aria-pressed={active}
                  className={`rounded-full border px-2.5 py-1 text-xs transition ${
                    active
                      ? "border-gold/70 bg-gold/15 text-gold"
                      : "border-line/70 bg-surface-2/60 text-muted hover:border-gold/60 hover:text-text"
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line/60 px-5 py-3">
          {dest && (
            <button
              onClick={() => {
                audio.play("ui_close");
                setDestination(null);
              }}
              className="rounded-lg border border-line/70 px-4 py-2 text-sm text-muted hover:text-text"
            >
              Clear marker
            </button>
          )}
          <button
            disabled={!dest}
            onClick={() => {
              requestWalk(true);
              onClose();
            }}
            className="rounded-lg bg-gold px-5 py-2 text-sm font-medium text-ink transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Walk me there
          </button>
        </div>
      </div>
    </div>
  );
}

function Legend({ color, label, round }: { color: string; label: string; round?: boolean }) {
  return (
    <span className="flex items-center gap-1.5">
      <span
        className={`inline-block h-2.5 w-2.5 ${round ? "rounded-full" : "rotate-45 rounded-[2px]"}`}
        style={{ background: color }}
      />
      {label}
    </span>
  );
}

function MapCanvas({
  width,
  you,
  dest,
  route,
  hover = null,
  labels = false,
  className = "",
  onMouseMove,
  onMouseLeave,
  onClick,
}: {
  width: number;
  you: Cell;
  dest: Destination | null;
  route: readonly Cell[];
  hover?: Destination | null;
  labels?: boolean;
  className?: string;
  onMouseMove?: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  onMouseLeave?: () => void;
  onClick?: (e: React.MouseEvent<HTMLCanvasElement>) => void;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const dpr = typeof window === "undefined" ? 1 : Math.min(2, window.devicePixelRatio || 1);
  const city = useMemo(() => bakeCity(width, dpr, labels), [width, dpr, labels]);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    canvas.width = city.width;
    canvas.height = city.height;
    drawLive(ctx, city, width, dpr, you, dest, route, hover);
  }, [city, width, dpr, you, dest, route, hover]);

  return (
    <canvas
      ref={ref}
      className={`block ${className}`}
      style={{ width, height: width / 2, background: COLORS.void }}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
    />
  );
}
