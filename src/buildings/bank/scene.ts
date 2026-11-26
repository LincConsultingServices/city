// Pure Pixi scene builders for Meridian Bank — no React, no store, no ticker.
// Given baked textures they return containers the canvas drops into its layer
// graph. Placement follows the city's conventions: anchor 0.5/1 at
// `mapToWorld(cell) + TILE_H/2`, depth by `zIndex = cell.x + cell.y`.
import { Container, Graphics, Sprite, Text, type Texture } from "pixi.js";
import { TILE_H, mapToWorld } from "@/lib/iso";
import type { Cell } from "@/lib/pathfinding";
import type { PersonTextures } from "@/world/characterArt";
import type { Cardinal } from "@/world/assets";
import { BANK_PALETTE as P, type BankTextures } from "./props";
import {
  COUNTER_Y,
  FURNITURE,
  NEAR_EDGE,
  ROOM_H,
  ROOM_W,
  SHELL_WALLS,
  WINDOW_XS,
  isBackOffice,
  stationForProp,
} from "./room";

const Z_FLAT = -0.1;
const Z_NEAR_EDGE = -0.5;
export const Z_PLAYER = 0.6;

function place(sprite: Sprite, cx: number, cy: number): Sprite {
  const w = mapToWorld(cx, cy);
  sprite.anchor.set(0.5, 1);
  sprite.position.set(w.x, w.y + TILE_H / 2);
  return sprite;
}

/** Marble in the hall, boards behind the counter, carpet in the manager's office. */
export function buildFloor(tex: BankTextures): Container {
  const ground = new Container();
  ground.sortableChildren = true;
  for (let y = 0; y < ROOM_H; y++) {
    for (let x = 0; x < ROOM_W; x++) {
      const checker = (x + y) % 2;
      const base = x <= 4 && y <= 4 ? 4 : isBackOffice({ x, y }) || (x >= 5 && y === 0) ? 2 : 0;
      const tile = place(new Sprite(tex.floor[base + checker]), x, y);
      tile.zIndex = x + y;
      ground.addChild(tile);
    }
  }
  // A navy runner from the door to the counter, the way banks lead you in.
  const runner = new Graphics();
  for (let y = 5; y <= 12; y++) {
    const w = mapToWorld(7, y);
    runner
      .poly([w.x, w.y - 20, w.x + 40, w.y, w.x, w.y + 20, w.x - 40, w.y])
      .fill({ color: P.navy, alpha: 0.55 });
  }
  runner.zIndex = 0.5;
  ground.addChild(runner);
  ground.sortChildren();
  return ground;
}

/** Warm pools of light in front of each open window and over the desks. */
export function buildLights(): Container {
  const light = new Container();
  const pool = (cx: number, cy: number, rx: number, alpha: number) => {
    const w = mapToWorld(cx, cy);
    const g = new Graphics();
    g.ellipse(w.x, w.y + TILE_H / 2, rx, rx / 2).fill({ color: P.goldLight, alpha });
    g.ellipse(w.x, w.y + TILE_H / 2, rx * 0.6, rx * 0.3).fill({ color: P.goldLight, alpha });
    light.addChild(g);
  };
  pool(WINDOW_XS[0], COUNTER_Y + 0.6, 70, 0.09);
  pool(WINDOW_XS[1], COUNTER_Y + 0.6, 70, 0.09);
  pool(12.5, 9, 110, 0.06);
  pool(3, 2.5, 80, 0.07);
  return light;
}

/** A prop you can click, and the station clicking it takes you to. */
export interface Hotspot {
  sprite: Sprite;
  stationId: string;
}

export interface RoomLayer {
  /** Everything that y-sorts against the player. */
  root: Container;
  hotspots: Hotspot[];
  /** The "now serving" screen, redrawn when the queue moves. */
  serving: Text;
}

const label = (text: string, size: number, color: number, weight: "500" | "600" | "700" = "600") =>
  new Text({
    text,
    style: {
      fill: color,
      fontFamily: "Outfit, system-ui, sans-serif",
      fontSize: size,
      fontWeight: weight,
      align: "center",
    },
    resolution: 2,
  });

