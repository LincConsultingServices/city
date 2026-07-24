// <CityCanvas> — the ONE component that owns a PIXI.Application (PRD §12.2). React
// never re-renders the world; the Pixi ticker drives motion and publishes the
// character cell + nearby venue to the world store for the DOM UI. Renders the
// Kenney-sprite city: district ground + street tiles, stacked venue buildings,
// filler blocks, props (trees/lamps/fountain) and ambient vehicles on road loops.
import { useEffect, useRef } from "react";
import {
  Application,
  Container,
  Graphics,
  Sprite,
  Text,
  type Renderer,
  type Texture,
} from "pixi.js";
import { mapToWorld, worldToMap, roundCell, TILE_W, TILE_H } from "@/lib/iso";
import { findPath, type Cell } from "@/lib/pathfinding";
import { prefersReducedMotion } from "@/lib/motion";
import { dayPhase, lerpColor, BOOT_PHASE_OFFSET_S } from "@/lib/daycycle";
import {
  bakePersonTextures,
  bakeShadowTexture,
  destroyTextures,
  PLAYER_PALETTE,
} from "./characterArt";
import { createAmbient, type Ambient } from "./ambient";
import { events } from "@/framework/events";
import { useEggStore } from "@/framework/eggStore";
import {
  GRID_W,
  GRID_H,
  SPAWN,
  VENUES,
  FILLERS,
  PROPS,
  CROSSWALKS,
  cityGrid,
  districtAt,
  isRoad,
  venueNear,
  type CityBuilding,
  type CityProp,
} from "./cityMap";
import {
  loadCityAssets,
  tex,
  groundSkirt,
  roadTile,
  DISTRICT_GROUND,
  DISTRICT_VARIETY,
  VENUE_VISUAL,
  FILLER_VISUALS,
  FILLER_TINTS,
  PROP_TEXTURE,
  GROUND_PROPS,
  PROP_SCALE,
  STORY_H,
  type VenueVisual,
  type Cardinal,
} from "./assets";
import { useWorldStore } from "./worldStore";

const WALK_SPEED = 175; // px/sec (≈1.3 tiles/sec on the 132px grid)
const STEP_S = 0.18; // seconds per walk-cycle frame
const MOVE_KEYS = new Set(["w", "a", "s", "d", "arrowup", "arrowleft", "arrowdown", "arrowright"]);

