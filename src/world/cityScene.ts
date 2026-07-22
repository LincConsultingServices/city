// CityScene — owns the Pixi world graph, the render loop, input, and camera. It
// is the single place that bridges to React state (PRD §12.2): the ticker READS
// worldStore.getState() and WRITES only-on-change (nearestVenue, characterState)
// — React never re-renders the world. Ported in spirit from the Godot F0 city/*.

import { Application, Container, Graphics, type Ticker } from 'pixi.js';
import { mapToWorld, worldToCell, type Cell, type Point } from '@/lib/iso';
import { findPath, type Grid } from '@/lib/pathfind';
import { allManifests, type BuildingManifest } from '@/framework/building';
import { useWorldStore } from '@/framework/stores/worldStore';
import { useUiStore } from '@/framework/stores/uiStore';
import { events } from '@/framework/events';
import { enterBuilding } from '@/framework/venue';
import { buildGround } from './tilemap';
import { createExterior, type ExteriorHandle } from './buildingLayer';
import { createCharacter } from './character';
import { viewport } from './viewport';
import {
  GRID_W,
  GRID_H,
  SPAWN,
  FOUNTAIN,
  TREES,
  LAMPS,
  BENCHES,
  CARS,
  DECO_BUILDINGS,
} from './cityMap';
import { makeTree, makeLamp, makeFountain, makeBench, makeCar } from './props';
import { makeDecoBuilding } from './decoBuildings';

const WALK_SPEED = 210; // world px / sec
const CAMERA_LERP = 0.14;
const PAN_LERP = 0.18;
const DRAG_THRESHOLD = 6; // px — below this a pointer up is a click, not a drag
const ENTER_RANGE = 1; // cells (manhattan) to a venue entrance
const SCALES = [0.85, 0.6, 0.42]; // street ↔ block ↔ district (PRD §6.2)

const manhattan = (a: Cell, b: Cell) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

export class CityScene {
  private readonly app: Application;
  private readonly world = new Container();
  private readonly entities = new Container();
  private readonly character: Container;
  private readonly marker = new Graphics();
  private readonly exteriors: ExteriorHandle[] = [];
  private readonly manifests: BuildingManifest[];
  private readonly blocked: Set<string>;
  private readonly grid: Grid;

  private charCell: Cell = { ...SPAWN };
  private charPos: Point = mapToWorld(SPAWN);
  private localPath: Cell[] = [];
  private pan = { x: 0, y: 0 };

  private readonly keys = new Set<string>();
  private pointerDown = false;
  private dragging = false;
  private dragStart = { x: 0, y: 0 };
  private panStart = { x: 0, y: 0 };

  private lastNearestKey = '';
  private lastCharState = '';
  private disposed = false;
  private unsubTarget: () => void = () => {};

  constructor(app: Application) {
    this.app = app;

    // Ground (bottom), a click marker, then the y-sorted entity layer.
    this.world.addChild(buildGround());
    this.marker.visible = false;
    this.world.addChild(this.marker);
    this.entities.sortableChildren = true;
    this.world.addChild(this.entities);

    this.manifests = allManifests();
    this.blocked = new Set<string>();

    // Decorative (non-venue) buildings — block their footprint.
    for (const deco of DECO_BUILDINGS) {
      for (const cell of deco.cells) this.blocked.add(`${cell.x},${cell.y}`);
      this.entities.addChild(makeDecoBuilding(deco).container);
    }

    // Venue exteriors from manifests (the enterable buildings).
    for (const m of this.manifests) {
      for (const t of m.exterior.footprintTiles) this.blocked.add(`${t[0]},${t[1]}`);
      const ext = createExterior(m);
      this.exteriors.push(ext);
      this.entities.addChild(ext.container);
    }

    // Props — real Kenney trees + procedural fountain/lamps/benches/cars. Solid
    // props (fountain, trees) block their cell; small ones (lamps/benches/cars)
    // stay walkable so pathing never traps the player.
    this.entities.addChild(makeFountain(FOUNTAIN));
    this.blocked.add(`${FOUNTAIN.x},${FOUNTAIN.y}`);
    for (const cell of TREES) {
      this.entities.addChild(makeTree(cell));
      this.blocked.add(`${cell.x},${cell.y}`);
    }
    for (const cell of LAMPS) this.entities.addChild(makeLamp(cell));
    for (const cell of BENCHES) this.entities.addChild(makeBench(cell));
    for (const car of CARS) this.entities.addChild(makeCar(car));

    this.grid = {
      width: GRID_W,
      height: GRID_H,
      walkable: (x, y) => !this.blocked.has(`${x},${y}`),
    };

    this.character = createCharacter();
    this.character.position.set(this.charPos.x, this.charPos.y);
    this.entities.addChild(this.character);

    this.app.stage.addChild(this.world);
    this.centerCameraImmediate();

    // Input.
    const canvas = this.app.canvas;
    canvas.addEventListener('pointerdown', this.onPointerDown);
    canvas.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('pointerup', this.onPointerUp);
    canvas.addEventListener('wheel', this.onWheel, { passive: false });
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);

