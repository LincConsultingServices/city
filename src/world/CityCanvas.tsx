// <CityCanvas> — the ONE component that owns a PIXI.Application (PRD §12.2). React
// never re-renders the world; the Pixi ticker drives motion and publishes the
// character cell + nearby venue to the world store for the DOM UI. Renders the
// Kenney-sprite city: district ground + street tiles, stacked venue buildings,
// filler blocks, props (trees/lamps/fountain) and ambient vehicles on road loops.
import { useEffect, useRef } from "react";
import { Application, Container, Graphics, Sprite, Text, type Texture } from "pixi.js";
import { mapToWorld, worldToMap, roundCell, TILE_W, TILE_H } from "@/lib/iso";
import { findPath, type Cell } from "@/lib/pathfinding";
import { prefersReducedMotion } from "@/lib/motion";
import {
  bakePersonTextures,
  bakeShadowTexture,
  destroyTextures,
  PLAYER_PALETTE,
} from "./characterArt";
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
  carTexture,
  type VenueVisual,
  type CarKind,
  type Cardinal,
} from "./assets";
import { useWorldStore } from "./worldStore";

const WALK_SPEED = 175; // px/sec (≈1.3 tiles/sec on the 132px grid)
const CAR_SPEED_CELLS = 1.6; // cells/sec
const STEP_S = 0.18; // seconds per walk-cycle frame
const MOVE_KEYS = new Set(["w", "a", "s", "d", "arrowup", "arrowleft", "arrowdown", "arrowright"]);

interface CarState {
  kind: CarKind;
  route: Cell[]; // closed loop of road cells (corners)
  leg: number;
  t: number; // 0..1 along current leg
  sprite: Sprite;
}

export function CityCanvas({ onReady }: { onReady?: () => void }) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let destroyed = false;
    let app: Application | null = null;
    let bakedTextures: Texture[] = [];
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

      for (const v of VENUES) actors.addChild(makeBuilding(v));
      FILLERS.forEach((f) => {
        const visual = FILLER_VISUALS[f.visualIndex % FILLER_VISUALS.length];
        const t0 = f.footprintTiles[0];
        const wash = f.tint ?? FILLER_TINTS[(t0.x * 7 + t0.y * 13) % FILLER_TINTS.length];
        actors.addChild(
          makeBuildingVisual(visual, f.footprintTiles, wash === 0xffffff ? null : wash),
        );
      });
      for (const p of PROPS) actors.addChild(makeProp(p));

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
      let elapsed = 0;

      // Ambient vehicles on closed road loops (PRD §6.4: well under the ≤6 budget).
      const cars: CarState[] = [
        {
          kind: "taxi",
          route: [c2(11, 11), c2(33, 11), c2(33, 33), c2(11, 33)],
          leg: 0,
          t: 0,
          sprite: new Sprite(),
        },
        {
          kind: "police",
          route: [c2(0, 0), c2(44, 0), c2(44, 44), c2(0, 44)],
          leg: 0,
          t: 0.5,
          sprite: new Sprite(),
        },
        {
          kind: "amb",
          route: [c2(22, 11), c2(33, 11), c2(33, 22), c2(22, 22)],
          leg: 2,
          t: 0,
          sprite: new Sprite(),
        },
        {
          kind: "taxi",
          route: [c2(0, 22), c2(22, 22), c2(22, 44), c2(0, 44)],
          leg: 1,
          t: 0.3,
          sprite: new Sprite(),
        },
      ];
      for (const car of cars) {
        car.sprite.anchor.set(0.5, 1);
        car.sprite.scale.set(1.45);
        actors.addChild(car.sprite);
      }

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
          charBody.texture = playerTex.walk[facing][Math.floor(stepClock / STEP_S) % 2];
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

        // Vehicles: advance along their loops (cell-space lerp → world).
        for (const car of cars) {
          const a = car.route[car.leg];
          const b = car.route[(car.leg + 1) % car.route.length];
          const legLen = Math.abs(b.x - a.x) + Math.abs(b.y - a.y);
          car.t += (CAR_SPEED_CELLS * dt) / Math.max(1, legLen);
          if (car.t >= 1) {
            car.t -= 1;
            car.leg = (car.leg + 1) % car.route.length;
          }
          const aa = car.route[car.leg];
          const bb = car.route[(car.leg + 1) % car.route.length];
          const cx = aa.x + (bb.x - aa.x) * car.t;
          const cy = aa.y + (bb.y - aa.y) * car.t;
          const w = mapToWorld(cx, cy);
          car.sprite.texture = carTexture(car.kind, legDir(aa, bb));
          car.sprite.position.set(w.x, w.y + 14);
          car.sprite.zIndex = cx + cy + 0.3;
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
      onReady?.();
    })();

    return () => {
      destroyed = true;
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      store.setNearVenue(null);
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

const c2 = (x: number, y: number): Cell => ({ x, y });

function legDir(a: Cell, b: Cell): Cardinal {
  if (b.x > a.x) return "E";
  if (b.x < a.x) return "W";
  if (b.y > a.y) return "S";
  return "N";
}

// ── Buildings ─────────────────────────────────────────────────────────────────

function makeBuilding(v: CityBuilding): Container {
  const visual = VENUE_VISUAL[v.id] ?? FILLER_VISUALS[0];
  const c = makeBuildingVisual(visual, v.footprintTiles, v.kind === "locked" ? 0x9aa0ad : null);

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

  // Gold entrance marker on the entrance tile.
  const ent = mapToWorld(v.entranceTile.x, v.entranceTile.y);
  const front = frontVertex(v.footprintTiles);
  const marker = new Graphics();
  marker
    .circle(ent.x - front.x, ent.y - front.y, 5)
    .fill({ color: 0xe2be78, alpha: v.interactable ? 0.95 : 0.4 });
  marker
    .circle(ent.x - front.x, ent.y - front.y, 8)
    .stroke({ color: 0xe2be78, alpha: 0.5, width: 2 });
  c.addChild(marker);

  return c;
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

function drawPathPreview(line: Graphics, from: { x: number; y: number }, targets: Cell[]): void {
  line.clear();
  if (targets.length === 0) return;
  line.moveTo(from.x, from.y - TILE_H / 4);
  for (const cc of targets) {
    const w = mapToWorld(cc.x, cc.y);
    line.lineTo(w.x, w.y - TILE_H / 4);
  }
  line.stroke({ width: 3, color: 0xffffff, alpha: 0.55 });
  const last = mapToWorld(targets[targets.length - 1].x, targets[targets.length - 1].y);
  line.circle(last.x, last.y - TILE_H / 4, 5).fill({ color: 0xffffff, alpha: 0.8 });
}