export function CityCanvas({ onReady }: { onReady?: () => void }) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let destroyed = false;
    let app: Application | null = null;
    let ambient: Ambient | null = null;
    let bakedTextures: Texture[] = [];
    const offBus: Array<() => void> = [];
    const reduced = prefersReducedMotion();
    const mount = mountRef.current;
    if (!mount) return;

    const store = useWorldStore.getState();
    const keys = new Set<string>();
    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (MOVE_KEYS.has(k)) keys.add(k);
    };
    const onKeyUp = (e: KeyboardEvent) => keys.delete(e.key.toLowerCase());
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    let curCell: Cell = { ...SPAWN };
    let charPixel = mapToWorld(SPAWN.x, SPAWN.y);
    let pathTargets: Cell[] = [];
    let lastNear: string | null = null;

    const walkableAt = (px: number, py: number) => {
      const c = roundCell(worldToMap(px, py));
      return cityGrid.isWalkable(c.x, c.y);
    };

    (async () => {
      const application = new Application();
      await application.init({
        background: 0x9dc183, // soft green horizon beyond the map edge
        resizeTo: mount,
        antialias: true,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
      });
      await loadCityAssets();
      if (destroyed) {
        application.destroy(true);
        return;
      }
      app = application;
      mount.appendChild(application.canvas);

      // Sky backdrop: baked vertical gradient behind the world, day-phase tinted.
      const skyTex = bakeSkyTexture(application.renderer);
      bakedTextures.push(skyTex);
      const sky = new Sprite(skyTex);
      application.stage.addChild(sky);

      const world = new Container();
      application.stage.addChild(world);

      // ── Ground (static, depth-sorted once) ────────────────────────────────
      const ground = new Container();
      ground.sortableChildren = true;
      world.addChild(ground);
      for (let y = 0; y < GRID_H; y++) {
        for (let x = 0; x < GRID_W; x++) {
          const s = new Sprite(groundTexture(x, y));
          s.anchor.set(0.5, 1);
          const c = mapToWorld(x, y);
          s.position.set(c.x, c.y + TILE_H / 2 + skirtFor(x, y));
          s.zIndex = x + y;
          ground.addChild(s);
        }
      }
      ground.sortChildren();

      // ── Depth-sorted actors: buildings, props, character, vehicles ────────
      const actors = new Container();
      actors.sortableChildren = true;
      world.addChild(actors);

      // Warm window-glow texture shared by every building's night lights.
      const windowTex = application.renderer.generateTexture({
        target: new Graphics().roundRect(-5, -3.5, 10, 7, 2).fill({ color: 0xffd98a, alpha: 0.5 }),
        resolution: 2,
      });
      bakedTextures.push(windowTex);

      // Collect world points/handles for ambient emitters and ticker animation.
      const smokeStacks: Array<{ x: number; y: number }> = [];
      const steamVents: Array<{ x: number; y: number }> = [];
      const markers: Graphics[] = [];
      const windowLights: Sprite[] = [];
      const venueNodes = new Map<string, Container>();
      for (const v of VENUES) {
        const parts = makeBuilding(v, windowTex);
        actors.addChild(parts.root);
        venueNodes.set(v.id, parts.root);
        if (v.interactable) markers.push(parts.marker);
        windowLights.push(...parts.lights);
        if (v.id === "race_car" || v.id === "custom") {
          const bounds = parts.root.getLocalBounds();
          smokeStacks.push({
            x: parts.root.position.x + 16,
            y: parts.root.position.y + bounds.minY + 26,
          });
        } else if (v.id === "cafe") {
          const bounds = parts.root.getLocalBounds();
          steamVents.push({
            x: parts.root.position.x - 8,
            y: parts.root.position.y + bounds.minY + 28,
          });
        }
      }
      FILLERS.forEach((f) => {
        const visual = FILLER_VISUALS[f.visualIndex % FILLER_VISUALS.length];
        const t0 = f.footprintTiles[0];
        const wash = f.tint ?? FILLER_TINTS[(t0.x * 7 + t0.y * 13) % FILLER_TINTS.length];
        actors.addChild(
          makeBuildingVisual(visual, f.footprintTiles, wash === 0xffffff ? null : wash),
        );
      });
      const propNodes: Array<{ prop: CityProp; node: Container }> = [];
      for (const p of PROPS) {
        const node = makeProp(p);
        actors.addChild(node);
        propNodes.push({ prop: p, node });
      }

      // Player rig: shared shadow + a body sprite swapping baked walk frames.
      const playerTex = bakePersonTextures(application.renderer, PLAYER_PALETTE);
      const shadowTex = bakeShadowTexture(application.renderer);
      bakedTextures = [...playerTex.all, shadowTex];
      const char = new Container();
      const charShadow = new Sprite(shadowTex);
      charShadow.anchor.set(0.5, 0.5);
      charShadow.position.set(0, 1);
      const charBody = new Sprite(playerTex.idle.S);
      charBody.anchor.set(0.5, 1);
      char.addChild(charShadow, charBody);
      actors.addChild(char);
      let facing: Cardinal = "S";
      let stepClock = 0;
      let lastStepFrame = 0;
      let elapsed = 0;

      // FX overlay (particles, glows, birds) draws above the y-sorted actors.
      const fx = new Container();
      world.addChild(fx);

      // Soft cloud shadows drifting over the whole city (topmost world layer).
      const cloudTex = application.renderer.generateTexture({
        target: new Graphics()
          .ellipse(0, 0, 190, 90)
          .fill({ color: 0x0a0f1c, alpha: 0.055 })
          .ellipse(-95, 32, 120, 60)
          .fill({ color: 0x0a0f1c, alpha: 0.04 })
          .ellipse(100, -22, 130, 68)
          .fill({ color: 0x0a0f1c, alpha: 0.04 }),
      });
      bakedTextures.push(cloudTex);
      const clouds: Sprite[] = [];
      if (!reduced) {
        for (let i = 0; i < 3; i++) {
          const s = new Sprite(cloudTex);
          s.anchor.set(0.5);
          s.scale.set(1.4 + i * 0.5);
          s.position.set(-1600 + i * 1500, i * 900);
          world.addChild(s);
          clouds.push(s);
        }
      }

      // Ambient life: NPCs, vehicles, particles, emitters, pigeons (PRD §6.4).
      const amb = createAmbient({
        renderer: application.renderer,
        actors,
        fx,
        reduced,
        smokeStacks,
        steamVents,
      });
      ambient = amb;
      const view = { left: 0, top: 0, right: 0, bottom: 0 };

      // ── Interactable props: click → world reaction and/or DOM panel ───────
      // Handlers stopPropagation so a prop click never falls through to the
      // stage's click-to-move handler (which receives events by bubbling).
      const WISHES = [
        "You toss a coin in. The fountain approves.",
        "Plink. May your budget always balance.",
        "A wish for compounding returns, granted daily.",
        "The pigeons pretend not to watch. They watched.",
        "Wish logged. The city keeps its promises.",
      ];
      let fountainClicks = 0;
      let fountainShimmerUntil = -1;
      let fountainNode: Container | null = null;
      const hoverable = (node: Container) => {
        const base = node.scale.x;
        node.on("pointerover", () => node.scale.set(base * 1.07));
        node.on("pointerout", () => node.scale.set(base));
      };
      for (const { prop, node } of propNodes) {
        const kind = prop.kind;
        if (
          kind !== "fountain" &&
          kind !== "billboard" &&
          kind !== "bench" &&
          kind !== "plaque" &&
          kind !== "lamp" &&
          kind !== "lamp2"
        ) {
          continue;
        }
        node.eventMode = "static";
        node.cursor = "pointer";
        if (kind === "fountain") fountainNode = node;
        if (kind === "billboard" || kind === "plaque" || kind === "lamp" || kind === "lamp2") {
          hoverable(node);
        }
        node.on("pointerdown", (e) => {
          e.stopPropagation();
          if (useWorldStore.getState().inputLocked) return;
          if (kind === "fountain") {
            const w = mapToWorld(prop.cell.x, prop.cell.y);
            amb.splash(w.x, w.y + TILE_H / 2 - 16, 14);
            amb.scatterPigeons();
            fountainClicks += 1;
            events.emit("toast", {
              message: WISHES[(fountainClicks - 1) % WISHES.length],
              kind: "info",
            });
            if (fountainClicks === 5) {
              useEggStore.getState().markFound("wishmaker");
              fountainShimmerUntil = elapsed + 3;
            }
          } else if (kind === "billboard") {
            events.emit("world_interact", { kind: "billboard" });
          } else if (kind === "plaque") {
            useEggStore.getState().markFound("founders_plaque");
            events.emit("world_interact", { kind: "plaque" });
          } else if (kind === "bench") {
            events.emit("toast", { message: "Take five. The city hustles on.", kind: "info" });
          } else {
            amb.toggleLampAt(prop.cell); // lamp / lamp2
          }
        });
      }

      // A venue panel opening pops its building (200ms scale bounce).
      let venuePop: { node: Container; t: number } | null = null;
      const offVenueOpened = events.on("venue_opened", (id) => {
        const node = venueNodes.get(id);
        if (node && !reduced) venuePop = { node, t: 0 };
      });

      // ── Input: click-to-move ──────────────────────────────────────────────
      const pathLine = new Graphics();
      world.addChild(pathLine);
      application.stage.eventMode = "static";
      application.stage.hitArea = application.screen;
      application.stage.on("pointerdown", (e) => {
        if (useWorldStore.getState().inputLocked) return;
        const local = world.toLocal(e.global);
        const goal = roundCell(worldToMap(local.x, local.y));
        if (!cityGrid.isWalkable(goal.x, goal.y)) return;
        const path = findPath(cityGrid, curCell, goal);
        if (path.length <= 1) return;
        pathTargets = path.slice(1);
        drawPathPreview(pathLine, charPixel, pathTargets);
      });

      // ── Ticker ────────────────────────────────────────────────────────────
      application.ticker.add((ticker) => {
        const dt = ticker.deltaMS / 1000;
        elapsed += dt;
        const locked = useWorldStore.getState().inputLocked;
        const prevX = charPixel.x;
        const prevY = charPixel.y;

        // WASD / arrows — screen-relative direct drive (overrides click path).
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
            drawPathPreview(pathLine, charPixel, pathTargets);
          } else {
            charPixel.x += (ddx / dist) * step;
            charPixel.y += (ddy / dist) * step;
          }
        }

        // Character animation: facing from the dominant map-axis of this frame's
        // motion (same convention as the cars' legDir), 2-frame stride + bob.
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
            amb.spawnDust(charPixel.x, charPixel.y + 1); // footstep puff
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
        charBody.scale.x = facing === "W" ? -1 : 1; // W = mirrored E profile

        char.position.set(charPixel.x, charPixel.y);
        const cell = roundCell(worldToMap(charPixel.x, charPixel.y));
        char.zIndex = cell.x + cell.y + 0.6;
        if (cell.x !== curCell.x || cell.y !== curCell.y) {
          curCell = cell;
          store.setCharCell(curCell);
        }

        // Ambient life: NPCs, vehicles, particles, pigeons — one call, culled to view.
        view.left = -world.position.x;
        view.top = -world.position.y;
        view.right = view.left + application.screen.width;
        view.bottom = view.top + application.screen.height;
        amb.update(dt, elapsed, view, curCell);

        // Atmosphere: day/night tint, window lights, marker pulse, drifting clouds.
        sky.width = application.screen.width;
        sky.height = application.screen.height;
        if (!reduced) {
          const phase = dayPhase(elapsed + BOOT_PHASE_OFFSET_S);
          ground.tint = phase.ambient;
          actors.tint = phase.ambient;
          sky.tint = phase.ambient;
          amb.setNight(phase.nightness);
          for (let i = 0; i < windowLights.length; i++) {
            windowLights[i].alpha =
              phase.nightness * (0.55 + 0.12 * Math.sin(elapsed * 3 + i * 1.7));
          }
          for (let i = 0; i < markers.length; i++) {
            markers[i].scale.set(1 + 0.12 * Math.sin(elapsed * 2.2 + i));
          }
          for (let i = 0; i < clouds.length; i++) {
            const s = clouds[i];
            s.position.x += (10 + i * 3) * dt;
            s.position.y += (5 + i * 2) * dt;
            if (s.position.x > 3400) s.position.x = -3400;
            if (s.position.y > 3200) s.position.y = -400;
          }
          if (pathTargets.length > 0) pathLine.alpha = 0.75 + 0.25 * Math.sin(elapsed * 5);
        }

        // Wishmaker shimmer: the fountain glints gold for a few seconds.
        if (fountainNode) {
          fountainNode.tint =
            elapsed < fountainShimmerUntil
              ? lerpColor(0xffffff, 0xe2be78, 0.5 + 0.5 * Math.sin(elapsed * 12))
              : 0xffffff;
        }

        // Venue pop: 200ms scale bounce on the building whose panel just opened.
        if (venuePop) {
          venuePop.t += dt;
          if (venuePop.t >= 0.2) {
            venuePop.node.scale.set(1);
            venuePop = null;
          } else {
            venuePop.node.scale.set(1 + 0.035 * Math.sin((venuePop.t / 0.2) * Math.PI));
          }
        }

        // Camera: soft-lag follow, centered on the character.
        const txx = application.screen.width / 2 - charPixel.x;
        const tyy = application.screen.height / 2 - charPixel.y;
        world.position.x += (txx - world.position.x) * Math.min(1, dt * 6);
        world.position.y += (tyy - world.position.y) * Math.min(1, dt * 6);

        const near = venueNear(curCell);
        if ((near?.id ?? null) !== lastNear) {
          lastNear = near?.id ?? null;
          store.setNearVenue(lastNear);
        }
      });

      store.setCharCell(curCell);
      offBus.push(offVenueOpened);
      onReady?.();
    })();

    return () => {
      destroyed = true;
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      store.setNearVenue(null);
      offBus.forEach((off) => off());
      offBus.length = 0;
      ambient?.dispose(); // detaches + frees its sprites/textures before the app teardown
      ambient = null;
      if (app) app.destroy(true, { children: true });
      destroyTextures(bakedTextures); // baked RenderTextures aren't freed by app.destroy
      bakedTextures = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={mountRef} className="absolute inset-0" />;
}

