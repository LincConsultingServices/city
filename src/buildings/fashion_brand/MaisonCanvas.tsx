// MAISON's renderer — the building's single Pixi↔React seam. React never
// re-renders the room; the ticker reads and writes `roomStore` and the DOM shell
// reads the same store through selectors.
//
// It does NOT own a PIXI.Application — see framework/building/interiorStage.ts
// for why two Applications break Pixi v8. We borrow the city's renderer, hide
// its layers, and give everything back on the way out.
//
// Like the Café, there is no follow camera: the whole room fits on one screen,
// so it is framed once and stays framed. Unlike the Café, the room has two
// levels — the atelier is lifted, and the player is lifted with it when they
// walk up (§3.1).
import { useEffect } from "react";
import { Container, Graphics, Sprite, Texture, type FederatedPointerEvent } from "pixi.js";
import { TILE_H, TILE_W, mapToWorld, roundCell, worldToMap } from "@/lib/iso";
import { findPath, type Cell } from "@/lib/pathfinding";
import { prefersReducedMotion } from "@/lib/motion";
import { audio } from "@/framework/audio/audioManager";
import { whenInteriorHost, type InteriorHost } from "@/framework/building/interiorStage";
import {
  PLAYER_PALETTE,
  bakePersonTextures,
  bakeShadowTexture,
  destroyTextures,
  type PersonPalette,
  type PersonTextures,
} from "@/world/characterArt";
import type { Cardinal } from "@/world/assets";
import { MAISON_PALETTE, bakeMaisonTextures } from "./props";
import { roomDressing } from "./dressing";
import {
  Z_PLAYER,
  buildFloor,
  buildKeyLight,
  buildRoom,
  dressRail,
  dressRoom,
  riseAt,
} from "./scene";
import {
  ROOM_H,
  ROOM_PX_H,
  ROOM_PX_W,
  ROOM_W,
  SPAWN,
  exitNear,
  makeRoomGrid,
  stationNear,
} from "./room";
import { useRoomStore } from "./roomStore";
import { useMaisonStore } from "./maisonStore";
import { castAt } from "./cast";

const WALK_SPEED = 175; // px/sec — the city's pace, so indoors feels like outdoors
const STEP_S = 0.18;
const VIEWPORT_PAD = 48;
const WALL_LIFT = 46; // half the back wall's height, for visual centring
const GAZE_RANGE = 3; // cells — how close you get before Élise looks up
const GAZE_HOLD_S = 2.4; // "a beat longer than is comfortable" (§5.1)
const MOVE_KEYS = new Set(["w", "a", "s", "d", "arrowup", "arrowleft", "arrowdown", "arrowright"]);

