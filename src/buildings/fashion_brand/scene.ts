// Pure Pixi scene builders for MAISON — no React, no store, no ticker. Given a
// baked texture set they return containers the canvas drops into its layer
// graph. Placement follows the city's conventions (anchor 0.5/1 at
// `mapToWorld(cell) + TILE_H/2`, depth via `zIndex = cell.x + cell.y`).
//
// The one thing MAISON does that the Café does not: two levels. The atelier sits
// 0.9 m up (§3.1), which here is a lift on the y axis for anything standing on
// it. It is one volume, not two scenes — you can see the atelier from the floor,
// and that sightline is the reason the platform is raised rather than hidden
// (§3.2).
import { Container, Graphics, Sprite, Text, type Texture } from "pixi.js";
import { TILE_H, TILE_W, mapToWorld } from "@/lib/iso";
import type { Cell } from "@/lib/pathfinding";
import type { PersonPalette, PersonTextures } from "@/world/characterArt";
import type { Cardinal } from "@/world/assets";
import { MAISON_PALETTE, shade as shadeHex, type MaisonTextures } from "./props";
import type { RoomCast } from "./cast";
import {
  COLUMN_CELL,
  DESK_CELLS,
  FURNITURE,
  NEAR_EDGE,
  PLATFORM_EDGE_Y,
  PLATFORM_RISE_PX,
  PRESS_CELLS,
  RAIL_CELLS,
  ROOM_H,
  ROOM_W,
  SHELF_CELL,
  SHELL,
  SHELL_WALLS,
  WORKER_CELLS,
  cellsOf,
  levelAt,
  stationForProp,
  stationNear,
} from "./room";
import type { RoomDressing } from "./dressing";

const Z_FLAT = -0.1; // the threshold, the ramp — under everything upright
/**
 * The shopfront sorts BEHIND everything on its own row. It is the frontmost row
 * in the room, so by depth alone it would clip the feet of anyone walking the
 * front of the boutique — and there is nothing between it and the camera for it
 * to occlude anyway.
 */
const Z_NEAR_EDGE = -0.5;
const Z_LIGHT = -0.05; // the key light pool, over the floor and under the rail
export const Z_PLAYER = 0.6; // matches the city's own player offset

/** The lift a cell gets for standing on the raised platform. */
export const riseAt = (cell: Cell): number => (levelAt(cell) === "atelier" ? -PLATFORM_RISE_PX : 0);

function place(sprite: Sprite, cx: number, cy: number): Sprite {
  const w = mapToWorld(cx, cy);
  sprite.anchor.set(0.5, 1);
  sprite.position.set(w.x, w.y + TILE_H / 2 + riseAt({ x: cx, y: cy }));
  return sprite;
}

/**
 * The floor — two tones per level, so the boutique reads polished and pale and
 * the atelier reads like bare working board. Static, sorted once.
 */
export function buildFloor(tex: MaisonTextures): Container {
  const ground = new Container();
  ground.sortableChildren = true;
  for (let y = 0; y < ROOM_H; y++) {
    for (let x = 0; x < ROOM_W; x++) {
      const upstairs = y <= PLATFORM_EDGE_Y;
      const tone = (upstairs ? 2 : 0) + ((x + y) % 2);
      const tile = place(new Sprite(tex.floor[tone]), x, y);
      tile.zIndex = x + y;
      ground.addChild(tile);
    }
  }
  ground.sortChildren();
  return ground;
}

/**
 * The face of the raised platform (§3.1). Without it the 0.9 m lift is an
 * unfilled band straight through to the backdrop — the atelier reads as floating
 * over a chasm rather than standing one step up, which is the opposite of the
 * "two levels, one volume" the sightline in §3.2 depends on.
 */
export function buildRiser(): Container {
  const riser = new Container();
  riser.sortableChildren = true;
  const hw = TILE_W / 2;
  const hh = TILE_H / 2;
  const drop = PLATFORM_RISE_PX;

  // Runs across the shell too, or the platform ends in mid-air at both walls.
  for (let x = -SHELL; x <= ROOM_W; x++) {
    const w = mapToWorld(x, PLATFORM_EDGE_Y);
    // mapToWorld lands on the diamond's centre; the lift raises the whole tile.
    const cx = w.x;
    const cy = w.y - drop;
    const g = new Graphics();
    // The two faces you can actually see from this camera: south-west, then
    // south-east, lit like the side faces of every other box in the room.
    g.poly([cx - hw, cy, cx, cy + hh, cx, cy + hh + drop, cx - hw, cy + drop]).fill(
      shadeHex(MAISON_PALETTE.plasterDeep, 0.78),
    );
    g.poly([cx, cy + hh, cx + hw, cy, cx + hw, cy + drop, cx, cy + hh + drop]).fill(
      shadeHex(MAISON_PALETTE.plasterDeep, 0.6),
    );
    g.zIndex = x + PLATFORM_EDGE_Y - 0.02;
    riser.addChild(g);
  }
  return riser;
}