// ── Ground helpers ────────────────────────────────────────────────────────────

function groundTexture(x: number, y: number) {
  if (isRoad(x, y)) {
    const onNS = x % 11 === 0; // vertical avenue (constant x)
    const onEW = y % 11 === 0;
    return tex(roadTile(onNS, onEW, CROSSWALKS.has(`${x},${y}`)));
  }
  const d = districtAt(x, y);
  const variety = DISTRICT_VARIETY[d];
  const pick = variety[(x * 7 + y * 13) % variety.length];
  return tex(pick ?? DISTRICT_GROUND[d]);
}

function skirtFor(x: number, y: number): number {
  if (isRoad(x, y)) return groundSkirt("road_ew");
  const d = districtAt(x, y);
  const variety = DISTRICT_VARIETY[d];
  const pick = variety[(x * 7 + y * 13) % variety.length];
  return groundSkirt(pick ?? DISTRICT_GROUND[d]);
}

// ── Buildings ─────────────────────────────────────────────────────────────────

interface BuildingParts {
  root: Container;
  /** Entrance marker, self-centered so the ticker can pulse its scale. */
  marker: Graphics;
  /** Warm window-glow sprites (lit by nightness in the ticker). */
  lights: Sprite[];
}

function makeBuilding(v: CityBuilding, windowTex: Texture | null): BuildingParts {
  const visual = VENUE_VISUAL[v.id] ?? FILLER_VISUALS[0];
  const c = makeBuildingVisual(visual, v.footprintTiles, v.kind === "locked" ? 0x9aa0ad : null);

  // Night window lights, placed from the visual's bounds (before the label).
  const lights: Sprite[] = [];
  if (windowTex && v.kind !== "locked") {
    const vb = c.getLocalBounds();
    const height = vb.maxY - vb.minY;
    const spots =
      visual.type === "stack"
        ? [
            { x: vb.minX * 0.32, y: vb.minY + height * 0.38 },
            { x: vb.maxX * 0.28, y: vb.minY + height * 0.58 },
          ]
        : [{ x: vb.minX * 0.2, y: vb.minY + height * 0.55 }];
    for (const spot of spots) {
      const s = new Sprite(windowTex);
      s.anchor.set(0.5);
      s.blendMode = "add";
      s.alpha = 0;
      s.position.set(spot.x, spot.y);
      c.addChild(s);
      lights.push(s);
    }
  }

  // Name label above the building.
  const label = new Text({
    text: v.kind === "locked" ? `${v.displayName} 🔒` : v.displayName,
    style: {
      fill: 0xffffff,
      stroke: { color: 0x1a1e2a, width: 3 },
      fontFamily: "Outfit, sans-serif",
      fontSize: 14,
      fontWeight: "600",
    },
  });
  label.anchor.set(0.5, 1);
  const top = c.getLocalBounds();
  label.position.set(0, top.minY - 6);
  c.addChild(label);

  // Gold entrance marker on the entrance tile (own origin → pulsable).
  const ent = mapToWorld(v.entranceTile.x, v.entranceTile.y);
  const front = frontVertex(v.footprintTiles);
  const marker = new Graphics();
  marker.circle(0, 0, 5).fill({ color: 0xe2be78, alpha: v.interactable ? 0.95 : 0.4 });
  marker.circle(0, 0, 8).stroke({ color: 0xe2be78, alpha: 0.5, width: 2 });
  marker.position.set(ent.x - front.x, ent.y - front.y);
  c.addChild(marker);

  return { root: c, marker, lights };
}

