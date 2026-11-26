// The bank's own map — the indoor equivalent of the city's minimap.
//
// Inside a building the city map is the wrong map: you are looking for the
// loans desk, not for Market Street. So the corner shows the bank's floor plan,
// drawn in the same isometric diamond the room is, with you and the staff on
// it; click it (or press M) and it opens full size, with every place named, and
// clicking a place walks you there.
//
// Drawn from room.ts, the single source of layout truth, so a desk that moves
// moves on the map too.
import { useMemo, useState } from "react";
import type { Cell } from "@/lib/pathfinding";
import { Modal } from "@/ui/Modal";
import { audio } from "@/framework/audio/audioManager";
import { FURNITURE, ROOM_H, ROOM_W, STATIONS, isBackOffice, stationById, type PropKind } from "./room";
import { STAFF } from "./cast";
import { travelTo, useRoomStore } from "./roomStore";

/** Half a cell's width on the map, in SVG units. */
const K = 10;

const project = (c: Cell) => ({ x: (c.x - c.y) * K, y: ((c.x + c.y) * K) / 2 });

const diamond = (c: Cell, inset = 0) => {
  const { x, y } = project(c);
  const k = K - inset;
  return `${x},${y - k / 2} ${x + k},${y} ${x},${y + k / 2} ${x - k},${y}`;
};

const VIEW = (() => {
  const minX = -(ROOM_H - 1) * K - K;
  const maxX = (ROOM_W - 1) * K + K;
  const minY = -K / 2;
  const maxY = ((ROOM_W + ROOM_H - 2) * K) / 2 + K / 2;
  return { minX, minY, w: maxX - minX, h: maxY - minY };
})();

const FLOOR = { hall: "#d9d1c3", office: "#3a4a6e", back: "#8a6a4a" };

/** What colour a piece of furniture is on the map — grouped, not one per kind. */
function propColour(kind: PropKind): string {
  switch (kind) {
    case "wall":
    case "wall_clock":
    case "wall_logo":
    case "wall_vault":
      return "#4b4f5a";
    case "shopfront":
    case "glass":
    case "wall_sill":
      return "#7ea3b5";
    case "door":
    case "glass_door":
      return "#c9a24a";
    case "atm":
    case "passbook_printer":
    case "token_machine":
    case "drop_box":
    case "rates_board":
      return "#2c4a8a";
    case "bench":
      return "#34497a";
    case "plant":
      return "#3f7a4a";
    default:
      return "#6b4528";
  }
}

/** The places worth a name on the map, in the order the list shows them. */
const MAP_PLACES = [
  "st_welcome",
  "st_token",
  "st_accounts",
  "st_window1",
  "st_window2",
  "st_savings",
  "st_loans",
  "st_manager",
  "st_atm",
  "st_printer",
  "st_rates",
  "st_leaflets",
  "st_forms",
  "st_waiting",
];

