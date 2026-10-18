// Walking the ambient customers. Same shape as castView.ts — given a renderer it
// returns an update(dt), the textures it baked, and a destroy() — and added to
// the same sorted container, so a customer crossing the floor passes in front of
// the near tables and behind the counter run without any of it being special.
//
// One body per seat, each in its own clothes, recycled rather than spawned: the
// texture bill is fixed however often the door goes. What they are carrying is
// one more pair of tiny textures — a takeaway cup in the hand, and a plate and
// mug on the table once they sit.
//
// The routing is real pathfinding on the room's own grid with the flap down —
// customers never go behind the bar, and giving them the same A* the player uses
// means a table that becomes unreachable takes the customers with it rather than
// leaving them walking through the counter.
import { Container, Graphics, Sprite, type Renderer, type Texture } from "pixi.js";
import { mapToWorld, roundCell, worldToMap } from "@/lib/iso";
import { findPath, type Cell, type Grid } from "@/lib/pathfinding";
import {
  NPC_PALETTES,
  bakePersonTextures,
  bakeShadowTexture,
  type PersonTextures,
} from "@/world/characterArt";
import type { Cardinal } from "@/world/assets";
import { NO_GATES_OPEN, makeRoomGrid } from "./room";
import { Z_CAST } from "./scene";
import {
  COLLECT_S,
  DOOR,
  HOP_S,
  OPENING_SEATED,
  ORDER_S,
  QUEUE,
  SEATS,
  WAIT,
  crowdSize,
  goalFor,
  nextBell,
  nextPhase,
  prepFor,
  sitFor,
  staysIn,
  type Phase,
  type Seat,
} from "./customers";
import { facingFrom } from "./cast";
import { CAFE_PALETTE } from "./props";
import type { World } from "./world";

/** A shade slower than the cast: nobody is in a hurry in here. */
const WALK_SPEED = 46;
const STEP_S = 0.28;
const BOB_PX = 2;
/** How high a table's top is above its cell, in world pixels (props.ts §table). */
const TABLE_TOP = 30;

/**
 * Their own clothes — the city's pedestrian palettes, which are all casual. The
 * white-shirted one is left out: in here a white shirt is the staff uniform.
 */
const SKINS = NPC_PALETTES.filter((p) => p.shirt !== 0xececec);

/**
 * Sorted a hair behind the cast, so a customer sharing a cell with Priya reads
 * as being on the far side of the counter from her rather than in front of her.
 */
const Z_CUSTOMER = Z_CAST - 0.02;

interface Hop {
  from: { x: number; y: number };
  to: { x: number; y: number };
  t: number;
  /** The phase to move into once they have landed. */
  then: Phase;
  /** The cell they are on once they have landed. */
  cell: Cell;
}

interface Body {
  tex: PersonTextures;
  view: Container;
  body: Sprite;
  /** The takeaway cup in their hand, once they have collected their order. */
  cup: Sprite;
  /** Their plate and mug, on the table while they sit. */
  plate: Sprite;
  pixel: { x: number; y: number };
  cell: Cell;
  facing: Cardinal;
  phase: Phase;
  /** Cells still to walk, from `findPath`. */
  path: Cell[];
  /** Seconds still to stand here, for the phases that are a pause. */
  hold: number;
  /** Their place in the queue or along the counter, 0 nearest the front. */
  slot: number;
  seat: Seat | null;
  stays: boolean;
  carrying: boolean;
  hop: Hop | null;
  stepClock: number;
  phaseOffset: number;
}

/** What the room hears as customers go about their visit. */
export interface CustomerEvents {
  /** Somebody opened the door, coming in or going out. */
  bell(): void;
  /** Somebody reached the till and is ordering. */
  order(): void;
  /** Somebody's order was handed over at the pickup. */
  collect(): void;
}

export interface CustomersView {
  textures: Texture[];
  /** `world` decides how busy the door is. */
  update(dtS: number, world: World, events: CustomerEvents): void;
  /** How many are on screen, for the ambient budget and for the tests. */
  countInside(): number;
  destroy(): void;
}