/** Compose a building visual scaled to its footprint, positioned at the footprint's
 * front (screen-bottom) vertex, zIndexed for the y-sort. `tint` grays out locked venues. */
function makeBuildingVisual(
  visual: VenueVisual,
  footprint: Cell[],
  tint: number | null,
): Container {
  const container = new Container();
  const front = frontVertex(footprint);
  container.position.set(front.x, front.y);

  const w = Math.max(...footprint.map((t) => t.x)) - Math.min(...footprint.map((t) => t.x)) + 1;
  const h = Math.max(...footprint.map((t) => t.y)) - Math.min(...footprint.map((t) => t.y)) + 1;
  const desiredW = 0.8 * (w + h) * (TILE_H / 2) * 2; // cover ~80% of the footprint's on-screen width

  const inner = new Container();
  if (visual.type === "single") {
    const s = new Sprite(tex(visual.key));
    s.anchor.set(0.5, 1);
    inner.addChild(s);
    inner.scale.set(desiredW / 132);
  } else {
    const pieces: Sprite[] = [];
    const g = new Sprite(tex(visual.ground));
    g.anchor.set(0.5, 1);
    pieces.push(g);
    visual.floors.forEach((f, i) => {
      const s = new Sprite(tex(f));
      s.anchor.set(0.5, 1);
      s.position.y = -STORY_H * (i + 1);
      pieces.push(s);
    });
    const roof = new Sprite(tex(visual.roof));
    roof.anchor.set(0.5, 1);
    roof.position.y = -STORY_H * (visual.floors.length + 1);
    pieces.push(roof);
    pieces.forEach((p) => inner.addChild(p));
    inner.scale.set(desiredW / 99);
  }
  if (tint !== null) inner.children.forEach((ch) => ((ch as Sprite).tint = tint));
  container.addChild(inner);
  container.zIndex = Math.max(...footprint.map((t) => t.x + t.y)) + 0.5;
  return container;
}

