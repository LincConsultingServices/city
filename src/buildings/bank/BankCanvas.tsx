// Meridian Bank's renderer — the building's single Pixi↔React seam. React never
// re-renders the room; the ticker reads and writes `roomStore`, and the DOM shell
// reads the same store through selectors.
//
// It does NOT own a PIXI.Application — see framework/building/interiorStage.ts
// for why two Applications break Pixi v8. It borrows the city's renderer, hides
// its layers, and gives everything back on the way out. Like the Café and
// MAISON, the whole room fits on screen, so it is framed once and stays framed.
import { useEffect } from "react";
import { Container, Graphics, Sprite, Texture, type FederatedPointerEvent } from "pixi.js";
import { currentIdentity, paletteFor } from "@/framework/player/identity";
import { TILE_H, TILE_W, mapToWorld, roundCell, worldToMap } from "@/lib/iso";
import { findPath, type Cell } from "@/lib/pathfinding";
import { prefersReducedMotion } from "@/lib/motion";
import { audio } from "@/framework/audio/audioManager";
import { whenInteriorHost, type InteriorHost } from "@/framework/building/interiorStage";
import {
  bakePersonTextures,
  bakeShadowTexture,
  destroyTextures,
  type PersonPalette,
  type PersonTextures,
} from "@/world/characterArt";
import type { Cardinal } from "@/world/assets";
import { BANK_PALETTE, bakeBankTextures } from "./props";
import {
  Z_PLAYER,
  buildFloor,
  buildLights,
  buildRoom,
  face,
  placePerson,
  towards,
  type Figure,
} from "./scene";
import {
  ROOM_H,
  ROOM_W,
  SPAWN,
  exitNear,
  makeRoomGrid,
  stationById,
  stationNear,
} from "./room";
import { actHere, ticketLabel, useRoomStore } from "./roomStore";
import { STAFF, STILL_CUSTOMERS, WALKING_CUSTOMERS, type StaffMember } from "./cast";

const WALK_SPEED = 175; // px/sec — the city's pace
const CUSTOMER_SPEED = 70; // unhurried; nobody runs in a bank
const STEP_S = 0.18;
/**
 * The camera. The bank is the biggest room in the city — framed whole it shrank
 * every person in it to a few pixels — so it is shot close and follows you, the
 * way the street does, and stops at the walls.
 */
const CAMERA_ZOOM_MAX = 1.05;
const CAMERA_ZOOM_MIN = 0.62;
/** Screen pixels the room is designed to fill at zoom 1: about ten tiles across. */
const CAMERA_FRAME_W = 1400;
const CAMERA_FRAME_H = 820;
/** How quickly the camera catches up with you (per second). */
const CAMERA_EASE = 6;
/** Keep you a little below centre, so more of the room ahead of you shows. */
const CAMERA_LEAD_Y = -50;
/** The room's extent in world pixels, walls and signs included. */
const ROOM_BOUNDS = (() => {
  const left = mapToWorld(-1, ROOM_H).x - TILE_W / 2;
  const right = mapToWorld(ROOM_W, -1).x + TILE_W / 2;
  const top = mapToWorld(-1, -1).y - 190; // the back wall and the sign over it
  const bottom = mapToWorld(ROOM_W, ROOM_H).y + TILE_H;
  return { left, right, top, bottom };
})();
const NOTICE_RANGE = 2; // cells — how close before staff turn to you
const MOVE_KEYS = new Set(["w", "a", "s", "d", "arrowup", "arrowleft", "arrowdown", "arrowright"]);

/** A customer walking their loop of errands. */
interface Walker {
  fig: Figure;
  stops: readonly Cell[];
  stop: number;
  path: Cell[];
  pos: { x: number; y: number };
  wait: number;
  facing: Cardinal;
  stepClock: number;
}