export function createCustomers(
  renderer: Renderer,
  reduced: boolean,
  parent: Container,
): CustomersView {
  const textures: Texture[] = [];
  const shadowTex = bakeShadowTexture(renderer);
  const cupTex = bakeTexture(renderer, drawCup());
  const plateTex = bakeTexture(renderer, drawPlate());
  textures.push(shadowTex, cupTex, plateTex);

  // The flap-down grid, baked once. Customers never go behind the counter, so
  // the grid they path on does not depend on what the player is doing with it.
  const grid: Grid = makeRoomGrid(NO_GATES_OPEN);

  // One body per seat is the ceiling — a room that could seat everybody at once
  // never has to decide who is left standing.
  const bodies: Body[] = SEATS.map((_, i) => {
    const tex = bakePersonTextures(renderer, SKINS[i % SKINS.length]);
    textures.push(...tex.all);

    const holder = new Container();
    const shadow = new Sprite(shadowTex);
    shadow.anchor.set(0.5, 0.5);
    shadow.position.set(0, 1);
    const body = new Sprite(tex.idle.N);
    body.anchor.set(0.5, 1);
    const cup = new Sprite(cupTex);
    cup.anchor.set(0.5, 1);
    cup.visible = false;
    holder.addChild(shadow, body, cup);
    holder.visible = false;

    const plate = new Sprite(plateTex);
    plate.anchor.set(0.5, 0.5);
    plate.visible = false;
    parent.addChild(plate);

    const start = mapToWorld(DOOR.x, DOOR.y);
    holder.position.set(start.x, start.y);
    parent.addChild(holder);

    return {
      tex,
      view: holder,
      body,
      cup,
      plate,
      pixel: { x: start.x, y: start.y },
      cell: { ...DOOR },
      facing: "N" as Cardinal,
      phase: "away" as Phase,
      path: [],
      hold: 0,
      slot: i,
      seat: null,
      stays: false,
      carrying: false,
      hop: null,
      stepClock: 0,
      phaseOffset: i * 2.3,
    };
  });

  let bell = nextBell({ regulars: "full" } as World, reduced, Math.random());
  let elapsed = 0;

  const freeSeats = () => SEATS.filter((s) => !bodies.some((b) => b.seat === s));

  // A café you walk into is already in the middle of its morning: a couple of
  // tables are taken, somebody part-way through their coffee.
  for (const b of bodies.slice(0, OPENING_SEATED)) {
    const free = freeSeats();
    const seat = free[Math.floor(Math.random() * free.length)];
    if (!seat) break;
    b.seat = seat;
    b.stays = true;
    b.view.visible = true;
    sitDown(b, seat);
    b.hold = sitFor(Math.random()) * Math.random();
  }

  /** Send somebody in, if the room has room for them. */
  function admit(events: CustomerEvents): void {
    const inside = bodies.filter((b) => b.phase !== "away");
    if (inside.length >= crowdSize()) return;
    const next = bodies.find((b) => b.phase === "away");
    if (!next) return;

    // The seat is chosen at the door and held, so two people who both meant to
    // sit never walk to the same chair.
    const free = freeSeats();
    next.stays = staysIn(Math.random(), free.length);
    next.seat = next.stays ? (free[Math.floor(Math.random() * free.length)] ?? null) : null;
    if (!next.seat) next.stays = false;
    next.carrying = false;
    next.slot = bodies.filter((b) => b.phase === "queueing" || b.phase === "entering").length;
    next.cell = { ...DOOR };
    next.pixel = { ...mapToWorld(DOOR.x, DOOR.y) };
    next.view.position.set(next.pixel.x, next.pixel.y);
    next.view.visible = true;
    enter(next, "entering");
    events.bell();
  }

  /** Move somebody into a phase and give them the route it implies. */
  function enter(b: Body, phase: Phase): void {
    b.phase = phase;
    b.stepClock = 0;
    if (phase === "away") {
      b.view.visible = false;
      b.cup.visible = false;
      b.plate.visible = false;
      b.carrying = false;
      b.seat = null;
      b.path = [];
      return;
    }
    if (phase === "waiting") {
      // The first free place along the counter.
      const taken = new Set(
        bodies.filter((o) => o !== b && o.phase === "waiting").map((o) => o.slot),
      );
      b.slot = WAIT.findIndex((_, i) => !taken.has(i));
      if (b.slot < 0) b.slot = WAIT.length - 1;
    }
    b.hold =
      phase === "ordering"
        ? ORDER_S
        : phase === "waiting"
          ? prepFor(Math.random())
          : phase === "collecting"
            ? COLLECT_S
            : 0;
    routeTo(b, goalFor(phase, b.slot, b.seat));
  }

  function routeTo(b: Body, goal: Cell | null): void {
    if (!goal) {
      b.path = [];
      return;
    }
    const path = findPath(grid, b.cell, goal);
    // No route means the room has been re-laid under them. Sending them home is
    // the only honest answer — a customer stuck on an unreachable table would
    // stand there for the rest of the season.
    b.path = path.length > 1 ? path.slice(1) : [];
    if (path.length === 0 && b.phase !== "leaving") enter(b, "leaving");
  }

  /** Step from the floor onto the chair, facing the table, and put the plate down. */
  function sitDown(b: Body, seat: Seat): void {
    const chair = mapToWorld(seat.chair.x, seat.chair.y);
    const table = mapToWorld(seat.table.x, seat.table.y);
    b.facing = facingFrom(seat.chair, seat.table);
    b.cup.visible = false;
    // On the table, nudged toward the side they are sitting on, so two people
    // at one table each have their own plate.
    b.plate.position.set(
      table.x + (chair.x - table.x) * 0.22,
      table.y - TABLE_TOP + (chair.y - table.y) * 0.22,
    );
    b.plate.zIndex = seat.table.x + seat.table.y + 0.25;
    b.plate.visible = true;
    b.cell = { ...seat.chair };
    b.pixel = { x: chair.x, y: chair.y };
    b.view.position.set(chair.x, chair.y);
    b.view.zIndex = seat.chair.x + seat.chair.y + Z_CUSTOMER;
    b.phase = "seated";
    b.hold = sitFor(Math.random());
  }

  function startHop(b: Body, to: Cell, then: Phase): void {
    const target = mapToWorld(to.x, to.y);
    b.hop = { from: { ...b.pixel }, to: target, t: 0, then, cell: { ...to } };
  }

  /** Everyone behind a departing customer moves up one. */
  function reshuffle(): void {
    const queueing = bodies.filter((b) => b.phase === "queueing").sort((a, c) => a.slot - c.slot);
    queueing.forEach((b, i) => {
      if (b.slot === i) return;
      b.slot = i;
      routeTo(b, QUEUE[Math.min(i, QUEUE.length - 1)]);
    });
  }

  return {
    textures,

    countInside: () => bodies.filter((b) => b.phase !== "away").length,

    update(dtS, world, events) {
      elapsed += dtS;

      bell -= dtS;
      if (bell <= 0) {
        bell = nextBell(world, reduced, Math.random());
        admit(events);
      }

      for (const b of bodies) {
        if (b.phase === "away") continue;

        // Sitting down or standing up: a short glide between the floor and the
        // chair, with nothing else happening until they land.
        if (b.hop) {
          b.hop.t = Math.min(1, b.hop.t + dtS / HOP_S);
          const k = b.hop.t;
          b.pixel.x = b.hop.from.x + (b.hop.to.x - b.hop.from.x) * k;
          b.pixel.y = b.hop.from.y + (b.hop.to.y - b.hop.from.y) * k;
          b.view.position.set(b.pixel.x, b.pixel.y);
          if (k >= 1) {
            const { then, cell } = b.hop;
            b.hop = null;
            b.cell = cell;
            b.view.zIndex = cell.x + cell.y + Z_CUSTOMER;
            if (then === "seated" && b.seat) sitDown(b, b.seat);
            else enter(b, then);
          }
          stand(b, elapsed, reduced);
          continue;
        }

        if (b.path.length > 0) {
          walk(b, dtS);
          continue;
        }

        // Standing: queueing until the slot in front frees up, ordering,
        // waiting for an order, collecting it, or sitting. `hold` at zero and no
        // path left means this phase is over.
        if (b.hold > 0) {
          b.hold -= dtS;
          if (b.phase === "ordering" || b.phase === "collecting") b.facing = "N";
          stand(b, elapsed, reduced);
          continue;
        }

        if (b.phase === "queueing") {
          // Only the front of the queue may go to the till, and only when it is
          // free. Everybody else waits where they are — which is the entire
          // behaviour that makes three people look like a queue.
          const tillBusy = bodies.some((o) => o !== b && o.phase === "ordering");
          if (b.slot === 0 && !tillBusy) {
            enter(b, "ordering");
            events.order();
          } else {
            b.facing = "N";
            stand(b, elapsed, reduced);
          }
          continue;
        }

        if (b.phase === "waiting") {
          // Ready — but one at a time at the pickup.
          const pickupBusy = bodies.some((o) => o !== b && o.phase === "collecting");
          if (!pickupBusy) enter(b, "collecting");
          else {
            b.facing = "N";
            stand(b, elapsed, reduced);
          }
          continue;
        }

        if (b.phase === "collecting") {
          // Handed over: it is in their hand from here to the table or the door.
          b.carrying = true;
          events.collect();
        }

        if (b.phase === "seating" && b.seat) {
          // At the chair's side: sit down onto it.
          startHop(b, b.seat.chair, "seated");
          continue;
        }

        if (b.phase === "seated" && b.seat) {
          // Finished: the plate is cleared and they get up off the chair.
          b.plate.visible = false;
          b.carrying = false;
          const approach = b.seat.approach;
          b.seat = null;
          startHop(b, approach, "leaving");
          continue;
        }

        const was = b.phase;
        const now = nextPhase(was, b.stays);
        enter(b, now);
        // Somebody leaving the till frees the queue up; somebody leaving the
        // building rings the bell on the way out, exactly as they did coming in.
        if (was === "ordering" || now === "away") reshuffle();
        if (now === "away") events.bell();
        stand(b, elapsed, reduced);
      }

      for (const b of bodies) holdCup(b);
    },

    destroy() {
      for (const b of bodies) {
        b.plate.destroy();
        b.view.destroy({ children: true });
      }
      bodies.length = 0;
    },
  };
}