/** Vertical sky gradient (blue → horizon green), baked once and screen-scaled. */
function bakeSkyTexture(renderer: Renderer): Texture {
  const g = new Graphics();
  const steps = 24;
  for (let i = 0; i < steps; i++) {
    g.rect(0, i * 8, 8, 8).fill(lerpColor(0xaee0f2, 0x9dc183, i / (steps - 1)));
  }
  const t = renderer.generateTexture({ target: g });
  g.destroy();
  return t;
}

/** World position of a footprint's front (screen-bottom) diamond vertex. */
function frontVertex(footprint: Cell[]): { x: number; y: number } {
  const maxDepth = Math.max(...footprint.map((t) => t.x + t.y));
  const frontCells = footprint.filter((t) => t.x + t.y === maxDepth);
  const cx = frontCells.reduce((s, t) => s + t.x, 0) / frontCells.length;
  const cy = frontCells.reduce((s, t) => s + t.y, 0) / frontCells.length;
  const p = mapToWorld(cx, cy);
  return { x: p.x, y: p.y + TILE_H / 2 };
}

// ── Props ─────────────────────────────────────────────────────────────────────

function makeProp(p: CityProp): Container {
  const c = mapToWorld(p.cell.x, p.cell.y);
  if (p.kind === "plaque") return makePlaque(p, c);
  const key = PROP_TEXTURE[p.kind] ?? "prop_lamp";
  const s = new Sprite(tex(key));
  s.anchor.set(0.5, 1);
  if (GROUND_PROPS.has(p.kind)) {
    // full ground tile — replace look by drawing over the base tile
    s.position.set(c.x, c.y + TILE_H / 2 + groundSkirt(key));
    s.zIndex = p.cell.x + p.cell.y - 0.1;
  } else {
    s.scale.set(PROP_SCALE[p.kind] ?? 1);
    s.position.set(c.x, c.y + TILE_H / 2);
    s.zIndex = p.cell.x + p.cell.y;
  }
  return s;
}

