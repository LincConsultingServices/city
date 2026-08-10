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
import { Container, Graphics, Sprite, Text, type Renderer, type Texture } from "pixi.js";
import { mapToWorld, roundCell, worldToMap } from "@/lib/iso";
import { bakePersonTextures, bakeShadowTexture, type PersonTextures } from "@/world/characterArt";
import type { Cardinal } from "@/world/assets";
import type { Cell } from "@/lib/pathfinding";
import {
  CAST_PAUSE_S,
  CAST_WALK_SPEED,
  facingFrom,
  type CastAt,
  type CastId,
  type CastMember,
} from "./cast";
import { Z_CAST } from "./scene";

/** Slower than the player's 0.18 — a shorter stride for a slower walk. */
const STEP_S = 0.26;
const BOB_PX = 2;
const BREATH = 0.012;

/** How far above the top of somebody's head the cloud's tail points. */
const CLOUD_LIFT = 8;
/** Half the walk bob, so it drifts rather than bounces. */
const CLOUD_FLOAT = 1.5;
const CLOUD_PAD_X = 9;
const CLOUD_PAD_Y = 5;
const TAIL_W = 10;
const TAIL_H = 6;
/** The venue sign's own colours (world/CityCanvas.tsx) — one UI language. */
const CLOUD_INK = 0x11151f;
const CLOUD_EDGE = 0xe2be78;

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
  /** Seconds of ambient movement still to play. */
  nudge: number;
}

export interface CastView {
  /** Everything baked here, for the canvas's teardown stack to free. */
  textures: Texture[];
  /**
   * `player` is the cell the player is standing on this frame. `present` is who
   * the world says is in the room — Marcus goes when the regulars thin out, and
   * his chair being visibly empty is the point of week 18.
   */
  update(dtS: number, player: Cell, present: ReadonlySet<CastId>): void;
  /**
   * Where everyone is standing right now. The room asks this rather than reading
   * anchors, so the prompt to speak to somebody tracks the person and not the
   * spot they started from.
   */
  positions(): CastAt[];
  /**
   * A one-off movement from the ambient layer: Priya wiping down, Marcus turning
   * a page (PRD §6). Deliberately not a new animation — it is a short squash on
   * the frame they are already showing, which at this size reads as somebody
   * shifting in their seat and costs no textures. Ignored for anyone not in the
   * room, and ignored under reduced motion.
   */
  nudge(id: CastId): void;
  /**
   * Float one line over one person's head, or nobody's — the answer to "who am
   * I meant to walk up to", said in the picture instead of only in the corner.
   *
   * The line is the tracker's own and must stay that way: a cloud that said
   * something the DOM did not is a consequence half the audience never receives
   * (PRD §15). `null` takes it down.
   *
   * Safe to call every frame; unchanged arguments are two comparisons.
   */
  callOut(id: CastId | null, line: string): void;
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
      nudge: 0,
    };
  });

  let elapsed = 0;

  // The callout cloud. One for the whole room rather than one per person: only
  // ever one objective is live, so only ever one cloud is up, and a single Text
  // swapping its string costs a fraction of six of them standing idle.
  let cloud: Cloud | null = null;
  let calledOn: CastId | null = null;
  let calledLine = "";

  return {
    textures,

    nudge(id) {
      if (reduced) return;
      const a = actors.find((x) => x.member.id === id);
      if (a?.view.visible) a.nudge = NUDGE_S;
    },

    callOut(id, line) {
      if (calledOn === id && calledLine === line) return;
      calledOn = id;
      calledLine = line;

      const actor = id ? actors.find((a) => a.member.id === id) : undefined;
      if (!actor || !line) {
        if (cloud) cloud.view.visible = false;
        return;
      }

      // Built on the first callout, not up front: every mission opens on
      // something that is not a person, so the room is always on screen for a
      // while before this is needed and sometimes never needs it at all.
      cloud ??= buildCloud();
      drawCloud(cloud, line);

      // Parented to the person rather than to the room, which is what makes the
      // cloud free: it tracks them as they walk with no projection maths, and it
      // goes when they go, because the holder's own `visible` is the one the
      // update loop below already flips against the present set. Nadia's cloud
      // appears the frame her sprite does, two seconds after the bell.
      if (cloud.view.parent !== actor.view) actor.view.addChild(cloud.view);
      // `body` is anchored (0.5, 1) at the holder's origin, so the top of the
      // head is one scaled body-height up from it — plus the sitting offset for
      // anyone at a table.
      cloud.baseY = actor.body.position.y - actor.body.height - CLOUD_LIFT;
      cloud.view.position.set(0, cloud.baseY);
      cloud.view.visible = true;
    },

    // Only people who are actually in the room. Somebody hidden must not still
    // be answering the prompt to speak to them from behind the scenery.
    positions: () =>
      actors.filter((a) => a.view.visible).map((a) => ({ member: a.member, cell: a.cell })),

    update(dtS, player, present) {
      elapsed += dtS;

      // A slow drift, not a bounce. It has to be the thing on screen that moves
      // when nothing else does — that is the whole reason it is a cloud and not
      // a static label — without becoming an attract-mode animation.
      if (cloud && !reduced && cloud.view.visible) {
        cloud.view.position.y = cloud.baseY + Math.sin(elapsed * 1.6) * CLOUD_FLOAT;
      }

      for (const a of actors) {
        const { member } = a;
        const here = present.has(member.id);
        if (a.view.visible !== here) a.view.visible = here;
        if (!here) {
          a.nudge = 0;
          continue;
        }
        if (a.nudge > 0) a.nudge = Math.max(0, a.nudge - dtS);
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
      // First, and explicitly: the cloud carries a Text, whose texture is not in
      // the `textures` list the canvas frees, and it may be sitting unparented
      // if it was never called out. Destroying it here covers both.
      cloud?.view.destroy({ children: true, texture: true });
      cloud = null;
      calledOn = null;
      calledLine = "";
      for (const a of actors) a.view.destroy({ children: true });
      actors.length = 0;
    },
  };
}