function walk(b: Body, dtS: number): void {
  const next = b.path[0];
  const to = mapToWorld(next.x, next.y);
  const dx = to.x - b.pixel.x;
  const dy = to.y - b.pixel.y;
  const gap = Math.hypot(dx, dy);
  const step = WALK_SPEED * dtS;

  if (gap <= step) {
    b.pixel.x = to.x;
    b.pixel.y = to.y;
    b.path.shift();
  } else {
    b.pixel.x += (dx / gap) * step;
    b.pixel.y += (dy / gap) * step;
  }

  b.facing = facingFrom(b.cell, next);
  b.stepClock += dtS;
  const frame = Math.floor(b.stepClock / STEP_S) % 2;
  b.body.texture = b.tex.walk[b.facing][frame];
  b.body.position.y = -Math.abs(Math.sin((b.stepClock * Math.PI) / STEP_S)) * BOB_PX;
  b.body.scale.set(b.facing === "W" ? -1 : 1, 1);

  b.view.position.set(b.pixel.x, b.pixel.y);
  const cell = roundCell(worldToMap(b.pixel.x, b.pixel.y));
  if (cell.x !== b.cell.x || cell.y !== b.cell.y) {
    b.cell = cell;
    b.view.zIndex = cell.x + cell.y + Z_CUSTOMER;
  }
}