/**
 * §4's key light: the one pool of hard light in the building, over the rail. The
 * boutique is under-lit and the rail is over-lit — three lighting characters in
 * one volume, done with two flat shapes rather than a lighting model.
 */
export function buildKeyLight(): Container {
  const light = new Container();
  const g = new Graphics();
  const centre = { x: RAIL_CELLS[0].x + 0.5, y: RAIL_CELLS[0].y + 0.5 };
  const w = mapToWorld(centre.x, centre.y);
  g.ellipse(w.x, w.y + TILE_H / 2, 150, 76).fill({ color: MAISON_PALETTE.bone, alpha: 0.16 });
  g.ellipse(w.x, w.y + TILE_H / 2, 92, 46).fill({ color: MAISON_PALETTE.bone, alpha: 0.14 });
  g.zIndex = centre.x + centre.y + Z_LIGHT;
  light.addChild(g);
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
  /** The garments hanging on the rail, rebuilt whenever the season moves. */
  rail: Container;
  /** Everything else the world state shows: clippings, bolts, chalk, boxes. */
  dressing: Container;
  /**
   * The props that answer to the mouse. The canvas wires the listeners, because
   * what a click DOES is store business and this file has no store.
   */
  hotspots: Hotspot[];
}

export function buildRoom(tex: MaisonTextures): RoomLayer {
  const root = new Container();
  root.sortableChildren = true;

  const hotspots: Hotspot[] = [];
  // The shell first: it is outside the play area, so it can never be a hotspot
  // and never claims a cell. It exists so the room reads as a room (§3.1).
  for (const p of SHELL_WALLS) {
    const sprite = place(new Sprite(tex.prop[p.kind]), p.cell.x, p.cell.y);
    sprite.zIndex = p.cell.x + p.cell.y + (NEAR_EDGE.has(p.kind) ? Z_NEAR_EDGE : 0);
    root.addChild(sprite);
  }
  for (const p of FURNITURE) {
    const sprite = place(new Sprite(tex.prop[p.kind]), p.cell.x, p.cell.y);
    const base = p.cell.x + p.cell.y;
    sprite.zIndex = NEAR_EDGE.has(p.kind) ? base + Z_NEAR_EDGE : p.blocking ? base : base + Z_FLAT;
    // §18.2.5: the room answers the mouse as well as the key. A prop that
    // belongs to a station takes the pointer; everything else stays scenery, so
    // clicking bare floor still means "walk here".
    const station = stationForProp(p.kind);
    if (station) {
      sprite.eventMode = "static";
      sprite.cursor = "pointer";
      hotspots.push({ sprite, stationId: station.id });
    }
    root.addChild(sprite);
  }

  const rail = new Container();
  rail.sortableChildren = true;
  root.addChild(rail);

  const dressing = new Container();
  dressing.sortableChildren = true;
  root.addChild(dressing);

  return { root, rail, dressing, hotspots };
}

/**
 * The rail runs across two cells, and the garments hang along it as one run.
 *
 * They are placed against ONE cell and spread by index rather than alternating
 * between the two: alternating put them in two tight clusters a half-tile apart,
 * so eight pieces read as two. §3.3's whole premise is that you can look at the
 * rail and read the season off it in five seconds, and you cannot count a pile.
 */
const RAIL_ANCHOR: Cell = RAIL_CELLS[0];
/** Wider than the garment body, so a packed rail is still a countable one. */
const GARMENT_SPACING = 15;
/** Half a tile, to centre the run between the rail's two cells. */
const RAIL_CENTRE_X = TILE_W / 4;

/**
 * Hang the season on the rail (§3.3). The rail is the building's primary
 * readout: eight vermilion is the house, mostly-neutral is a house that followed
 * its numbers, four pieces is a house that could not fund the rest.
 *
 * It reports and never judges — every state is drawn in the same light, at the
 * same size, on the same brass. Nothing here marks one as better.
 */