export function BankCanvas({ onReady }: { onReady?: () => void }) {
  useEffect(() => {
    let destroyed = false;
    let baked: Texture[] = [];
    let unsubscribe: Array<() => void> = [];
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
    let facing: Cardinal = "N";

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
      backdrop.tint = BANK_PALETTE.void;
      const world = new Container();
      root.addChild(backdrop, world);
      app.stage.addChild(root);

      // Armed now, so a failed build still gives the street back.
      detach = () => {
        app.stage.removeChild(root);
        root.destroy({ children: true });
        destroyTextures(baked);
        baked = [];
        host.showWorld();
      };

      const tex = bakeBankTextures(app.renderer);
      baked.push(...tex.all);
      world.addChild(buildFloor(tex));
      world.addChild(buildLights());

      const { root: actors, hotspots, serving } = buildRoom(tex);
      world.addChild(actors);

      // ── People ──────────────────────────────────────────────────────────────
      const shadowTex = bakeShadowTexture(app.renderer);
      baked.push(shadowTex);
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

      // The player, in their own clothes.
      const playerTex = personTex("player", paletteFor(currentIdentity(), "casual"));
      const char = new Container();
      const charShadow = new Sprite(shadowTex);
      charShadow.anchor.set(0.5, 0.5);
      charShadow.position.set(0, 1);
      const charBody = new Sprite(playerTex.idle.N);
      charBody.anchor.set(0.5, 1);
      char.addChild(charShadow, charBody);
      actors.addChild(char);

      // The staff — each at their post, each clickable.
      const staffFigs: Array<{ member: StaffMember; fig: Figure }> = [];
      for (const member of STAFF) {
        const fig = placePerson(personTex(member.id, member.palette), shadowTex, member.anchor, member.facing);
        fig.body.eventMode = "static";
        fig.body.cursor = "pointer";
        hotspots.push({ sprite: fig.body, stationId: member.stationId });
        actors.addChild(fig.root);
        staffFigs.push({ member, fig });
      }

      // Customers who stay put.
      for (const c of STILL_CUSTOMERS) {
        actors.addChild(placePerson(personTex(c.key, c.palette), shadowTex, c.cell, c.facing).root);
      }

      // Customers who come and go.
      const walkers: Walker[] = WALKING_CUSTOMERS.map((c) => {
        const fig = placePerson(personTex(c.key, c.palette), shadowTex, c.stops[0], "N");
        fig.root.visible = false;
        actors.addChild(fig.root);
        const start = mapToWorld(c.stops[0].x, c.stops[0].y);
        return {
          fig,
          stops: c.stops,
          stop: 0,
          path: [],
          pos: { x: start.x, y: start.y },
          wait: c.delayS,
          facing: "N",
          stepClock: 0,
        };
      });

      const pathLine = new Graphics();
      world.addChild(pathLine);

      // ── Input ───────────────────────────────────────────────────────────────
      const walkToCell = (goal: Cell): boolean => {
        if (!grid.isWalkable(goal.x, goal.y)) return false;
        const path = findPath(grid, curCell, goal);
        if (path.length <= 1) return false;
        pathTargets = path.slice(1);
        drawPathPreview(pathLine, pathTargets);
        return true;
      };

      const onStageDown = (e: FederatedPointerEvent) => {
        if (useRoomStore.getState().inputLocked) return;
        const local = world.toLocal(e.global);
        walkToCell(roundCell(worldToMap(local.x, local.y)));
      };
      app.stage.on("pointerdown", onStageDown);

      // Clicking a prop or a person walks you to its station; clicking it once
      // you are there does what E does — the same guarded path in the store.
      const onHotspot = (stationId: string) => (e: FederatedPointerEvent) => {
        e.stopPropagation();
        if (useRoomStore.getState().inputLocked) return;
        if (useRoomStore.getState().nearStationId === stationId) {
          actHere();
          return;
        }
        const station = stationById(stationId);
        if (!station || walkToCell(station.cell)) return;
        actHere();
      };
      for (const h of hotspots) h.sprite.on("pointerdown", onHotspot(h.stationId));

      unsubscribe.push(
        useRoomStore.subscribe((st) => {
          if (destroyed || !st.walkTo) return;
          const goal = st.walkTo;
          useRoomStore.getState().setWalkTo(null);
          walkToCell(goal);
        }),
      );

      // The queue screen follows the store.
      const showQueue = () => {
        const q = useRoomStore.getState().queue;
        serving.text =
          q.calledTo !== null
            ? `${ticketLabel(q.serving, q.service)}  →  WINDOW ${q.calledTo}`
            : `NOW SERVING  ${ticketLabel(q.serving, q.service)}`;
      };
      showQueue();
      unsubscribe.push(
        useRoomStore.subscribe((st, prev) => {
          if (!destroyed && st.queue !== prev.queue) showQueue();
        }),
      );

      // ── Ticker ──────────────────────────────────────────────────────────────
      let stepClock = 0;
      let lastStepFrame = 0;
      let elapsed = 0;
      let lastW = 0;
      let lastH = 0;
      let zoom = 1;
      const cam = { x: 0, y: 0 };
      let cameraSet = false;

      const moveWalker = (w: Walker, dt: number) => {
        if (w.wait > 0) {
          w.wait -= dt;
          if (w.wait <= 0 && !w.fig.root.visible) {
            // Arriving through the door.
            w.fig.root.visible = true;
            w.fig.root.alpha = 0;
          }
          return;
        }
        if (w.fig.root.alpha < 1) w.fig.root.alpha = Math.min(1, w.fig.root.alpha + dt * 2);

        if (w.path.length === 0) {
          // At a stop. The last one is the door: leave, and come back later.
          if (w.stop === w.stops.length - 1) {
            w.fig.root.visible = false;
            w.stop = 0;
            const s = mapToWorld(w.stops[0].x, w.stops[0].y);
            w.pos = { x: s.x, y: s.y };
            w.wait = 6 + Math.random() * 8;
            return;
          }
          const here = w.stops[w.stop];
          const next = w.stops[w.stop + 1];
          w.stop += 1;
          w.path = findPath(grid, here, next).slice(1);
          return;
        }

        const target = mapToWorld(w.path[0].x, w.path[0].y);
        const dx = target.x - w.pos.x;
        const dy = target.y - w.pos.y;
        const dist = Math.hypot(dx, dy);
        const step = CUSTOMER_SPEED * dt;
        if (dist <= step) {
          w.pos = { x: target.x, y: target.y };
          w.path.shift();
          if (w.path.length === 0) {
            // Arrived at an errand: stand a while, facing whatever it is.
            w.wait = w.stop === w.stops.length - 1 ? 0.6 : 2.5 + Math.random() * 3;
            face(w.fig, w.facing);
          }
        } else {
          w.pos.x += (dx / dist) * step;
          w.pos.y += (dy / dist) * step;
          const mdx = dx / TILE_W + dy / TILE_H;
          const mdy = dy / TILE_H - dx / TILE_W;
          w.facing = Math.abs(mdx) >= Math.abs(mdy) ? (mdx > 0 ? "E" : "W") : mdy > 0 ? "S" : "N";
          w.stepClock += dt;
          const frame = Math.floor(w.stepClock / (STEP_S * 1.4)) % 2;
          face(w.fig, w.facing, w.fig.tex.walk[w.facing][frame]);
        }
        const cell = roundCell(worldToMap(w.pos.x, w.pos.y));
        w.fig.root.position.set(w.pos.x, w.pos.y);
        w.fig.root.zIndex = cell.x + cell.y + Z_PLAYER - 0.05;
      };

      const tick = (ticker: { deltaMS: number }) => {
        if (destroyed) return;
        const dt = Math.min(ticker.deltaMS / 1000, 0.1);
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
          if (walkableAt(nx, charPixel.y)) charPixel.x = nx;
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
          charBody.position.y = reduced ? 0 : -Math.abs(Math.sin((stepClock * Math.PI) / STEP_S)) * 2.5;
          charBody.scale.y = 1;
        } else {
          stepClock = 0;
          charBody.texture = playerTex.idle[facing];
          charBody.position.y = 0;
          if (!reduced) charBody.scale.y = 1 + 0.012 * Math.sin(elapsed * 2);
        }
        charBody.scale.x = facing === "W" ? -1 : 1;

        const cell = roundCell(worldToMap(charPixel.x, charPixel.y));
        char.position.set(charPixel.x, charPixel.y);
        char.zIndex = cell.x + cell.y + Z_PLAYER;

        if (cell.x !== curCell.x || cell.y !== curCell.y) {
          curCell = cell;
          store.setCharCell(curCell);
          store.setNearExit(exitNear(curCell));
          store.setNearStation(stationNear(curCell)?.id ?? null);

          // Staff look up when you come close, and go back to work when you leave.
          for (const { member, fig } of staffFigs) {
            const near =
              Math.abs(cell.x - member.anchor.x) + Math.abs(cell.y - member.anchor.y) <= NOTICE_RANGE;
            face(fig, near ? towards(member.anchor, cell) : member.facing);
          }
        }

        if (!reduced) for (const w of walkers) moveWalker(w, dt);

        const sw = app.screen.width;
        const sh = app.screen.height;
        if (sw !== lastW || sh !== lastH) {
          lastW = sw;
          lastH = sh;
          backdrop.width = sw;
          backdrop.height = sh;
          zoom = Math.max(
            CAMERA_ZOOM_MIN,
            Math.min(CAMERA_ZOOM_MAX, sw / CAMERA_FRAME_W, sh / CAMERA_FRAME_H),
          );
          world.scale.set(zoom);
        }

        // Follow the player, eased, and clamped so the view never shows beyond
        // the walls. On an axis where the whole room fits, it is centred.
        const halfW = sw / 2 / zoom;
        const halfH = sh / 2 / zoom;
        const clampAxis = (v: number, lo: number, hi: number, half: number) =>
          hi - lo <= half * 2 ? (lo + hi) / 2 : Math.max(lo + half, Math.min(hi - half, v));
        const goalX = clampAxis(charPixel.x, ROOM_BOUNDS.left, ROOM_BOUNDS.right, halfW);
        const goalY = clampAxis(charPixel.y + CAMERA_LEAD_Y, ROOM_BOUNDS.top, ROOM_BOUNDS.bottom, halfH);
        if (!cameraSet || reduced) {
          cam.x = goalX;
          cam.y = goalY;
          cameraSet = true;
        } else {
          const k = Math.min(1, dt * CAMERA_EASE);
          cam.x += (goalX - cam.x) * k;
          cam.y += (goalY - cam.y) * k;
        }
        world.position.set(sw / 2 - cam.x * zoom, sh / 2 - cam.y * zoom);
      };
      app.ticker.add(tick);

      detach = () => {
        app.ticker.remove(tick);
        app.stage.off("pointerdown", onStageDown);
        for (const h of hotspots) h.sprite.removeAllListeners();
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
    })().catch((err) => {
      detach?.();
      detach = null;
      console.error("Bank: the room failed to build", err);
    });

    return () => {
      destroyed = true;
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      for (const u of unsubscribe) u();
      unsubscribe = [];
      detach?.();
      detach = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

/** A quiet gold trail to the click target. */
function drawPathPreview(line: Graphics, targets: Cell[]): void {
  line.clear();
  if (targets.length === 0) return;
  for (const t of targets) {
    const w = mapToWorld(t.x, t.y);
    line.circle(w.x, w.y, 3).fill({ color: BANK_PALETTE.gold, alpha: 0.5 });
  }
  const end = targets[targets.length - 1];
  const w = mapToWorld(end.x, end.y);
  line.ellipse(w.x, w.y, 16, 8).stroke({ color: BANK_PALETTE.gold, width: 2, alpha: 0.8 });
}