/**
 * Standing about, or sitting. Sitting is the standing frame squashed against the
 * chair, the same trick castView.ts uses for Owen — there is no seated frame in
 * the rig and one is not worth baking for a body nobody is asked to look at.
 * Seated, they eat: every few seconds a small dip toward the table.
 */
function stand(b: Body, elapsed: number, reduced: boolean): void {
  const seated = b.phase === "seated" && !b.hop;
  b.body.texture = b.tex.idle[b.facing];
  b.body.position.y = seated ? 4 : 0;
  const rest = seated ? 0.82 : 1;
  const breath = 0.012 * Math.sin(elapsed * 2 + b.phaseOffset);
  const bite = seated
    ? -0.04 * Math.pow(Math.max(0, Math.sin(elapsed * 1.3 + b.phaseOffset)), 12)
    : 0;
  b.body.scale.set(b.facing === "W" ? -1 : 1, reduced ? rest : rest * (1 + breath + bite));
}

/** The cup rides in the hand on the side they are facing, and is hidden behind them. */
function holdCup(b: Body): void {
  const show = b.carrying && b.phase !== "seated" && b.facing !== "N";
  b.cup.visible = show;
  if (!show) return;
  b.cup.position.set(b.facing === "W" ? -7 : 7, b.body.position.y - 9);
}

function bakeTexture(renderer: Renderer, g: Graphics): Texture {
  const t = renderer.generateTexture({ target: g, resolution: 2 });
  g.destroy();
  return t;
}

/** A takeaway cup: cream, a brown sleeve, a lid. */
function drawCup(): Graphics {
  const P = CAFE_PALETTE;
  const g = new Graphics();
  g.poly([-3, -9, 3, -9, 2.4, 0, -2.4, 0]).fill(P.cream);
  g.rect(-2.9, -6, 5.8, 2.6).fill(P.woodMid);
  g.roundRect(-3.6, -10.5, 7.2, 2, 0.8).fill(P.espresso);
  return g;
}

/** A plate with something on it, and a mug beside it, seen from above at the room's angle. */
function drawPlate(): Graphics {
  const P = CAFE_PALETTE;
  const g = new Graphics();
  g.ellipse(-4, 0, 9, 4.5).fill(0xf8f6f1);
  g.ellipse(-4, 0, 6.5, 3).fill({ color: 0x000000, alpha: 0.05 });
  g.poly([-9, -1, -1, -3, -4, 1.5]).fill(P.brass);
  g.poly([-6, 0.5, 0, -1.5, -2, 2]).fill(P.woodMid);
  // The mug.
  g.rect(5, -7, 6, 7).fill(P.cream);
  g.ellipse(8, -7, 3, 1.2).fill(P.espresso);
  g.ellipse(12, -3.5, 1.6, 2).stroke({ color: P.cream, width: 1.2 });
  return g;
}