    // Recompute a path whenever the store target changes (from a click).
    this.unsubTarget = useWorldStore.subscribe((s, prev) => {
      if (s.target && s.target !== prev.target) {
        this.localPath = findPath(this.grid, this.charCell, s.target);
        this.showMarker(s.target);
        useWorldStore.getState().setTarget(null);
      }
    });

    this.app.ticker.add(this.update);
  }

  // ── Input handlers ──────────────────────────────────────────────────────────
  private overlayOpen(): boolean {
    return useUiStore.getState().activeOverlay !== null;
  }

  private onPointerDown = (e: PointerEvent): void => {
    if (this.overlayOpen()) return;
    this.pointerDown = true;
    this.dragging = false;
    this.dragStart = { x: e.offsetX, y: e.offsetY };
    this.panStart = { ...this.pan };
  };

  private onPointerMove = (e: PointerEvent): void => {
    if (!this.pointerDown) return;
    const dx = e.offsetX - this.dragStart.x;
    const dy = e.offsetY - this.dragStart.y;
    if (!this.dragging && Math.hypot(dx, dy) > DRAG_THRESHOLD) this.dragging = true;
    if (this.dragging) {
      const leashX = this.app.screen.width * 1.5;
      const leashY = this.app.screen.height * 1.5;
      this.pan.x = Math.max(-leashX, Math.min(leashX, this.panStart.x + dx));
      this.pan.y = Math.max(-leashY, Math.min(leashY, this.panStart.y + dy));
    }
  };

  private onPointerUp = (e: PointerEvent): void => {
    if (!this.pointerDown) return;
    this.pointerDown = false;
    if (this.dragging || this.overlayOpen()) return;
    // A click → move there.
    const world = {
      x: (e.offsetX - viewport.offsetX) / viewport.scale,
      y: (e.offsetY - viewport.offsetY) / viewport.scale,
    };
    const cell = worldToCell(world);
    if (cell.x < 0 || cell.y < 0 || cell.x >= GRID_W || cell.y >= GRID_H) return;
    useWorldStore.getState().setTarget(cell);
  };

  private onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    if (this.overlayOpen()) return;
    const step = useWorldStore.getState().zoomStep + (e.deltaY > 0 ? 1 : -1);
    useWorldStore.getState().setZoomStep(step);
  };

  private onKeyDown = (e: KeyboardEvent): void => {
    const k = e.key.toLowerCase();
    if (this.overlayOpen()) return;
    if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) {
      this.keys.add(k);
      this.localPath = []; // WASD overrides click-to-move (PRD §6.3)
    }
    if (k === 'e' || k === 'enter') this.tryEnter();
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    this.keys.delete(e.key.toLowerCase());
  };

  private tryEnter(): void {
    const near = useWorldStore.getState().nearestVenue;
    if (!near || !near.inRange) return;
    const m = this.manifests.find((x) => x.id === near.id);
    if (!m) return;
    if (!m.enabled) {
      events.emit('toast_requested', {
        message: `${m.displayName} is locked for now.`,
        level: 'info',
      });
      return;
    }
    enterBuilding(m);
  }

  // ── Frame update ─────────────────────────────────────────────────────────────
  private update = (ticker: Ticker): void => {
    if (this.disposed) return;
    const dt = Math.min(ticker.deltaMS / 1000, 0.05); // clamp big hitches
    if (!this.overlayOpen()) {
      this.step(dt);
    }
    this.updateCamera();
    this.updateNearestVenue();
  };

  private step(dt: number): void {
    const moved = this.moveByKeys(dt);
    if (!moved) this.moveAlongPath(dt);

    this.character.position.set(this.charPos.x, this.charPos.y);
    this.character.zIndex = this.charPos.y;

    const walking = moved || this.localPath.length > 0;
    const state = walking ? 'walk' : 'idle';
    if (state !== this.lastCharState) {
      this.lastCharState = state;
      useWorldStore.getState().setCharacterState(state);
    }
  }

  private moveByKeys(dt: number): boolean {
    const v = WALK_SPEED * dt;
    let dx = 0;
    let dy = 0;
    if (this.keys.has('w') || this.keys.has('arrowup')) dy -= v;
    if (this.keys.has('s') || this.keys.has('arrowdown')) dy += v;
    if (this.keys.has('a') || this.keys.has('arrowleft')) dx -= v;
    if (this.keys.has('d') || this.keys.has('arrowright')) dx += v;
    if (dx === 0 && dy === 0) return false;

    const tentative = { x: this.charPos.x + dx, y: this.charPos.y + dy };
    const cell = worldToCell(tentative);
    if (this.grid.walkable(cell.x, cell.y)) {
      this.charPos = tentative;
      this.charCell = cell;
    }
    return true;
  }

  private moveAlongPath(dt: number): void {
    if (this.localPath.length === 0) return;
    const next = this.localPath[0]!;
    const goal = mapToWorld(next);
    const dx = goal.x - this.charPos.x;
    const dy = goal.y - this.charPos.y;
    const dist = Math.hypot(dx, dy);
    const step = WALK_SPEED * dt;
    if (dist <= step || dist === 0) {
      this.charPos = goal;
      this.charCell = next;
      this.localPath.shift();
      if (this.localPath.length === 0) this.marker.visible = false;
    } else {
      this.charPos = {
        x: this.charPos.x + (dx / dist) * step,
        y: this.charPos.y + (dy / dist) * step,
      };
    }
  }

  private updateCamera(): void {
    const scale = SCALES[useWorldStore.getState().zoomStep] ?? SCALES[0]!;
    const w = this.app.screen.width;
    const h = this.app.screen.height;

    // Snap the pan back toward 0 while the character is moving (PRD §6.2).
    if (this.localPath.length > 0 || this.keys.size > 0) {
      this.pan.x += (0 - this.pan.x) * PAN_LERP;
      this.pan.y += (0 - this.pan.y) * PAN_LERP;
    }

    const desiredX = w / 2 - this.charPos.x * scale + this.pan.x;
    const desiredY = h * 0.55 - this.charPos.y * scale + this.pan.y;

    this.world.scale.set(scale);
    this.world.position.set(
      this.world.position.x + (desiredX - this.world.position.x) * CAMERA_LERP,
      this.world.position.y + (desiredY - this.world.position.y) * CAMERA_LERP,
    );

    viewport.scale = scale;
    viewport.offsetX = this.world.position.x;
    viewport.offsetY = this.world.position.y;
    viewport.width = w;
    viewport.height = h;
  }

  private updateNearestVenue(): void {
    let bestId = '';
    let bestDist = Infinity;
    for (const ext of this.exteriors) {
      const d = manhattan(this.charCell, ext.entrance);
      if (d <= ENTER_RANGE && d < bestDist) {
        bestDist = d;
        bestId = ext.id;
      }
    }
    const nextKey = bestId ? `${bestId}:1` : '';
    if (nextKey !== this.lastNearestKey) {
      this.lastNearestKey = nextKey;
      useWorldStore.getState().setNearestVenue(bestId ? { id: bestId, inRange: true } : null);
    }
  }

  private centerCameraImmediate(): void {
    const scale = SCALES[0]!;
    this.world.scale.set(scale);
    this.world.position.set(
      this.app.screen.width / 2 - this.charPos.x * scale,
      this.app.screen.height * 0.55 - this.charPos.y * scale,
    );
    viewport.scale = scale;
    viewport.offsetX = this.world.position.x;
    viewport.offsetY = this.world.position.y;
  }

  private showMarker(cell: Cell): void {
    const p = mapToWorld(cell);
    this.marker.clear();
    this.marker
      .poly([p.x, p.y - 14, p.x + 26, p.y, p.x, p.y + 14, p.x - 26, p.y])
      .stroke({ width: 2, color: 0xf2c14e, alpha: 0.9 });
    this.marker.visible = true;
  }

  destroy(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.app.ticker.remove(this.update);
    this.unsubTarget?.();
    const canvas = this.app.canvas;
    canvas.removeEventListener('pointerdown', this.onPointerDown);
    canvas.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp);
    canvas.removeEventListener('wheel', this.onWheel);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    this.world.destroy({ children: true });
  }
}