/** Founders' plaque — procedural stone plinth with a gold face (no sprite). */
function makePlaque(p: CityProp, c: { x: number; y: number }): Container {
  const container = new Container();
  const g = new Graphics();
  g.ellipse(0, 0, 14, 6).fill({ color: 0x000000, alpha: 0.25 });
  g.roundRect(-11, -24, 22, 24, 3).fill(0x8b8f9a).stroke({ color: 0x1a1e2a, alpha: 0.5, width: 1 });
  g.roundRect(-8, -21, 16, 12, 2).fill(0xe2be78);
  g.rect(-6, -18, 12, 1.5).fill({ color: 0x1a1e2a, alpha: 0.35 });
  g.rect(-6, -15, 12, 1.5).fill({ color: 0x1a1e2a, alpha: 0.35 });
  container.addChild(g);
  container.position.set(c.x, c.y + TILE_H / 2 - 2);
  container.zIndex = p.cell.x + p.cell.y;
  return container;
}

// ── Path preview ──────────────────────────────────────────────────────────────

function drawPathPreview(line: Graphics, _from: { x: number; y: number }, targets: Cell[]): void {
  line.clear();
  if (targets.length === 0) return;
  // Gold dotted trail with a ringed destination (the ticker pulses line alpha).
  targets.forEach((cc, i) => {
    const w = mapToWorld(cc.x, cc.y);
    const fade = 0.4 + 0.5 * (i / Math.max(1, targets.length - 1));
    line.circle(w.x, w.y - TILE_H / 4, 3).fill({ color: 0xe2be78, alpha: fade });
  });
  const last = mapToWorld(targets[targets.length - 1].x, targets[targets.length - 1].y);
  line.circle(last.x, last.y - TILE_H / 4, 8).stroke({ color: 0xe2be78, alpha: 0.9, width: 2 });
  line.circle(last.x, last.y - TILE_H / 4, 3.5).fill({ color: 0xe2be78, alpha: 1 });
}