/** How long a wipe or a page turn takes. */
const NUDGE_S = 0.9;
/** How far it squashes them. Twice the breath, so it reads without being a gag. */
const NUDGE = 0.03;

/** Standing still: face the way they were left, and breathe. */
function idlePose(a: Actor, elapsed: number, reduced: boolean): void {
  a.body.position.y = a.member.seated ? 4 : 0;
  a.body.scale.x = a.facing === "W" ? -1 : 1;
  const rest = a.member.seated ? 0.82 : 1;
  if (reduced) {
    a.body.scale.y = rest;
    return;
  }
  // The nudge rides on top of the breath rather than replacing it — one full
  // cycle over NUDGE_S, tapering as it runs out, so it settles rather than snaps.
  const breath = BREATH * Math.sin(elapsed * 2 + a.phase);
  const k = a.nudge / NUDGE_S;
  const move = k > 0 ? NUDGE * k * Math.sin((1 - k) * Math.PI * 2) : 0;
  a.body.scale.y = rest * (1 + breath + move);
}

interface Cloud {
  view: Container;
  plate: Graphics;
  label: Text;
  /** Where the tail points before the float is added on top. */
  baseY: number;
}

/**
 * The cloud is built at the shape of the city's venue sign
 * (world/CityCanvas.tsx) — backed plate, hairline gold edge, Outfit — because a
 * player who has just walked in off Market Street has been reading those for
 * five minutes and should not have to learn a second kind of label indoors.
 *
 * Its origin is the tail's point, so placing it is "put this at the top of the
 * head" and nothing else.
 */
function buildCloud(): Cloud {
  const view = new Container();
  const plate = new Graphics();
  const label = new Text({
    text: "",
    style: {
      fill: 0xf3f6fb,
      stroke: { color: 0x0f121a, width: 1 },
      fontFamily: "Outfit, sans-serif",
      fontSize: 13,
      fontWeight: "600",
    },
    // Baked above the renderer's density: the room is scaled to fit the viewport
    // and a rasterised label scaled up is a blurry label.
    resolution: Math.max(2, Math.ceil(window.devicePixelRatio || 1) * 2),
  });
  label.anchor.set(0.5, 1);
  view.addChild(plate, label);
  view.visible = false;
  return { view, plate, label, baseY: 0 };
}

/** Re-letter the cloud and re-cut the plate to fit. */
function drawCloud(cloud: Cloud, line: string): void {
  const { plate, label } = cloud;
  label.text = line;

  const w = label.width + CLOUD_PAD_X * 2;
  const h = label.height + CLOUD_PAD_Y * 2;
  plate.clear();
  plate
    .roundRect(-w / 2, -h - TAIL_H, w, h, 8)
    .fill({ color: CLOUD_INK, alpha: 0.9 })
    .stroke({ color: CLOUD_EDGE, alpha: 0.55, width: 1 });
  // The tail is a second path so the plate keeps its own closed outline: one
  // combined path would stroke the seam and leave a line drawn across the mouth.
  plate
    .poly([-TAIL_W / 2, -TAIL_H, TAIL_W / 2, -TAIL_H, 0, 0])
    .fill({ color: CLOUD_INK, alpha: 0.9 });
  plate
    .moveTo(-TAIL_W / 2, -TAIL_H)
    .lineTo(0, 0)
    .lineTo(TAIL_W / 2, -TAIL_H)
    .stroke({ color: CLOUD_EDGE, alpha: 0.55, width: 1 });

  label.position.set(0, -CLOUD_PAD_Y - TAIL_H);
}