export function MaisonCanvas({ onReady }: { onReady?: () => void }) {
  useEffect(() => {
    let destroyed = false;
    let baked: Texture[] = [];
    let unsubscribe: (() => void) | null = null;
    let detach: (() => void) | null = null;
    const reduced = prefersReducedMotion();

    const store = useRoomStore.getState();
    const keys = new Set<string>();
    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (MOVE_KEYS.has(k)) keys.add(k);
    };
    const onKeyUp = (e: KeyboardEvent) => keys.delete(e.key.toLowerCase());
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    const grid = makeRoomGrid();
    let curCell: Cell = { ...SPAWN };
    let charPixel = mapToWorld(SPAWN.x, SPAWN.y);
    let pathTargets: Cell[] = [];
    let facing: Cardinal = "N"; // you spawn at the desk facing the rail

    const walkableAt = (px: number, py: number) => {
      const c = roundCell(worldToMap(px, py));
      return grid.isWalkable(c.x, c.y);
    };

    (async () => {
      const host: InteriorHost = await whenInteriorHost();
      if (destroyed) return;

      const { app } = host;
      host.hideWorld();

      const root = new Container();
      const backdrop = new Sprite(Texture.WHITE);
      backdrop.tint = MAISON_PALETTE.void;
      const world = new Container();
      root.addChild(backdrop, world);
      app.stage.addChild(root);

      const tex = bakeMaisonTextures(app.renderer);
      baked.push(...tex.all);
      world.addChild(buildFloor(tex));
      world.addChild(buildKeyLight());

      const { root: actors, rail, dressing } = buildRoom(tex);
      world.addChild(actors);

      const redress = (state = useMaisonStore.getState().world) => {
        const d = roomDressing(state);
        dressRail(rail, tex, d);
        dressRoom(dressing, d);
      };
      redress();

      // ── The player ──────────────────────────────────────────────────────────
      const playerTex = bakePersonTextures(app.renderer, PLAYER_PALETTE);
      const shadowTex = bakeShadowTexture(app.renderer);
      baked.push(...playerTex.all, shadowTex);

      const char = new Container();
      const charShadow = new Sprite(shadowTex);
      charShadow.anchor.set(0.5, 0.5);
      charShadow.position.set(0, 1);
      const charBody = new Sprite(playerTex.idle.N);
      charBody.anchor.set(0.5, 1);
      char.addChild(charShadow, charBody);
      actors.addChild(char);

      const pathLine = new Graphics();
      world.addChild(pathLine);

      // ── The cast (§5) ───────────────────────────────────────────────────────
      // Same procedural rig as the street, one palette each. Baked on demand and
      // cached: who is in the building changes with the season, and re-baking a
      // person every time somebody arrives would stall a frame.
      const people = new Map<string, PersonTextures>();
      const personTex = (key: string, palette: PersonPalette): PersonTextures => {
        let t = people.get(key);
        if (!t) {
          t = bakePersonTextures(app.renderer, palette);
          baked.push(...t.all);
          people.set(key, t);
        }
        return t;
      };
      const WORKER_PALETTE: PersonPalette = {
        shirt: 0x9a958b,
        legs: 0x4a4741,
        skin: 0xdcc0a0,
        hair: 0x3a312a,
      };

      const castLayer = new Container();
      castLayer.sortableChildren = true;
      actors.addChild(castLayer);

      /** Élise looks up when you come near, and holds it (§5.1). */
      let elise: { body: Sprite; tex: PersonTextures; anchor: Cell; gaze: number } | null = null;

      const placePerson = (
        tex: PersonTextures,
        cell: Cell,
        facing: Cardinal = "S",
      ): { root: Container; body: Sprite } => {
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
      };

      const rebuildCast = (state = useMaisonStore.getState()) => {
        castLayer.removeChildren().forEach((c) => c.destroy());
        elise = null;
        if (!state.track) return;

        const cast = castAt(state.track, state.decided, state.world);
        for (const member of cast.named) {
          const tex = personTex(member.id, member.palette);
          const { root, body } = placePerson(tex, member.anchor);
          castLayer.addChild(root);
          if (member.id === "elise") elise = { body, tex, anchor: member.anchor, gaze: 0 };
        }

        // The ambient loop: workers at the machines, and one boutique client who
        // looks at the rail and mostly buys nothing, which is accurate (§5.8).
        const MACHINE_CELLS: Cell[] = [
          { x: 2, y: 1 },
          { x: 6, y: 1 },
          { x: 8, y: 2 },
        ];
        for (let i = 0; i < cast.workers; i++) {
          castLayer.addChild(
            placePerson(personTex("worker", WORKER_PALETTE), MACHINE_CELLS[i]).root,
          );
        }
        if (cast.client) {
          castLayer.addChild(
            placePerson(personTex("worker", WORKER_PALETTE), { x: 7, y: 9 }, "W").root,
          );
        }
      };
      rebuildCast();

      // ── Input ───────────────────────────────────────────────────────────────
      const onStageDown = (e: FederatedPointerEvent) => {
        if (useRoomStore.getState().inputLocked) return;
        const local = world.toLocal(e.global);
        const goal = roundCell(worldToMap(local.x, local.y));
        if (!grid.isWalkable(goal.x, goal.y)) return;
        const path = findPath(grid, curCell, goal);
        if (path.length <= 1) return;
        pathTargets = path.slice(1);
        drawPathPreview(pathLine, pathTargets);
      };
      app.stage.on("pointerdown", onStageDown);

      // ── The house, reacting to the season ───────────────────────────────────
      // The building's readout is a subscription, not a redraw of the room:
      // decide a beat, and the collection on the brass changes — or the wall,
      // the shelf, the desk or the door does instead (§3.3, §18.2.8). Only on a
      // real change, so a decision that moves nothing costs nothing.
      unsubscribe = useMaisonStore.subscribe((s, prev) => {
        if (destroyed) return;
        if (s.world !== prev.world) redress(s.world);
        // Who is in the building moves with the season too: the beat you are on
        // is the beat somebody is standing at (§5, §8).
        if (s.world !== prev.world || s.decided !== prev.decided || s.track !== prev.track) {
          rebuildCast(s);
        }
      });

      // ── Ticker ──────────────────────────────────────────────────────────────
      let stepClock = 0;
      let lastStepFrame = 0;
      let elapsed = 0;
      let lastW = 0;
      let lastH = 0;

      const tick = (ticker: { deltaMS: number }) => {
        if (destroyed) return;
        const dt = ticker.deltaMS / 1000;
        elapsed += dt;
        const locked = useRoomStore.getState().inputLocked;
        const prevX = charPixel.x;
        const prevY = charPixel.y;

        let dx = 0;
        let dy = 0;
        if (!locked) {
          if (keys.has("d") || keys.has("arrowright")) dx += 1;
          if (keys.has("a") || keys.has("arrowleft")) dx -= 1;
          if (keys.has("s") || keys.has("arrowdown")) dy += 1;
          if (keys.has("w") || keys.has("arrowup")) dy -= 1;
        }

        if (dx !== 0 || dy !== 0) {
          pathTargets = [];
          pathLine.clear();
          const len = Math.hypot(dx, dy);
          const step = WALK_SPEED * dt;
          const nx = charPixel.x + (dx / len) * step;
          const ny = charPixel.y + (dy / len) * step;
          if (walkableAt(nx, charPixel.y)) charPixel.x = nx; // per-axis slide
          if (walkableAt(charPixel.x, ny)) charPixel.y = ny;
        } else if (pathTargets.length > 0 && !locked) {
          const next = pathTargets[0];
          const target = mapToWorld(next.x, next.y);
          const ddx = target.x - charPixel.x;
          const ddy = target.y - charPixel.y;
          const dist = Math.hypot(ddx, ddy);
          const step = WALK_SPEED * dt;
          if (dist <= step) {
            charPixel = target;
            pathTargets.shift();
            drawPathPreview(pathLine, pathTargets);
          } else {
            charPixel.x += (ddx / dist) * step;
            charPixel.y += (ddy / dist) * step;
          }
        }

        const movedX = charPixel.x - prevX;
        const movedY = charPixel.y - prevY;
        if (movedX !== 0 || movedY !== 0) {
          const mdx = movedX / TILE_W + movedY / TILE_H;
          const mdy = movedY / TILE_H - movedX / TILE_W;
          facing = Math.abs(mdx) >= Math.abs(mdy) ? (mdx > 0 ? "E" : "W") : mdy > 0 ? "S" : "N";
          stepClock += dt;
          const stepFrame = Math.floor(stepClock / STEP_S) % 2;
          if (stepFrame !== lastStepFrame) {
            lastStepFrame = stepFrame;
            audio.play(stepFrame === 0 ? "step_hard_1" : "step_hard_2", {
              volume: 0.3,
              rate: 0.94 + Math.random() * 0.12,
            });
          }
          charBody.texture = playerTex.walk[facing][stepFrame];
          charBody.position.y = reduced
            ? 0
            : -Math.abs(Math.sin((stepClock * Math.PI) / STEP_S)) * 2.5;
          charBody.scale.y = 1;
        } else {
          stepClock = 0;
          charBody.texture = playerTex.idle[facing];
          charBody.position.y = 0;
          if (!reduced) charBody.scale.y = 1 + 0.012 * Math.sin(elapsed * 2);
        }
        charBody.scale.x = facing === "W" ? -1 : 1;

        const cell = roundCell(worldToMap(charPixel.x, charPixel.y));
        // Walking up onto the platform lifts you with it — the two levels are
        // one volume, and the step up has to be visible or the atelier reads as
        // a picture rather than a place you are standing in (§3.1).
        char.position.set(charPixel.x, charPixel.y + riseAt(cell));
        char.zIndex = cell.x + cell.y + Z_PLAYER;

        if (cell.x !== curCell.x || cell.y !== curCell.y) {
          curCell = cell;
          store.setCharCell(curCell);
          store.setNearExit(exitNear(curCell));
          store.setNearStation(stationNear(curCell)?.id ?? null);
        }

        // §5.1: "She looks up, holds it a beat longer than is comfortable, then
        // goes back to work. That single behaviour does more characterisation
        // than any line she has." So the gaze is on a timer, not on your
        // distance — she stops looking whether or not you have gone away.
        if (elise) {
          const near =
            Math.abs(cell.x - elise.anchor.x) + Math.abs(cell.y - elise.anchor.y) <= GAZE_RANGE;
          if (near && elise.gaze <= 0) elise.gaze = GAZE_HOLD_S;
          else if (elise.gaze > 0) elise.gaze -= dt;
          if (elise.gaze > 0) {
            const dxc = cell.x - elise.anchor.x;
            const dyc = cell.y - elise.anchor.y;
            elise.body.texture =
              elise.tex.idle[
                Math.abs(dxc) >= Math.abs(dyc) ? (dxc > 0 ? "E" : "W") : dyc > 0 ? "S" : "N"
              ];
          } else {
            elise.body.texture = elise.tex.idle.S; // back to the seam
          }
        }

        const sw = app.screen.width;
        const sh = app.screen.height;
        if (sw !== lastW || sh !== lastH) {
          lastW = sw;
          lastH = sh;
          backdrop.width = sw;
          backdrop.height = sh;
          const scale = Math.min(
            1,
            (sw - VIEWPORT_PAD) / ROOM_PX_W,
            (sh - VIEWPORT_PAD) / ROOM_PX_H,
          );
          world.scale.set(scale);
          const mid = mapToWorld((ROOM_W - 1) / 2, (ROOM_H - 1) / 2);
          world.position.set(sw / 2 - mid.x * scale, sh / 2 - (mid.y - WALL_LIFT) * scale);
        }
      };
      app.ticker.add(tick);

      detach = () => {
        app.ticker.remove(tick);
        app.stage.off("pointerdown", onStageDown);
        app.stage.removeChild(root);
        root.destroy({ children: true });
        destroyTextures(baked);
        baked = [];
        host.showWorld();
      };

      store.setNearExit(exitNear(curCell));
      store.setNearStation(stationNear(curCell)?.id ?? null);
      audio.preload(["step_hard_1", "step_hard_2"]);

      if (destroyed) {
        detach();
        detach = null;
        return;
      }
      onReady?.();
    })();

    return () => {
      destroyed = true;
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      unsubscribe?.();
      unsubscribe = null;
      detach?.();
      detach = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Renders no DOM: the room is drawn into the city's existing canvas.
  return null;
}

/** A quiet trail to the click target — brass, because everything here is brass. */
function drawPathPreview(line: Graphics, targets: Cell[]): void {
  line.clear();
  if (targets.length === 0) return;
  for (const t of targets) {
    const w = mapToWorld(t.x, t.y);
    line.circle(w.x, w.y, 3).fill({ color: MAISON_PALETTE.brass, alpha: 0.45 });
  }
  const end = targets[targets.length - 1];
  const w = mapToWorld(end.x, end.y);
  line.ellipse(w.x, w.y, 16, 8).stroke({ color: MAISON_PALETTE.brass, width: 2, alpha: 0.75 });
}