function Plan({
  highlight,
  onPick,
  next,
}: {
  highlight?: string | null;
  onPick?: (id: string) => void;
  /** Where the first visit is heading: a gold ring that pulses on the plan. */
  next?: string | null;
}) {
  const charCell = useRoomStore((s) => s.charCell);

  const floor = useMemo(() => {
    const out: { key: string; points: string; fill: string }[] = [];
    for (let y = 0; y < ROOM_H; y++) {
      for (let x = 0; x < ROOM_W; x++) {
        const fill = x <= 4 && y <= 4 ? FLOOR.office : isBackOffice({ x, y }) ? FLOOR.back : FLOOR.hall;
        out.push({ key: `${x},${y}`, points: diamond({ x, y }), fill });
      }
    }
    return out;
  }, []);

  const props = useMemo(
    () =>
      FURNITURE.map((p) => ({
        key: `${p.kind}${p.cell.x},${p.cell.y}`,
        points: diamond(p.cell, p.kind === "plant" || p.kind === "bench" ? 3 : 1),
        fill: propColour(p.kind),
      })),
    [],
  );

  const me = project(charCell);

  return (
    <svg
      viewBox={`${VIEW.minX} ${VIEW.minY} ${VIEW.w} ${VIEW.h}`}
      className="h-full w-full"
      role="img"
      aria-label="Floor plan of Meridian Bank"
    >
      {floor.map((f) => (
        <polygon key={f.key} points={f.points} fill={f.fill} stroke="#00000022" strokeWidth={0.4} />
      ))}
      {props.map((p) => (
        <polygon key={p.key} points={p.points} fill={p.fill} />
      ))}

      {/* The staff, at their posts. */}
      {STAFF.map((m) => {
        const p = project(m.anchor);
        return <circle key={m.id} cx={p.x} cy={p.y} r={2.6} fill="#1f2d4d" stroke="#e5c77a" strokeWidth={0.8} />;
      })}

      {/* The places, as pins — named in the list beside the big map. */}
      {onPick &&
        MAP_PLACES.map((id) => {
          const s = stationById(id);
          if (!s) return null;
          const p = project(s.cell);
          const on = highlight === id;
          return (
            <g
              key={id}
              className="cursor-pointer"
              onClick={() => onPick(id)}
              role="button"
              aria-label={`Walk to ${s.label}`}
            >
              <circle cx={p.x} cy={p.y} r={on ? 5 : 3.4} fill={on ? "#c9a24a" : "#ffffffcc"} stroke="#1f2d4d" strokeWidth={0.8} />
              {on && (
                <text
                  x={p.x}
                  y={p.y - 8}
                  textAnchor="middle"
                  fontSize={7}
                  fontWeight={600}
                  fill="#f4efe4"
                  stroke="#0b0e14"
                  strokeWidth={2}
                  paintOrder="stroke"
                >
                  {s.label}
                </text>
              )}
            </g>
          );
        })}

      {/* Where to go next, while there is a next. */}
      {next &&
        (() => {
          const s = stationById(next);
          if (!s) return null;
          const p = project(s.cell);
          return (
            <circle cx={p.x} cy={p.y} r={6} fill="none" stroke="#ffc65c" strokeWidth={1.6}>
              <animate attributeName="r" values="5;10;5" dur="1.6s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="1;0.3;1" dur="1.6s" repeatCount="indefinite" />
            </circle>
          );
        })()}

      {/* You. */}
      <circle cx={me.x} cy={me.y} r={6} fill="#c9a24a" opacity={0.3}>
        <animate attributeName="r" values="4;8;4" dur="2s" repeatCount="indefinite" />
      </circle>
      <circle cx={me.x} cy={me.y} r={3.6} fill="#ffc65c" stroke="#0b0e14" strokeWidth={1} />
    </svg>
  );
}

/** The small plan in the corner. Click it to open the full map. */
export function BankMinimap({ onOpen, highlight }: { onOpen: () => void; highlight?: string | null }) {
  return (
    <button
      onClick={onOpen}
      aria-label="Open the bank map"
      className="pointer-events-auto absolute bottom-4 left-4 z-10 rounded-2xl border border-line/70 bg-surface/85 p-2 shadow-lg backdrop-blur transition hover:border-gold/60"
    >
      <div className="h-[118px] w-[190px]">
        <Plan next={highlight} />
      </div>
      <p className="mt-1 text-center text-[10px] uppercase tracking-widest text-muted">
        Bank map <span className="ml-1 rounded bg-line/50 px-1 py-0.5 text-[10px]">M</span>
      </p>
    </button>
  );
}

/** The full map: the plan, and every place named. Picking one walks you there. */
export function BankMapPanel({ onClose }: { onClose: () => void }) {
  const [hover, setHover] = useState<string | null>(null);
  const go = (id: string) => {
    audio.play("ui_click");
    onClose();
    // The room is locked while the map is up. It is closed now, so unlock it
    // here rather than waiting for the shell's effect to catch up.
    useRoomStore.getState().setInputLocked(false);
    travelTo(id);
  };

  return (
    <Modal onClose={onClose} width="lg">
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-xl font-semibold text-gold">Meridian Bank</h2>
        <span className="text-xs text-muted">Click a place to walk there · Esc to close</span>
      </div>
      <div className="mt-4 flex flex-col gap-4 sm:flex-row">
        <div className="aspect-[16/10] min-w-0 flex-1 rounded-xl border border-line/60 bg-[#0b0e14] p-2">
          <Plan highlight={hover} onPick={go} />
        </div>
        <ul className="grid grid-cols-2 gap-1 sm:w-52 sm:grid-cols-1">
          {MAP_PLACES.map((id) => {
            const s = STATIONS.find((st) => st.id === id);
            if (!s) return null;
            return (
              <li key={id}>
                <button
                  onClick={() => go(id)}
                  onMouseEnter={() => setHover(id)}
                  onMouseLeave={() => setHover(null)}
                  onFocus={() => setHover(id)}
                  onBlur={() => setHover(null)}
                  className="w-full rounded-lg px-2.5 py-1.5 text-left text-sm text-muted hover:bg-surface-2 hover:text-text focus:bg-surface-2 focus:text-text"
                >
                  {s.label}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
      <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#ffc65c]" /> You
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full border border-[#e5c77a] bg-[#1f2d4d]" /> Staff
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-white/80" /> Places
        </span>
      </div>
    </Modal>
  );
}
