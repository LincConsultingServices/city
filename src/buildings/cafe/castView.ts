// Drawing the cast. Room-local and shaped like steam.ts: given a renderer it
// returns a container, an update(dt) to call from the ticker, and the textures it
// baked so the canvas's teardown can free them.
//
// The rig is the city's own (world/characterArt.ts), which takes a palette, so
// the people indoors are recognisably made of the same stuff as the people
// outside — and the player, walking in from the street, does not change species
// on the way through the door.
//
// What this does is deliberately small: stand somewhere, walk a short loop, and
// look up when someone comes near. That last one is two frames of texture swap
// and it is worth more than the other two put together — a room where nobody
// registers you is a diorama.
import { Container, Sprite, type Renderer, type Texture } from "pixi.js";
import { mapToWorld, roundCell, worldToMap } from "@/lib/iso";
import { bakePersonTextures, bakeShadowTexture, type PersonTextures } from "@/world/characterArt";
import type { Cardinal } from "@/world/assets";
import type { Cell } from "@/lib/pathfinding";
import { CAST_PAUSE_S, CAST_WALK_SPEED, facingFrom, type CastAt, type CastMember } from "./cast";
import { Z_CAST } from "./scene";

/** Slower than the player's 0.18 — a shorter stride for a slower walk. */
const STEP_S = 0.26;
const BOB_PX = 2;
const BREATH = 0.012;

interface Actor {
  member: CastMember;
  tex: PersonTextures;
  view: Container;
  body: Sprite;
  pixel: { x: number; y: number };
  cell: Cell;
  facing: Cardinal;
  /** Index into the patrol loop they are heading for. */
  leg: number;
  /** Seconds still to stand here before moving on. */
  pause: number;
  stepClock: number;
  /** So a room full of people does not breathe in unison. */
  phase: number;
}

export interface CastView {
  /** Everything baked here, for the canvas's teardown stack to free. */
  textures: Texture[];
  /** `player` is the cell the player is standing on this frame. */
  update(dtS: number, player: Cell): void;
  /**
   * Where everyone is standing right now. The room asks this rather than reading
   * anchors, so the prompt to speak to somebody tracks the person and not the
   * spot they started from.
   */
  positions(): CastAt[];
  destroy(): void;
}

/**
 * `parent` must be the room's sorted container — the same one the furniture and
 * the player are in. Each person is added to it directly rather than through a
 * container of their own: a nested container carries a single zIndex, so the
 * whole cast would sort as one block and Priya would end up either in front of
 * the counter or behind it, never passing along it.
 */
export function createCast(
  renderer: Renderer,
  members: readonly CastMember[],
  reduced: boolean,
  parent: Container,
): CastView {
  const textures: Texture[] = [];
  const shadowTex = bakeShadowTexture(renderer);
  textures.push(shadowTex);

  const actors: Actor[] = members.map((member, i) => {
    const tex = bakePersonTextures(renderer, member.palette);
    textures.push(...tex.all);

    const holder = new Container();
    const shadow = new Sprite(shadowTex);
    shadow.anchor.set(0.5, 0.5);
    shadow.position.set(0, 1);
    // Someone sitting down casts less of one, and a full-size shadow under a
    // seated figure reads as hovering.
    if (member.seated) shadow.scale.set(0.8);

    const body = new Sprite(tex.idle.S);
    body.anchor.set(0.5, 1);
    // Sitting is a shorter silhouette. There is no seated frame in the rig and
    // one is not worth baking for a two-second read: squashing the standing
    // frame against the chair does the job at this size.
    if (member.seated) {
      body.scale.set(1, 0.82);
      body.position.y = 4;
    }

    holder.addChild(shadow, body);

    const pixel = mapToWorld(member.anchor.x, member.anchor.y);
    holder.position.set(pixel.x, pixel.y);
    holder.zIndex = member.anchor.x + member.anchor.y + Z_CAST;
    parent.addChild(holder);

    return {
      member,
      tex,
      view: holder,
      body,
      pixel: { x: pixel.x, y: pixel.y },
      cell: { ...member.anchor },
      facing: "S",
      leg: 0,
      pause: CAST_PAUSE_S,
      stepClock: 0,
      phase: i * 1.7,
    };
  });

  let elapsed = 0;

  return {
    textures,

    positions: () => actors.map((a) => ({ member: a.member, cell: a.cell })),

    update(dtS, player) {
      elapsed += dtS;

      for (const a of actors) {
        const { member } = a;
        const dist = Math.abs(player.x - a.cell.x) + Math.abs(player.y - a.cell.y);
        const noticed = dist <= member.noticesAt;

        // Being looked at beats everything else they might be doing. Someone who
        // keeps wiping the counter while you stand in front of them has not
        // noticed you, whatever their head is doing.
        if (noticed) {
          a.facing = facingFrom(a.cell, player);
          a.stepClock = 0;
          a.body.texture = a.tex.idle[a.facing];
          idlePose(a, elapsed, reduced);
          continue;
        }

        const walking = !reduced && !member.seated && member.patrol.length > 1;
        if (!walking) {
          a.body.texture = a.tex.idle[a.facing];
          idlePose(a, elapsed, reduced);
          continue;
        }

        if (a.pause > 0) {
          a.pause -= dtS;
          a.stepClock = 0;
          a.body.texture = a.tex.idle[a.facing];
          idlePose(a, elapsed, reduced);
          continue;
        }

        const goal = member.patrol[a.leg];
        const to = mapToWorld(goal.x, goal.y);
        const dx = to.x - a.pixel.x;
        const dy = to.y - a.pixel.y;
        const gap = Math.hypot(dx, dy);
        const step = CAST_WALK_SPEED * dtS;

        if (gap <= step) {
          a.pixel.x = to.x;
          a.pixel.y = to.y;
          a.leg = (a.leg + 1) % member.patrol.length;
          a.pause = CAST_PAUSE_S;
        } else {
          a.pixel.x += (dx / gap) * step;
          a.pixel.y += (dy / gap) * step;
          a.facing = facingFrom(a.cell, goal);
          a.stepClock += dtS;
          const frame = Math.floor(a.stepClock / STEP_S) % 2;
          a.body.texture = a.tex.walk[a.facing][frame];
          a.body.position.y = -Math.abs(Math.sin((a.stepClock * Math.PI) / STEP_S)) * BOB_PX;
          a.body.scale.y = 1;
        }

        a.view.position.set(a.pixel.x, a.pixel.y);
        const cell = roundCell(worldToMap(a.pixel.x, a.pixel.y));
        if (cell.x !== a.cell.x || cell.y !== a.cell.y) {
          a.cell = cell;
          a.view.zIndex = cell.x + cell.y + Z_CAST;
        }
        a.body.scale.x = a.facing === "W" ? -1 : 1;
      }
    },

    // Destroying each holder detaches it from the parent too, so the room's
    // container is left exactly as clean as if nobody had ever been in it.
    destroy() {
      for (const a of actors) a.view.destroy({ children: true });
      actors.length = 0;
    },
  };
}

/** Standing still: face the way they were left, and breathe. */
function idlePose(a: Actor, elapsed: number, reduced: boolean): void {
  a.body.position.y = a.member.seated ? 4 : 0;
  a.body.scale.x = a.facing === "W" ? -1 : 1;
  const rest = a.member.seated ? 0.82 : 1;
  a.body.scale.y = reduced ? rest : rest * (1 + BREATH * Math.sin(elapsed * 2 + a.phase));
}