export function dressRail(rail: Container, tex: MaisonTextures, d: RoomDressing): void {
  rail.removeChildren().forEach((c) => c.destroy());

  const n = d.garments.length;
  d.garments.forEach((g, i) => {
    const cell = RAIL_ANCHOR;
    const piece = new Container();
    const sprite = place(new Sprite(tex.garment(g.color)), cell.x, cell.y);
    piece.addChild(sprite);

    // The price tag. Its colour is the band; the number is read off the list,
    // because eight-pixel type is not a readout (§15).
    const tag = new Graphics();
    tag.rect(sprite.position.x + 9, sprite.position.y - 44, 7, 9).fill(g.tag);
    piece.addChild(tag);

    // A second name on the neck, when there is one (§12 `house_mark`).
    if (g.collabMark) {
      const mark = new Graphics();
      mark.rect(sprite.position.x - 4, sprite.position.y - 60, 8, 2).fill(MAISON_PALETTE.steel);
      piece.addChild(mark);
    }

    // Spread along the rail so eight pieces read as eight, centred on the run
    // whether there are four of them or ten.
    piece.position.x = (i - (n - 1) / 2) * GARMENT_SPACING + RAIL_CENTRE_X;
    piece.zIndex = cell.x + cell.y + 0.1 + i * 0.001;
    rail.addChild(piece);
  });
}

// ── The cast (§5) ────────────────────────────────────────────────────────────

/** Muted enough to read as background — the ambient loop, not the cast. */
export const WORKER_PALETTE: PersonPalette = {
  shirt: 0x9a958b,
  legs: 0x4a4741,
  skin: 0xdcc0a0,
  hair: 0x3a312a,
};

/** The boutique client, looking at the rail and mostly buying nothing (§5.8). */
const CLIENT_CELL: Cell = { x: 7, y: 9 };

/** One person standing somewhere, shadow and all. */
export function placePerson(
  tex: PersonTextures,
  shadowTex: Texture,
  cell: Cell,
  facing: Cardinal = "S",
): { root: Container; body: Sprite } {
  const root = new Container();
  const shadow = new Sprite(shadowTex);
  shadow.anchor.set(0.5, 0.5);
  shadow.position.set(0, 1);
  const body = new Sprite(tex.idle[facing]);
  body.anchor.set(0.5, 1);
  root.addChild(shadow, body);
  const w = mapToWorld(cell.x, cell.y);
  root.position.set(w.x, w.y + riseAt(cell));
  root.zIndex = cell.x + cell.y + Z_PLAYER - 0.05; // just behind the player
  return { root, body };
}

/** Élise, once she is in the room — the only one the ticker has to keep hold of. */
export interface GazeSubject {
  body: Sprite;
  tex: PersonTextures;
  anchor: Cell;
  /** Seconds of looking left. §5.1's hold runs on a timer, not on your distance. */
  gaze: number;
}

/**
 * Fill the room with whoever is in it. Returns Élise if she is placed, because
 * her gaze is the one thing about the cast the ticker has to drive (§5.1).
 *
 * Named characters are placed first and never cut; the ambient loop is what
 * gives way to the five-on-screen cap, which `castAt` has already applied.
 */
export function buildCast(
  layer: Container,
  cast: RoomCast,
  shadowTex: Texture,
  personTex: (key: string, palette: PersonPalette) => PersonTextures,
  hotspots?: Hotspot[],
): GazeSubject | null {
  layer.removeChildren().forEach((c) => c.destroy());
  let elise: GazeSubject | null = null;

  for (const member of cast.named) {
    const tex = personTex(member.id, member.palette);
    const { root, body } = placePerson(tex, shadowTex, member.anchor);
    layer.addChild(root);
    // §7 lists each NPC as an interactable, and they were the one thing in the
    // room the mouse could not touch. Walking up to somebody is the whole
    // mechanic; clicking them should mean the same thing.
    const station = stationNear(member.anchor);
    if (station && hotspots) {
      body.eventMode = "static";
      body.cursor = "pointer";
      hotspots.push({ sprite: body, stationId: station.id });
    }
    if (member.id === "elise") elise = { body, tex, anchor: member.anchor, gaze: 0 };
  }

  for (let i = 0; i < cast.workers; i++) {
    layer.addChild(
      placePerson(personTex("worker", WORKER_PALETTE), shadowTex, WORKER_CELLS[i]).root,
    );
  }
  if (cast.client) {
    layer.addChild(
      placePerson(personTex("worker", WORKER_PALETTE), shadowTex, CLIENT_CELL, "W").root,
    );
  }
  return elise;
}

