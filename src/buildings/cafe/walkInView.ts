// Whoever is coming up to you during a stage worked from one spot
// (counterShift.ts): a customer to the till, Tomas to the pass, Ray to the
// table.
//
// In from where they were — the door, or their own spot behind the counter —
// across to you, and once their scene is done back the way they came. The next
// one sets off while the last is still leaving. Arriving is what opens the
// conversation: `onArrive` tells the room they are standing in front of you.
//
// People from the street path on the flap-down grid, like the ambient
// customers (customersView.ts), so they never cut behind the counter; the staff
// come round through it.
import { Container, Sprite, type Renderer, type Texture } from "pixi.js";
import { mapToWorld } from "@/lib/iso";
import { findPath, type Cell } from "@/lib/pathfinding";
import { bakePersonTextures, bakeShadowTexture, type PersonTextures } from "@/world/characterArt";
import type { Cardinal } from "@/world/assets";
import { GATES, NO_GATES_OPEN, makeRoomGrid } from "./room";
import { Z_CAST } from "./scene";
import { DOOR } from "./customers";
import { facingFrom } from "./cast";
import type { WalkIn } from "./counterShift";

/** A little brisker than the ambient crowd: they have somewhere to be — you. */
const WALK_SPEED = 74;
const STEP_S = 0.28;
const BOB_PX = 2;

export interface WalkInView {
  textures: Texture[];
  /**
   * `want` is who should be with you now (null: nobody). A change of `key`
   * sends whoever is there out and brings the next one in.
   */
  update(
    dtS: number,
    want: WalkIn | null,
    events: { arrive(key: string): void; bell(): void },
  ): void;
  /** The named people currently walking up, standing with you, or walking back. */
  busy(): ReadonlySet<string>;
}

type Phase = "coming" | "here" | "going";

/** One person on their way to you, with you, or on their way back. */
interface Figure {
  key: string;
  who: string | null;
  home: Cell;
  face: Cardinal;
  tex: PersonTextures;
  holder: Container;
  body: Sprite;
  phase: Phase;
  cell: Cell;
  pixel: { x: number; y: number };
  path: Cell[];
  facing: Cardinal;
  stepClock: number;
}

export function createWalkIn(renderer: Renderer, reduced: boolean, parent: Container): WalkInView {
  const textures: Texture[] = [];
  const shadowTex = bakeShadowTexture(renderer);
  textures.push(shadowTex);
  const baked = new Map<string, PersonTextures>();
  // People from the street keep to the public floor; the staff come round
  // through the flap.
  const street = makeRoomGrid(NO_GATES_OPEN);
  const staffSide = makeRoomGrid(new Set(GATES.map((g) => g.id)));
  /** At most two: the one leaving, and the next one already on their way in. */
  const figures: Figure[] = [];

  function texFor(w: WalkIn): PersonTextures {
    let t = baked.get(w.key);
    if (!t) {
      t = bakePersonTextures(renderer, w.palette);
      textures.push(...t.all);
      baked.set(w.key, t);
    }
    return t;
  }

  function routeTo(f: Figure, goal: Cell): void {
    const fromDoor = f.home.x === DOOR.x && f.home.y === DOOR.y;
    const p = findPath(fromDoor ? street : staffSide, f.cell, goal);
    f.path = p.length > 1 ? p.slice(1) : [];
  }

  function spawn(w: WalkIn): Figure {
    const holder = new Container();
    const shadow = new Sprite(shadowTex);
    shadow.anchor.set(0.5, 0.5);
    shadow.position.set(0, 1);
    const tex = texFor(w);
    const body = new Sprite(tex.idle.N);
    body.anchor.set(0.5, 1);
    holder.addChild(shadow, body);
    parent.addChild(holder);
    const f: Figure = {
      key: w.key,
      who: w.who,
      home: { ...w.from },
      face: w.face,
      tex,
      holder,
      body,
      phase: "coming",
      cell: { ...w.from },
      pixel: mapToWorld(w.from.x, w.from.y),
      path: [],
      facing: "N",
      stepClock: 0,
    };
    routeTo(f, w.serveAt);
    return f;
  }

  /** Move one figure a frame along; true once they have gone out of the door. */
  function step(f: Figure, dtS: number, arrive: (key: string) => void): boolean {
    const next = f.path[0];
    if (next) {
      const target = mapToWorld(next.x, next.y);
      const dx = target.x - f.pixel.x;
      const dy = target.y - f.pixel.y;
      const dist = Math.hypot(dx, dy);
      const stepPx = WALK_SPEED * dtS * (reduced ? 1.4 : 1);
      f.facing = facingFrom(f.cell, next);
      if (dist <= stepPx) {
        f.pixel = target;
        f.cell = { ...next };
        f.path.shift();
      } else {
        f.pixel = { x: f.pixel.x + (dx / dist) * stepPx, y: f.pixel.y + (dy / dist) * stepPx };
      }
      f.stepClock += dtS;
      const frame = Math.floor(f.stepClock / STEP_S) % 2;
      f.body.texture = f.tex.walk[f.facing][frame];
      f.body.position.y = reduced
        ? 0
        : -Math.abs(Math.sin((f.stepClock * Math.PI) / STEP_S)) * BOB_PX;
    } else {
      f.stepClock = 0;
      f.body.position.y = 0;
      if (f.phase === "coming") {
        // Arrived, facing you.
        f.phase = "here";
        f.facing = f.face;
        arrive(f.key);
      } else if (f.phase === "going") {
        return true;
      }
      f.body.texture = f.tex.idle[f.facing];
    }
    f.body.scale.x = f.facing === "W" ? -1 : 1;
    f.holder.position.set(f.pixel.x, f.pixel.y);
    f.holder.zIndex = f.cell.x + f.cell.y + Z_CAST;
    return false;
  }

  return {
    textures,

    busy: () => new Set(figures.map((f) => f.who).filter((id): id is string => !!id)),

    update(dtS, want, events) {
      // Whoever is not the one due now heads for the door.
      for (const f of figures) {
        if (f.phase !== "going" && f.key !== want?.key) {
          f.phase = "going";
          routeTo(f, f.home);
        }
      }
      // The one due comes in — while the last one is still on their way out.
      if (want && !figures.some((f) => f.key === want.key && f.phase !== "going")) {
        figures.push(spawn(want));
        if (want.from.x === DOOR.x && want.from.y === DOOR.y) events.bell();
      }
      for (let i = figures.length - 1; i >= 0; i--) {
        const f = figures[i];
        if (step(f, dtS, events.arrive)) {
          f.holder.destroy({ children: true });
          figures.splice(i, 1);
        }
      }
    },
  };
}
