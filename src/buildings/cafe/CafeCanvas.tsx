// The Café room's renderer — the building's single Pixi↔React seam. React never
// re-renders the room; the ticker reads and writes `cafeStore` and the DOM shell
// reads the same store through selectors (PRD §12.2, mirroring CityCanvas).
//
// It does NOT own a PIXI.Application. Two Applications alive at once breaks Pixi
// v8: the second renderer's mere existence corrupts the city's batcher, the city
// throws out of its own ticker listener, and its RAF loop never reschedules — so
// the street never comes back. Verified with an empty second Application and no
// textures at all. Instead we borrow the city's renderer through the framework's
// interior stage, hide its layers, and give everything back on the way out.
//
// Deliberately unlike the city in one way: there is no follow camera. The whole
// room fits on one screen, so it is framed once and stays framed — the top-view
// restaurant read cafe.jpg is going for.
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
} from "@/world/characterArt";
import type { Cardinal } from "@/world/assets";
import { loadCafeAssets } from "./assets";
import { CAFE_PALETTE, bakeCafeTextures } from "./props";
import { FLAP_OPEN_ROTATION, Z_PLAYER, buildFloor, buildFurniture, buildWarmth } from "./scene";
import {
  GATES,
  ROOM_H,
  ROOM_PX_H,
  ROOM_PX_W,
  ROOM_W,
  SPAWN,
  exitNear,
  gateNear,
  makeRoomGrid,
  type GateId,
} from "./room";
import { toggleFlap, useCafeStore } from "./cafeStore";

const WALK_SPEED = 175; // px/sec — the city's pace, so indoors feels like outdoors
const STEP_S = 0.18; // seconds per walk-cycle frame
const FLAP_SWING_S = 0.25;
const VIEWPORT_PAD = 48; // breathing room around the room at the fitted scale
const WALL_LIFT = 42; // half the back wall's height, for visual centring
const MOVE_KEYS = new Set(["w", "a", "s", "d", "arrowup", "arrowleft", "arrowdown", "arrowright"]);