export function buildRoom(tex: BankTextures): RoomLayer {
  const root = new Container();
  root.sortableChildren = true;
  const hotspots: Hotspot[] = [];

  for (const p of SHELL_WALLS) {
    const sprite = place(new Sprite(tex.prop[p.kind]), p.cell.x, p.cell.y);
    sprite.zIndex = p.cell.x + p.cell.y + (NEAR_EDGE.has(p.kind) ? Z_NEAR_EDGE : 0);
    root.addChild(sprite);
  }
  for (const p of FURNITURE) {
    const sprite = place(new Sprite(tex.prop[p.kind]), p.cell.x, p.cell.y);
    const base = p.cell.x + p.cell.y;
    sprite.zIndex = NEAR_EDGE.has(p.kind) ? base + Z_NEAR_EDGE : p.blocking ? base : base + Z_FLAT;
    const station = stationForProp(p.kind, p.cell);
    if (station) {
      sprite.eventMode = "static";
      sprite.cursor = "pointer";
      hotspots.push({ sprite, stationId: station.id });
    }
    root.addChild(sprite);
  }

  // ── Signs ─────────────────────────────────────────────────────────────────
  const sign = (text: string, cell: Cell, lift: number, opts: { size?: number; plate?: number; ink?: number } = {}) => {
    const w = mapToWorld(cell.x, cell.y);
    const t = label(text, opts.size ?? 15, opts.ink ?? P.goldLight);
    t.anchor.set(0.5, 0.5);
    const plate = new Graphics();
    const pw = t.width + 14;
    const ph = t.height + 6;
    plate
      .roundRect(-pw / 2, -ph / 2, pw, ph, 4)
      .fill({ color: opts.plate ?? P.navy, alpha: 0.95 })
      .stroke({ color: P.gold, width: 1, alpha: 0.8 });
    const c = new Container();
    c.addChild(plate, t);
    c.position.set(w.x, w.y - lift);
    c.zIndex = cell.x + cell.y + 0.3;
    root.addChild(c);
    return c;
  };

  sign("1 · Cash", { x: WINDOW_XS[0], y: COUNTER_Y }, 116);
  sign("2 · Cheques & Passbooks", { x: WINDOW_XS[1], y: COUNTER_Y }, 116);
  sign("3 · Closed", { x: WINDOW_XS[2], y: COUNTER_Y }, 116, { plate: P.ink, ink: P.steelLight });
  sign("New Accounts", { x: 13, y: 7 }, 64, { size: 14 });
  sign("Savings & Deposits", { x: 13, y: 9 }, 64, { size: 14 });
  sign("Loans", { x: 13, y: 11 }, 64, { size: 14 });
  sign("Welcome", { x: 3.5, y: 11 }, 60, { size: 14 });
  sign("Branch Manager", { x: 3, y: 5 }, 104, { size: 14 });
  sign("ATM", { x: 0, y: 8.5 }, 100, { size: 14 });
  sign("MERIDIAN BANK", { x: 9, y: 0 }, 150, { size: 18 });

  // The queue screen, hanging over the middle of the counter.
  const screen = new Container();
  const sw = 200;
  const sh = 40;
  const frame = new Graphics();
  frame.rect(-1, -sh / 2 - 22, 2, 22).fill(P.steel); // the hanger
  frame.roundRect(-sw / 2, -sh / 2, sw, sh, 4).fill(P.ink).stroke({ color: P.gold, width: 1.5 });
  const serving = label("", 16, P.screenGlow, "700");
  serving.anchor.set(0.5, 0.5);
  screen.addChild(frame, serving);
  const sc = mapToWorld(9.5, COUNTER_Y);
  screen.position.set(sc.x, sc.y - 150);
  screen.zIndex = 9 + COUNTER_Y + 0.4;
  root.addChild(screen);

  return { root, hotspots, serving };
}

/** One person standing somewhere, shadow and all. */
export interface Figure {
  root: Container;
  body: Sprite;
  tex: PersonTextures;
}

export function placePerson(
  tex: PersonTextures,
  shadowTex: Texture,
  cell: Cell,
  facing: Cardinal = "S",
): Figure {
  const root = new Container();
  const shadow = new Sprite(shadowTex);
  shadow.anchor.set(0.5, 0.5);
  shadow.position.set(0, 1);
  const body = new Sprite(tex.idle[facing]);
  body.anchor.set(0.5, 1);
  body.scale.x = facing === "W" ? -1 : 1;
  root.addChild(shadow, body);
  const w = mapToWorld(cell.x, cell.y);
  root.position.set(w.x, w.y);
  root.zIndex = cell.x + cell.y + Z_PLAYER - 0.05;
  return { root, body, tex };
}

/** Turn a figure to face a direction, mirroring for west. */
export function face(fig: Figure, facing: Cardinal, frame?: Texture): void {
  fig.body.texture = frame ?? fig.tex.idle[facing];
  fig.body.scale.x = facing === "W" ? -1 : 1;
}

/** The cardinal from one cell towards another. */
export function towards(from: Cell, to: Cell): Cardinal {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  return Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? "E" : "W") : dy > 0 ? "S" : "N";
}
