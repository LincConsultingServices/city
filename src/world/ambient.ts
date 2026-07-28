// The ambient life system — everything that makes the city hustle without the
// player doing anything: pedestrian NPCs on sidewalk loops, vehicles, a shared
// particle pool (dust/leaves/droplets/smoke), fountain/chimney/steam emitters,
// park birds, plaza pigeons and night-time lamp glows. One `update()` call per
// Pixi tick drives it all; everything is seeded so the street life is identical
// run to run. Owned by CityCanvas; never touches React or the DOM.
import { Container, Graphics, Sprite, Texture, type Renderer } from "pixi.js";
import { mapToWorld, TILE_H, TILE_W } from "@/lib/iso";
import { findPath, type Cell } from "@/lib/pathfinding";
import { mulberry32, seedFromString } from "@/lib/rng";
import { events } from "@/framework/events";
import { useEggStore } from "@/framework/eggStore";
import { PROPS, cityGrid } from "./cityMap";
import { carTexture, tex, type CarKind, type Cardinal } from "./assets";
import { npcRoutes, type NpcRoute } from "./routes";
import {
  bakePersonTextures,
  bakeShadowTexture,
  destroyTextures,
  NPC_PALETTES,
  type PersonTextures,
} from "./characterArt";
import {
  NPC_COUNT,
  NPC_COUNT_REDUCED,
  CAR_COUNT,
  CAR_COUNT_REDUCED,
  MAX_PARTICLES,
} from "./budgets";

const NPC_STEP_S = 0.22; // pedestrian stride is a touch lazier than the player's
const CAR_SPEED_CELLS = 1.6;
const CULL_MARGIN = 400; // px beyond the viewport before an actor stops rendering

export interface ViewRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface AmbientContext {
  renderer: Renderer;
  /** Y-sorted world container — NPCs/cars/pigeons live here. */
  actors: Container;
  /** Unsorted overlay above actors — particles, glows, birds. */
  fx: Container;
  reduced: boolean;
  /** World points where industrial chimney smoke rises. */
  smokeStacks: Array<{ x: number; y: number }>;
  /** World points where café steam wisps rise. */
  steamVents: Array<{ x: number; y: number }>;
}

export interface Ambient {
  update(dtS: number, nowS: number, view: ViewRect, playerCell: Cell): void;
  /** 0 = day … 1 = deepest night; drives lamp glows + flicker. */
  setNight(n: number): void;
  /** Toggle the lamp glow nearest to a map cell (lamp click). Returns new state. */
  toggleLampAt(cell: Cell): boolean;
  /** Puff of footstep dust at a world position (player steps). */
  spawnDust(x: number, y: number): void;
  /** Droplet burst at a world position (fountain splash). */
  splash(x: number, y: number, count: number): void;
  /** Send the plaza pigeons scattering (fountain-side click). */
  scatterPigeons(): void;
  /** Colorful confetti-ish burst at a world position (celebrations). */
  celebrate(x: number, y: number, count: number): void;
  /** NPC step-rate multiplier — the konami block party cranks it. */
  setTempo(multiplier: number): void;
  /** Tint every car (block party gold); null restores. */
  setCarTint(tint: number | null): void;
  readonly cars: ReadonlyArray<AmbientCar>;
  dispose(): void;
}

export interface AmbientCar {
  kind: CarKind;
  sprite: Sprite;
  route: Cell[];
  leg: number;
  t: number;
}

type ParticleKind = "dust" | "leaf" | "droplet" | "smoke" | "confetti" | "star";

interface Particle {
  sprite: Sprite;
  kind: ParticleKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  gravity: number;
  scaleRate: number;
  startAlpha: number;
  sway: number;
  baseScale: number;
  spin: number; // radians/sec — leaves and confetti tumble
}

interface Npc {
  route: NpcRoute;
  leg: number;
  t: number;
  root: Container;
  body: Sprite;
  tex: PersonTextures;
  stepClock: number;
  sideOffset: number; // perpendicular px — keeps walkers on the curb, not the lane
}

interface Pigeon {
  sprite: Sprite;
  home: { x: number; y: number };
  cell: Cell;
  state: "peck" | "fly" | "gone";
  t: number; // state clock
  vx: number;
  vy: number;
  returnAt: number;
}