export function CafeCanvas({ onReady }: { onReady?: () => void }) {
  useEffect(() => {
    let destroyed = false;
    let baked: Texture[] = [];
    let unsubscribe: (() => void) | null = null;
    let detach: (() => void) | null = null;
    const reduced = prefersReducedMotion();

    const store = useCafeStore.getState();
    const keys = new Set<string>();
    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (MOVE_KEYS.has(k)) keys.add(k);
    };
    const onKeyUp = (e: KeyboardEvent) => keys.delete(e.key.toLowerCase());
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    // The collision grid is a pure function of which gates are open, so opening
    // the flap is literally "rebuild the grid" — pathing needs no special case.
    const openGates = new Set<GateId>();
    let grid = makeRoomGrid(openGates);

    let curCell: Cell = { ...SPAWN };
    let charPixel = mapToWorld(SPAWN.x, SPAWN.y);
    let pathTargets: Cell[] = [];
    let facing: Cardinal = "N"; // you come in through the door, facing the room

    const walkableAt = (px: number, py: number) => {
      const c = roundCell(worldToMap(px, py));
      return grid.isWalkable(c.x, c.y);
    };

    (async () => {
      const host: InteriorHost = await whenInteriorHost();
      if (destroyed) return;

      // Sprite-backed props need their bundle in Pixi's cache before we bake.
      await loadCafeAssets();
      if (destroyed) return;

      const { app } = host;
      host.hideWorld();

      // Our own root on the city's stage. `backdrop` is screen-space — the room
      // is a diamond, and without it the city's green sky shows through the
      // corners; `world` carries the room and takes the fit-to-viewport transform.
      const root = new Container();
      const backdrop = new Sprite(Texture.WHITE);
      backdrop.tint = CAFE_PALETTE.void;
      const world = new Container();
      root.addChild(backdrop, world);
      app.stage.addChild(root);

      const tex = bakeCafeTextures(app.renderer);
      baked.push(...tex.all);
      world.addChild(buildFloor(tex));
      if (!reduced) world.addChild(buildWarmth(tex));

      const { root: actors, flap } = buildFurniture(tex);
      world.addChild(actors);

      // ── The player ──────────────────────────────────────────────────────────
      // Same procedural rig as the street, so it is recognisably you indoors.
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

      // ── Input ───────────────────────────────────────────────────────────────
      // The flap stops its own click from reaching the stage, or lifting it would
      // also order the player to walk into the counter.
      flap.children[0].on("pointerdown", (e: FederatedPointerEvent) => {
        e.stopPropagation();
        if (useCafeStore.getState().inputLocked) return;
        toggleFlap();
      });

      // The city has its own stage listener; it no-ops the whole time a venue is
      // open because the world's `inputLocked` is set. Ours comes off by name.
      const onStageDown = (e: FederatedPointerEvent) => {
        if (useCafeStore.getState().inputLocked) return;
        const local = world.toLocal(e.global);
        const goal = roundCell(worldToMap(local.x, local.y));
        if (!grid.isWalkable(goal.x, goal.y)) return;
        const path = findPath(grid, curCell, goal);
        if (path.length <= 1) return;
        pathTargets = path.slice(1);
        drawPathPreview(pathLine, pathTargets);
      };
      app.stage.on("pointerdown", onStageDown);

      // ── The flap, reacting to the store ─────────────────────────────────────
      let flapTarget = 0;
      unsubscribe = useCafeStore.subscribe((s, prev) => {
        if (destroyed || s.flapOpen === prev.flapOpen) return;
        if (s.flapOpen) openGates.add(GATES[0].id);
        else openGates.delete(GATES[0].id);
        grid = makeRoomGrid(openGates);
        // A queued path may now be stale in either direction — drop it rather
        // than let the player walk through a flap that just came down.
        pathTargets = [];
        pathLine.clear();
        flapTarget = s.flapOpen ? FLAP_OPEN_ROTATION : 0;
        if (reduced) flap.rotation = flapTarget;
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
        const locked = useCafeStore.getState().inputLocked;
        const prevX = charPixel.x;
        const prevY = charPixel.y;

        // WASD / arrows — screen-relative direct drive, overrides the click path.
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

        // Facing from the dominant map-axis of this frame's motion, 2-frame
        // stride, bob — the city's convention, so the walk reads the same.
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
            // Tile indoors — always the hard-surface step.
            audio.play(stepFrame === 0 ? "step_hard_1" : "step_hard_2", {
              volume: 0.34,
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
          if (!reduced) charBody.scale.y = 1 + 0.012 * Math.sin(elapsed * 2); // breathing
        }
        charBody.scale.x = facing === "W" ? -1 : 1;

        char.position.set(charPixel.x, charPixel.y);
        const cell = roundCell(worldToMap(charPixel.x, charPixel.y));
        char.zIndex = cell.x + cell.y + Z_PLAYER;

        if (cell.x !== curCell.x || cell.y !== curCell.y) {
          curCell = cell;
          store.setCharCell(curCell);
          store.setNearExit(exitNear(curCell));
          store.setNearGate(gateNear(curCell)?.id ?? null);
        }

        // The flap swing. Linear over FLAP_SWING_S so it reads as a hinge rather
        // than a spring; reduced motion snapped it already, above.
        if (!reduced && flap.rotation !== flapTarget) {
          const swing = (Math.abs(FLAP_OPEN_ROTATION) / FLAP_SWING_S) * dt;
          const delta = flapTarget - flap.rotation;
          flap.rotation =
            Math.abs(delta) <= swing ? flapTarget : flap.rotation + Math.sign(delta) * swing;
        }

        // Camera: no follow. Fit the whole room, never upscaling, and re-frame
        // only when the viewport actually changed.
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
          // Centre on the room's visual mass, not its floor plane: the back wall
          // stands ~84px above the tiles, so centring on the diamond alone parks
          // the whole room high with dead space underneath.
          const mid = mapToWorld((ROOM_W - 1) / 2, (ROOM_H - 1) / 2);
          world.position.set(sw / 2 - mid.x * scale, sh / 2 - (mid.y - WALL_LIFT) * scale);
        }
      };
      app.ticker.add(tick);

      // Everything we borrowed, given back. The city's Application is left
      // running exactly as we found it — we never destroy what we did not make.
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
      store.setNearGate(gateNear(curCell)?.id ?? null);
      audio.preload(["step_hard_1", "step_hard_2"]);

      // Unmounted while we were building? Hand it all straight back — the React
      // cleanup already ran and found nothing to clean.
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

  // Renders no DOM at all: the room is drawn into the city's existing canvas, so
  // there is nothing here to mount. Anything we did render would sit on top of
  // that canvas and swallow the clicks meant for it.
  return null;
}

/** Gold dotted trail to the click target, with a ring on the destination. */
function drawPathPreview(line: Graphics, targets: Cell[]): void {
  line.clear();
  if (targets.length === 0) return;
  for (const t of targets) {
    const w = mapToWorld(t.x, t.y);
    line.circle(w.x, w.y, 3).fill({ color: 0xe2be78, alpha: 0.5 });
  }
  const end = mapToWorld(targets[targets.length - 1].x, targets[targets.length - 1].y);
  line.ellipse(end.x, end.y, 16, 8).stroke({ color: 0xe2be78, width: 2, alpha: 0.8 });
}