/**
 * Everything else §12 shows. Rebuilt only when the season moves, never per
 * frame — this is the rest of the answer to §18.2.8: a decision that does not
 * change the rail changes the wall, the shelf, the desk or the door instead.
 */
export function dressRoom(dressing: Container, d: RoomDressing): void {
  dressing.removeChildren().forEach((c) => c.destroy());

  const at = (cx: number, cy: number) => {
    const w = mapToWorld(cx, cy);
    return { x: w.x, y: w.y + TILE_H / 2 + riseAt({ x: cx, y: cy }) };
  };
  const add = (g: Container, cx: number, cy: number, dz = 0.15) => {
    g.zIndex = cx + cy + dz;
    dressing.addChild(g);
  };

  // ── the press wall: filled frames along the stair run (§3.2) ───────────────
  for (let i = 0; i < d.clippings; i++) {
    const cell = PRESS_CELLS[Math.floor(i / 2) % PRESS_CELLS.length];
    const p = at(cell.x, cell.y);
    const g = new Graphics();
    const lift = i % 2 === 0 ? -66 : -44;
    g.poly([
      p.x - 20,
      p.y + lift,
      p.x,
      p.y + lift + 10,
      p.x,
      p.y + lift + 26,
      p.x - 20,
      p.y + lift + 16,
    ]).fill(MAISON_PALETTE.bone);
    add(g, cell.x, cell.y, 0.2 + i * 0.01);
  }

  // ── the atelier shelf: how the money reads (§12 `cash`) ────────────────────
  for (let i = 0; i < d.bolts; i++) {
    const p = at(SHELF_CELL.x, SHELF_CELL.y);
    const g = new Graphics();
    const tone = d.boltsPremium ? MAISON_PALETTE.bone : MAISON_PALETTE.oak;
    g.rect(p.x - 18 + i * 9, p.y - 66, 6, 20).fill(tone);
    add(g, SHELF_CELL.x, SHELF_CELL.y, 0.2 + i * 0.01);
  }

  // ── the steel column: the countdown, chalked, changed between beats ────────
  const col = at(COLUMN_CELL.x, COLUMN_CELL.y);
  const chalk = new Text({
    text: d.chalk,
    style: {
      fill: MAISON_PALETTE.chalk,
      fontFamily: "Outfit, system-ui, sans-serif",
      fontSize: 13,
      fontWeight: "600",
    },
  });
  chalk.anchor.set(0.5, 0.5);
  chalk.position.set(col.x, col.y - 70);
  add(chalk, COLUMN_CELL.x, COLUMN_CELL.y, 0.25);

  // ── the desk: the resale printout, and whose name is on the paperwork ──────
  const deskCell = DESK_CELLS[DESK_CELLS.length - 1];
  const desk = at(deskCell.x, deskCell.y);
  const printout = new Graphics();
  printout
    .rect(desk.x - 30, desk.y - 52, 14, 18)
    .fill(d.printoutStrong ? MAISON_PALETTE.bone : MAISON_PALETTE.ash);
  add(printout, deskCell.x, deskCell.y, 0.2);

  for (let i = 0; i < d.paperwork; i++) {
    const g = new Graphics();
    g.rect(desk.x - 4 + i * 5, desk.y - 40, 12, 8).fill(MAISON_PALETTE.bone);
    add(g, deskCell.x, deskCell.y, 0.22 + i * 0.01);
  }

  // ── the door: whether the buyer's boxes are stacked by it (§12 `buyer`) ────
  for (let i = 0; i < d.boxes; i++) {
    const p = at(3, 12);
    const g = new Graphics();
    g.rect(p.x - 14 + (i % 2) * 16, p.y - 14 - Math.floor(i / 2) * 13, 15, 13).fill(
      MAISON_PALETTE.oak,
    );
    add(g, 3, 12, 0.2 + i * 0.01);
  }

  // ── the machines: how many are running is the room's heartbeat (§6) ────────
  cellsOf("machine").forEach((cell, i) => {
    if (i >= d.machinesRunning) return;
    const p = at(cell.x, cell.y);
    const g = new Graphics();
    // Brass, not vermilion: §4 spends the one saturated colour on the rail and
    // nowhere else, so that losing it means something.
    g.circle(p.x + 9, p.y - 54, 2.5).fill({ color: MAISON_PALETTE.brass, alpha: 0.7 });
    add(g, cell.x, cell.y, 0.2);
  });
}