/**
 * Roads run along the isometric axes — ±26.6° from horizontal on screen — but
 * the curated vehicle art is flat side-elevation: measured across all twenty
 * frames, every one sits within ±10° of horizontal. Drawn untilted they read as
 * sliding sideways across the road instead of driving along it.
 *
 * Tilting each sprite onto its lane fixes that. It is a cheat — a rotated side
 * view is not a true isometric projection — but at 60px on screen it reads
 * correctly, and the alternative is sourcing a whole new vehicle pack.
 */
const ISO_TILT = Math.atan2(TILE_H, TILE_W);

/** Which way a leg runs, and therefore which lane axis the body lies along. */
const legDir = (a: Cell, b: Cell): Cardinal => {
  if (b.x > a.x) return "E";
  if (b.x < a.x) return "W";
  if (b.y > a.y) return "S";
  return "N";
};

export function createAmbient(ctx: AmbientContext): Ambient {
  const { renderer, actors, fx, reduced } = ctx;
  const rand = mulberry32(seedFromString("city-ambient"));
  const baked: Texture[] = [];
  const bake = (g: Graphics): Texture => {
    const t = renderer.generateTexture({ target: g, resolution: 2 });
    g.destroy();
    baked.push(t);
    return t;
  };

  // ── Particle pool (pre-allocated; zero per-frame allocation) ────────────────
  // Real Kenney particle art (greyscale, tinted per kind) instead of the flat
  // vector discs this used to draw: a hard-edged circle scaled up reads as a
  // visible disc, never as smoke or dust.
  const particleTex: Record<ParticleKind, Texture> = {
    dust: tex("fx_dust"),
    leaf: tex("fx_leaf"),
    droplet: tex("fx_soft"),
    smoke: tex("fx_smoke"),
    confetti: tex("fx_confetti"),
    star: tex("fx_star"),
  };
  /** Base tint + on-screen size per particle kind (textures ship white). */
  const PARTICLE_STYLE: Record<ParticleKind, { tint: number; size: number }> = {
    dust: { tint: 0xcfc8b8, size: 16 },
    leaf: { tint: 0x6fae5c, size: 13 },
    droplet: { tint: 0xbfe3f2, size: 9 },
    smoke: { tint: 0xb9bcc4, size: 30 },
    confetti: { tint: 0xffffff, size: 14 },
    star: { tint: 0xffd75e, size: 18 },
  };
  const pool: Particle[] = [];
  const free: Particle[] = [];
  for (let i = 0; i < MAX_PARTICLES; i++) {
    const sprite = new Sprite(particleTex.dust);
    sprite.anchor.set(0.5);
    sprite.visible = false;
    fx.addChild(sprite);
    const p: Particle = {
      sprite,
      kind: "dust",
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      life: 0,
      maxLife: 1,
      gravity: 0,
      scaleRate: 0,
      startAlpha: 1,
      sway: 0,
      baseScale: 1,
      spin: 0,
    };
    pool.push(p);
    free.push(p);
  }

  function spawn(
    kind: ParticleKind,
    x: number,
    y: number,
    vx: number,
    vy: number,
    life: number,
    opts: {
      gravity?: number;
      scaleRate?: number;
      alpha?: number;
      sway?: number;
      scale?: number;
      tint?: number;
      spin?: number;
    },
  ): void {
    if (reduced) return; // decorative only — reduced motion kills all particles
    const p = free.pop();
    if (!p) return; // pool exhausted: drop the puff, never allocate
    p.kind = kind;
    p.x = x;
    p.y = y;
    p.vx = vx;
    p.vy = vy;
    p.life = 0;
    p.maxLife = life;
    p.gravity = opts.gravity ?? 0;
    p.scaleRate = opts.scaleRate ?? 0;
    p.startAlpha = opts.alpha ?? 1;
    p.sway = opts.sway ?? 0;
    const style = PARTICLE_STYLE[kind];
    p.sprite.texture = particleTex[kind];
    p.sprite.tint = opts.tint ?? style.tint;
    p.sprite.visible = true;
    p.sprite.alpha = p.startAlpha;
    // Textures are 48-96px source; normalise to the kind's on-screen size so
    // callers keep passing intuitive 1-ish scale multipliers.
    p.baseScale = (style.size / p.sprite.texture.width) * (opts.scale ?? 1);
    p.sprite.scale.set(p.baseScale);
    p.spin = opts.spin ?? 0;
    p.sprite.rotation = opts.spin ? rand() * Math.PI * 2 : 0;
    p.sprite.position.set(x, y);
  }

  const CONFETTI = [0xe2be78, 0x5fae6f, 0x4aa3c7, 0xd987b5, 0xf0954f, 0x8a6fd1];
  function celebrate(x: number, y: number, count: number): void {
    for (let i = 0; i < count; i++) {
      spawn("confetti", x, y - 20, (rand() - 0.5) * 220, -120 - rand() * 120, 1.1, {
        gravity: 260,
        alpha: 1,
        scale: 1.1,
        spin: (rand() - 0.5) * 12,
        tint: CONFETTI[i % CONFETTI.length],
      });
    }
  }

  // ── Pedestrians ─────────────────────────────────────────────────────────────
  const npcCount = reduced ? NPC_COUNT_REDUCED : NPC_COUNT;
  const npcTexSets = NPC_PALETTES.map((p) => {
    const t = bakePersonTextures(renderer, p);
    baked.push(...t.all);
    return t;
  });
  const shadowTex = bakeShadowTexture(renderer);
  baked.push(shadowTex);

  const npcs: Npc[] = npcRoutes(npcCount, seedFromString("city-npcs")).map((route, i) => {
    const tex = npcTexSets[i % npcTexSets.length];
    const root = new Container();
    const shadow = new Sprite(shadowTex);
    shadow.anchor.set(0.5, 0.5);
    shadow.scale.set(0.8);
    shadow.position.set(0, 1);
    const body = new Sprite(tex.idle.S);
    body.anchor.set(0.5, 1);
    body.scale.set(0.85);
    root.addChild(shadow, body);
    actors.addChild(root);
    return {
      route,
      leg: route.startLeg,
      t: route.startT,
      root,
      body,
      tex,
      stepClock: rand() * 10,
      sideOffset: (rand() < 0.5 ? -1 : 1) * (10 + rand() * 8),
    };
  });

  // ── Vehicles ────────────────────────────────────────────────────────────────
  const c2 = (x: number, y: number): Cell => ({ x, y });
  const carDefs: Array<{ kind: CarKind; route: Cell[]; leg: number; t: number }> = [
    { kind: "taxi", route: [c2(11, 11), c2(33, 11), c2(33, 33), c2(11, 33)], leg: 0, t: 0 },
    { kind: "police", route: [c2(0, 0), c2(44, 0), c2(44, 44), c2(0, 44)], leg: 0, t: 0.5 },
    { kind: "amb", route: [c2(22, 11), c2(33, 11), c2(33, 22), c2(22, 22)], leg: 2, t: 0 },
    { kind: "taxi", route: [c2(0, 22), c2(22, 22), c2(22, 44), c2(0, 44)], leg: 1, t: 0.3 },
    { kind: "garbage", route: [c2(22, 22), c2(44, 22), c2(44, 44), c2(22, 44)], leg: 3, t: 0.6 },
    { kind: "amb", route: [c2(0, 11), c2(22, 11), c2(22, 33), c2(0, 33)], leg: 2, t: 0.4 },
  ];
  const cars: AmbientCar[] = carDefs.slice(0, reduced ? CAR_COUNT_REDUCED : CAR_COUNT).map((d) => {
    const sprite = new Sprite();
    sprite.anchor.set(0.5, 1);
    // Vehicles are 31x23 source art on a 132px tile; 1.45x left them ~1/3 of a
    // lane. 1.9x reads as a real car — the pack has no higher-res tier, so this
    // trades a little sharpness for correct physical scale.
    sprite.scale.set(1.9);
    sprite.roundPixels = true;
    actors.addChild(sprite);
    return { ...d, sprite };
  });
  let carTint: number | null = null;

  // ── Lamp glows (lit by setNight; clickable lamps toggle them) ───────────────
  // A smooth radial blob, not the ringed "light" texture — concentric rings
  // read as glowing donuts once scaled up. Sized in world px, warm-tinted.
  const glowTex = tex("fx_soft");
  const GLOW_W = 78;
  const lampProps = PROPS.filter((p) => p.kind === "lamp" || p.kind === "lamp2");
  const lampGlows = lampProps.map((p) => {
    const w = mapToWorld(p.cell.x, p.cell.y);
    const s = new Sprite(glowTex);
    s.anchor.set(0.5);
    s.blendMode = "add";
    s.scale.set(GLOW_W / glowTex.width);
    s.tint = 0xffd08a;
    s.position.set(w.x, w.y + TILE_H / 2 - 46);
    s.alpha = 0;
    fx.addChild(s);
    return { sprite: s, cell: p.cell, on: true, phase: rand() * Math.PI * 2 };
  });
  let nightness = 0;

  // ── Emitter clocks ──────────────────────────────────────────────────────────
  const fountainProp = PROPS.find((p) => p.kind === "fountain");
  const fountainAt = fountainProp
    ? (() => {
        const w = mapToWorld(fountainProp.cell.x, fountainProp.cell.y);
        return { x: w.x, y: w.y + TILE_H / 2 - 14 };
      })()
    : null;
  let fountainClock = 0;
  let smokeClock = 0;
  let steamClock = 0;
  let leafClock = 0;

  // Leaves drift from the tree props in the parks/campus.
  const leafSources = PROPS.filter(
    (p) => p.kind === "tree_tall" || p.kind === "conifer" || p.kind === "tree_short",
  ).map((p) => {
    const w = mapToWorld(p.cell.x, p.cell.y);
    return { x: w.x, y: w.y - 30 };
  });

  // ── Birds — two flocks of three chevrons orbiting the parks ─────────────────
  // Birds read at distance as a gull silhouette, not the 1.6px "^" stroke this
  // used to draw — at that weight they looked like stray caret glyphs.
  const birdTex = bake(
    new Graphics()
      .moveTo(-9, 0)
      .quadraticCurveTo(-4.5, -5.5, 0, -1.5)
      .quadraticCurveTo(4.5, -5.5, 9, 0)
      .quadraticCurveTo(4.5, -2.5, 0, 1)
      .quadraticCurveTo(-4.5, -2.5, -9, 0)
      .fill({ color: 0x2c3240, alpha: 0.85 }),
  );
  const parkCenters = [mapToWorld(27.5, 16.5), mapToWorld(16.5, 27.5)];
  const birds = parkCenters.flatMap((center, f) =>
    Array.from({ length: 3 }, (_, i) => {
      const s = new Sprite(birdTex);
      s.anchor.set(0.5);
      fx.addChild(s);
      return {
        sprite: s,
        cx: center.x,
        cy: center.y - 150,
        rx: 120 + f * 40 + i * 14,
        ry: 46 + i * 6,
        speed: (0.25 + rand() * 0.15) * (f === 0 ? 1 : -1),
        phase: rand() * Math.PI * 2,
      };
    }),
  );

  // ── Pigeons pecking around the fountain plaza ───────────────────────────────
  // Pigeons were ~6px of grey ellipses — indistinguishable from image noise.
  const pigeonTex = bake(
    new Graphics()
      .ellipse(0, -4, 5.4, 4.2)
      .fill(0x9aa2b0)
      .ellipse(-4.2, -4.4, 2.8, 1.9)
      .fill(0x7d8595)
      .circle(4.2, -7.4, 2.7)
      .fill(0xa8b0bd)
      .circle(5.1, -7.9, 0.8)
      .fill(0x2b2f38)
      .poly([6.6, -7.2, 8.6, -6.4, 6.6, -6])
      .fill(0xe0a24a)
      .roundRect(-0.9, -1, 1.6, 3, 0.7)
      .fill(0xe0a24a),
  );
  const pigeonCells: Cell[] = [
    { x: 26, y: 16 },
    { x: 28, y: 18 },
    { x: 26, y: 18 },
    { x: 29, y: 16 },
  ];
  const pigeons: Pigeon[] = pigeonCells.map((cell) => {
    const w = mapToWorld(cell.x, cell.y);
    const home = { x: w.x + (rand() - 0.5) * 30, y: w.y + TILE_H / 2 - 4 };
    const s = new Sprite(pigeonTex);
    s.anchor.set(0.5, 1);
    s.position.set(home.x, home.y);
    s.zIndex = cell.x + cell.y + 0.2;
    actors.addChild(s);
    return { sprite: s, home, cell, state: "peck", t: rand() * 3, vx: 0, vy: 0, returnAt: 0 };
  });

  function scatterPigeons(): void {
    for (const p of pigeons) {
      if (p.state !== "peck") continue;
      p.state = "fly";
      p.t = 0;
      p.vx = (rand() - 0.5) * 160;
      p.vy = -90 - rand() * 60;
    }
  }

  // ── The Golden Fare: now and then a taxi gleams for a while — catch it ──────
  const goldenTaxi = cars.find((c) => c.kind === "taxi") ?? null;
  let goldenState: "waiting" | "golden" = "waiting";
  let goldenAt = 150 + rand() * 150;
  let goldenUntil = 0;
  let sparkleClock = 0;
  let nowClock = 0;
  if (goldenTaxi) {
    goldenTaxi.sprite.on("pointerdown", (e) => {
      if (goldenState !== "golden") return;
      e.stopPropagation();
      goldenState = "waiting";
      goldenAt = nowClock + 150 + rand() * 150;
      goldenTaxi.sprite.eventMode = "passive";
      goldenTaxi.sprite.cursor = "default";
      celebrate(goldenTaxi.sprite.position.x, goldenTaxi.sprite.position.y - 10, 18);
      useEggStore.getState().markFound("golden_taxi");
    });
  }

  // ── The campus cat: wanders the quad; click it and it walks with you ────────
  const catFrame = (tailUp: boolean): Graphics => {
    const g = new Graphics();
    g.ellipse(0, -3, 6, 3.2).fill(0x33303b); // body
    g.circle(5, -6, 2.6).fill(0x33303b); // head
    g.poly([3.6, -8, 4.6, -10.6, 5.6, -8]).fill(0x33303b); // ears
    g.poly([4.6, -8, 5.6, -10.4, 6.6, -8]).fill(0x33303b);
    if (tailUp) {
      g.moveTo(-5.5, -4).quadraticCurveTo(-9, -7, -8, -11).stroke({ color: 0x33303b, width: 1.6 });
    } else {
      g.moveTo(-5.5, -3)
        .quadraticCurveTo(-9.5, -3, -10.5, -6)
        .stroke({ color: 0x33303b, width: 1.6 });
    }
    g.circle(5.8, -6.4, 0.5).fill(0x9fe08a); // one green eye catches the light
    return g;
  };
  const catTex: [Texture, Texture] = [bake(catFrame(true)), bake(catFrame(false))];
  const CAMPUS_BLOCKS: Array<[number, number]> = [
    [0, 2],
    [0, 3],
    [1, 3],
  ];
  const randomCampusCell = (): Cell => {
    for (let tries = 0; tries < 40; tries++) {
      const [bc, br] = CAMPUS_BLOCKS[Math.floor(rand() * CAMPUS_BLOCKS.length)];
      const c = {
        x: bc * 11 + 1 + Math.floor(rand() * 10),
        y: br * 11 + 1 + Math.floor(rand() * 10),
      };
      if (cityGrid.isWalkable(c.x, c.y)) return c;
    }
    return { x: 6, y: 40 }; // campus quad fallback
  };
  const catSprite = new Sprite(catTex[0]);
  catSprite.anchor.set(0.5, 1);
  catSprite.eventMode = "static";
  catSprite.cursor = "pointer";
  actors.addChild(catSprite);
  const cat = {
    cell: randomCampusCell(),
    px: { x: 0, y: 0 },
    path: [] as Cell[],
    wait: 1,
    mode: "wander" as "wander" | "follow",
    followUntil: 0,
    step: 0,
    dirX: 1,
  };
  {
    const w = mapToWorld(cat.cell.x, cat.cell.y);
    cat.px.x = w.x;
    cat.px.y = w.y + TILE_H / 2 - 2;
  }
  catSprite.on("pointerdown", (e) => {
    e.stopPropagation();
    if (cat.mode !== "follow") {
      events.emit("toast", { message: "The cat pads along behind you.", kind: "info" });
    }
    cat.mode = "follow";
    cat.followUntil = nowClock + 30;
    cat.path = [];
    cat.wait = 0;
    useEggStore.getState().markFound("cat_friend");
  });

  let tempo = 1;

  // ── The one per-tick update ─────────────────────────────────────────────────
  function update(dtS: number, nowS: number, view: ViewRect, playerCell: Cell): void {
    const l = view.left - CULL_MARGIN;
    const r = view.right + CULL_MARGIN;
    const tp = view.top - CULL_MARGIN;
    const bt = view.bottom + CULL_MARGIN;

    // Pedestrians
    for (const n of npcs) {
      const loop = n.route.loop;
      const len = loop.length;
      const a = loop[n.leg];
      const b = loop[(n.leg + (n.route.reverse ? len - 1 : 1)) % len];
      const legLen = Math.abs(b.x - a.x) + Math.abs(b.y - a.y);
      n.t += (n.route.speed * dtS) / Math.max(1, legLen);
      if (n.t >= 1) {
        n.t -= 1;
        n.leg = (n.leg + (n.route.reverse ? len - 1 : 1)) % len;
      }
      const aa = loop[n.leg];
      const bb = loop[(n.leg + (n.route.reverse ? len - 1 : 1)) % len];
      const cx = aa.x + (bb.x - aa.x) * n.t;
      const cy = aa.y + (bb.y - aa.y) * n.t;
      const w = mapToWorld(cx, cy);
      // Perpendicular curb offset so walkers hug the sidewalk, not the car lane.
      const dirx = (bb.x - aa.x) * (TILE_W / 2) - (bb.y - aa.y) * (TILE_W / 2);
      const diry = ((bb.x - aa.x) * TILE_H) / 2 + ((bb.y - aa.y) * TILE_H) / 2;
      const dl = Math.hypot(dirx, diry) || 1;
      const px = w.x + (-diry / dl) * n.sideOffset;
      const py = w.y + (dirx / dl) * n.sideOffset + 8;
      n.root.position.set(px, py);
      n.root.zIndex = cx + cy + 0.35;
      const visible = px >= l && px <= r && py >= tp && py <= bt;
      n.root.renderable = visible;
      if (!visible) continue;
      n.stepClock += dtS * tempo;
      const facing = legDir(aa, bb);
      n.body.texture = n.tex.walk[facing][Math.floor(n.stepClock / NPC_STEP_S) % 2];
      n.body.scale.x = (facing === "W" ? -1 : 1) * 0.85;
      if (!reduced)
        n.body.position.y = -Math.abs(Math.sin((n.stepClock * Math.PI) / NPC_STEP_S)) * 1.6;
    }

    // Vehicles
    for (const car of cars) {
      const a = car.route[car.leg];
      const b = car.route[(car.leg + 1) % car.route.length];
      const legLen = Math.abs(b.x - a.x) + Math.abs(b.y - a.y);
      car.t += (CAR_SPEED_CELLS * dtS) / Math.max(1, legLen);
      if (car.t >= 1) {
        car.t -= 1;
        car.leg = (car.leg + 1) % car.route.length;
      }
      const aa = car.route[car.leg];
      const bb = car.route[(car.leg + 1) % car.route.length];
      const cx = aa.x + (bb.x - aa.x) * car.t;
      const cy = aa.y + (bb.y - aa.y) * car.t;
      const w = mapToWorld(cx, cy);
      const along = legDir(aa, bb);
      car.sprite.texture = carTexture(car.kind, along);
      // East/west legs run down-right on screen, north/south down-left.
      car.sprite.rotation = along === "E" || along === "W" ? ISO_TILT : -ISO_TILT;
      car.sprite.position.set(w.x, w.y + 14);
      car.sprite.zIndex = cx + cy + 0.3;
      car.sprite.tint = carTint ?? 0xffffff;
      car.sprite.renderable = w.x >= l && w.x <= r && w.y >= tp && w.y <= bt;
    }

    // Golden taxi window (overrides the fleet tint while it lasts)
    nowClock = nowS;
    if (goldenTaxi) {
      if (goldenState === "waiting" && nowS >= goldenAt) {
        goldenState = "golden";
        goldenUntil = nowS + 45; // roughly one loop of its route
        goldenTaxi.sprite.eventMode = "static";
        goldenTaxi.sprite.cursor = "pointer";
      } else if (goldenState === "golden") {
        if (nowS >= goldenUntil) {
          goldenState = "waiting";
          goldenAt = nowS + 150 + rand() * 150;
          goldenTaxi.sprite.eventMode = "passive";
          goldenTaxi.sprite.cursor = "default";
        } else {
          goldenTaxi.sprite.tint = 0xffd75e;
          sparkleClock += dtS;
          while (sparkleClock >= 0.12) {
            sparkleClock -= 0.12;
            spawn(
              "star",
              goldenTaxi.sprite.position.x + (rand() - 0.5) * 24,
              goldenTaxi.sprite.position.y - 6,
              (rand() - 0.5) * 18,
              -14,
              0.6,
              { alpha: 0.9, tint: 0xffd75e, scale: 0.9 },
            );
          }
        }
      }
    }

    // Campus cat: wander the quad, or shadow the player when befriended
    if (cat.mode === "follow" && nowS >= cat.followUntil) {
      cat.mode = "wander";
      cat.path = [];
      cat.wait = 1.5;
    }
    if (cat.wait > 0) {
      cat.wait -= dtS;
    } else if (cat.path.length === 0) {
      const target =
        cat.mode === "follow" ? { x: playerCell.x, y: playerCell.y } : randomCampusCell();
      const path = findPath(cityGrid, cat.cell, target);
      if (path.length > 1) {
        cat.path = path.slice(1);
        if (cat.mode === "follow" && cat.path.length > 0) cat.path.pop(); // stop one cell shy
      }
      cat.wait = cat.path.length === 0 ? (cat.mode === "follow" ? 0.4 : 1 + rand() * 2.5) : 0;
    } else {
      const next = cat.path[0];
      const t = mapToWorld(next.x, next.y);
      const ty = t.y + TILE_H / 2 - 2;
      const ddx = t.x - cat.px.x;
      const ddy = ty - cat.px.y;
      const dist = Math.hypot(ddx, ddy);
      const speed = cat.mode === "follow" ? 150 : 75;
      const step = speed * dtS;
      if (dist <= step) {
        cat.px.x = t.x;
        cat.px.y = ty;
        cat.cell = next;
        cat.path.shift();
        if (cat.path.length === 0 && cat.mode === "wander") cat.wait = 1 + rand() * 2.5;
      } else {
        cat.px.x += (ddx / dist) * step;
        cat.px.y += (ddy / dist) * step;
        if (Math.abs(ddx) > 4) cat.dirX = ddx > 0 ? 1 : -1;
      }
      cat.step += dtS;
    }
    catSprite.texture = catTex[Math.floor(cat.step / 0.35) % 2];
    catSprite.scale.x = cat.dirX;
    catSprite.position.set(cat.px.x, cat.px.y);
    catSprite.zIndex = cat.cell.x + cat.cell.y + 0.25;
    catSprite.renderable = cat.px.x >= l && cat.px.x <= r && cat.px.y >= tp && cat.px.y <= bt;

    // Emitters (skipped entirely under reduced motion — spawn() no-ops anyway)
    if (!reduced) {
      if (fountainAt && fountainAt.x >= l && fountainAt.x <= r) {
        fountainClock += dtS;
        while (fountainClock >= 0.09) {
          fountainClock -= 0.09;
          spawn(
            "droplet",
            fountainAt.x + (rand() - 0.5) * 10,
            fountainAt.y,
            (rand() - 0.5) * 26,
            -46 - rand() * 22,
            0.75,
            { gravity: 130, alpha: 0.9 },
          );
        }
      }
      smokeClock += dtS;
      while (smokeClock >= 0.5) {
        smokeClock -= 0.5;
        for (const stack of ctx.smokeStacks) {
          spawn("smoke", stack.x + (rand() - 0.5) * 4, stack.y, (rand() - 0.5) * 4, -16, 2.6, {
            scaleRate: 0.5,
            alpha: 0.35,
            sway: 6,
          });
        }
      }
      steamClock += dtS;
      while (steamClock >= 0.9) {
        steamClock -= 0.9;
        for (const vent of ctx.steamVents) {
          spawn("smoke", vent.x, vent.y, 0, -12, 1.6, { scaleRate: 0.35, alpha: 0.22, sway: 4 });
        }
      }
      leafClock += dtS;
      while (leafClock >= 1.4) {
        leafClock -= 1.4;
        const src = leafSources[Math.floor(rand() * leafSources.length)];
        if (src && src.x >= l && src.x <= r && src.y >= tp && src.y <= bt) {
          spawn("leaf", src.x + (rand() - 0.5) * 24, src.y, 12 + rand() * 8, 9, 3.5, {
            sway: 14,
            alpha: 0.9,
            spin: (rand() - 0.5) * 3,
          });
        }
      }
    }

    // Particles
    for (const p of pool) {
      if (!p.sprite.visible) continue;
      p.life += dtS;
      if (p.life >= p.maxLife) {
        p.sprite.visible = false;
        free.push(p);
        continue;
      }
      p.vy += p.gravity * dtS;
      p.x += p.vx * dtS + (p.sway ? Math.sin(p.life * 4 + p.maxLife) * p.sway * dtS : 0);
      p.y += p.vy * dtS;
      const k = p.life / p.maxLife;
      p.sprite.position.set(p.x, p.y);
      p.sprite.alpha = p.startAlpha * (1 - k);
      if (p.spin) p.sprite.rotation += p.spin * dtS;
      if (p.scaleRate) p.sprite.scale.set(p.baseScale * (1 + k * p.scaleRate * 3));
    }

    // Birds
    if (!reduced) {
      for (const b of birds) {
        const t = nowS * b.speed + b.phase;
        const bx = b.cx + Math.cos(t) * b.rx;
        const by = b.cy + Math.sin(t) * b.ry + Math.sin(nowS * 2.2 + b.phase) * 3;
        b.sprite.position.set(bx, by);
        b.sprite.scale.x = Math.cos(t) * b.speed > 0 ? 1 : -1;
        b.sprite.renderable = bx >= l && bx <= r && by >= tp && by <= bt;
      }
    }

    // Pigeons
    for (const p of pigeons) {
      p.t += dtS;
      if (p.state === "peck") {
        const near = Math.abs(playerCell.x - p.cell.x) + Math.abs(playerCell.y - p.cell.y) <= 2;
        if (near && !reduced) {
          p.state = "fly";
          p.t = 0;
          p.vx = (rand() - 0.5) * 160;
          p.vy = -90 - rand() * 60;
        } else {
          // peck-peck… hop: tiny head-bob on a seeded rhythm
          const bob = Math.max(0, Math.sin(p.t * 5.5)) * 1.6;
          p.sprite.position.set(p.home.x, p.home.y - (reduced ? 0 : bob));
        }
      } else if (p.state === "fly") {
        p.vy += 30 * dtS; // gentle arc, they fly up and away
        p.sprite.position.x += p.vx * dtS;
        p.sprite.position.y += p.vy * dtS;
        p.sprite.alpha = Math.max(0, 1 - p.t / 1.2);
        if (p.t >= 1.2) {
          p.state = "gone";
          p.sprite.renderable = false;
          p.returnAt = nowS + 18 + rand() * 6;
        }
      } else if (p.state === "gone" && nowS >= p.returnAt) {
        p.state = "peck";
        p.t = rand() * 3;
        p.sprite.renderable = true;
        p.sprite.alpha = 1;
        p.sprite.position.set(p.home.x, p.home.y);
      }
    }

    // Lamp glows (night only; per-lamp flicker phase)
    for (let i = 0; i < lampGlows.length; i++) {
      const g = lampGlows[i];
      const flicker = reduced ? 1 : 0.88 + 0.12 * Math.sin(nowS * 6.5 + g.phase);
      g.sprite.alpha = g.on ? nightness * 0.34 * flicker : 0;
    }
  }

  return {
    update,
    setNight: (n) => {
      nightness = n;
    },
    toggleLampAt: (cell) => {
      let best: (typeof lampGlows)[number] | null = null;
      let bestD = Infinity;
      for (const g of lampGlows) {
        const d = Math.abs(g.cell.x - cell.x) + Math.abs(g.cell.y - cell.y);
        if (d < bestD) {
          bestD = d;
          best = g;
        }
      }
      if (!best) return false;
      best.on = !best.on;
      return best.on;
    },
    spawnDust: (x, y) => {
      spawn("dust", x + (rand() - 0.5) * 6, y, (rand() - 0.5) * 14, -8, 0.45, {
        alpha: 0.5,
        scaleRate: 0.4,
      });
    },
    splash: (x, y, count) => {
      for (let i = 0; i < count; i++) {
        spawn("droplet", x + (rand() - 0.5) * 14, y, (rand() - 0.5) * 90, -70 - rand() * 50, 0.8, {
          gravity: 200,
          alpha: 0.95,
        });
      }
    },
    scatterPigeons,
    celebrate,
    setTempo: (m) => {
      tempo = m;
    },
    setCarTint: (t) => {
      carTint = t;
    },
    cars,
    dispose: () => {
      for (const n of npcs) n.root.destroy({ children: true });
      for (const car of cars) car.sprite.destroy();
      catSprite.destroy();
      for (const g of lampGlows) g.sprite.destroy();
      for (const b of birds) b.sprite.destroy();
      for (const p of pigeons) p.sprite.destroy();
      for (const p of pool) p.sprite.destroy();
      destroyTextures(baked);
    },
  };
}
