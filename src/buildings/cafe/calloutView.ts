// The cloud itself — one reusable Pixi object, in the city's venue-sign colours
// (world/CityCanvas.tsx): same ink, same hairline gold edge, same Outfit. The
// silhouette differs from the street's flat plate on purpose. Outdoors a sign
// names a place you can walk into; in here somebody is speaking.
//
// Extracted from castView.ts because there are now three things that want one
// and they hang off different parents: the objective marker and a speaker's line
// hang off a cast member, and the player's own reply hangs off the player, who
// is not part of the cast. The geometry is in cloud.ts and has no Pixi in it;
// this is only the drawing.
//
// **Its origin is the tail's point.** Placing one is "put this at the top of the
// head" and nothing else — no world→screen transform, because a cloud is added
// as a child of whoever it belongs to and rides their container.
import { Container, Graphics, NineSliceSprite, Text } from "pixi.js";
import { UI_SPRITE, cafeTex } from "./assets";
import {
  CLOUD_PAD_X,
  CLOUD_PAD_Y,
  TAIL_H,
  TAIL_W,
  cloudLobes,
  lobeArc,
  type CloudLobes,
} from "./cloud";

/** The venue sign's own colours — one UI language indoors and out. */
const CLOUD_INK = 0x11151f;
const CLOUD_EDGE = 0xe2be78;
/**
 * A line longer than this wraps. Wide enough for a tracker line on one row and
 * for a chosen option — which the content rules hold to 13–33 words — on four or
 * five, and narrow enough that the cloud never spans the room it is drawn in.
 */
const CLOUD_MAX_W = 250;

export interface Callout {
  /** Add this to whoever the cloud belongs to. */
  view: Container;
  /** Re-letter and re-cut it. Empty string hides it. */
  draw: (line: string) => void;
  visible: (on: boolean) => void;
  destroy: () => void;
}

export function createCallout(): Callout {
  const view = new Container();
  const art = UI_SPRITE.callout;
  const texture = art ? cafeTex(art.key) : undefined;

  let plate: Graphics | null = null;
  let sprite: NineSliceSprite | null = null;
  if (art && texture) {
    sprite = new NineSliceSprite({
      texture,
      leftWidth: art.slice.left,
      topHeight: art.slice.top,
      rightWidth: art.slice.right,
      bottomHeight: art.slice.bottom,
    });
    view.addChild(sprite);
  } else {
    plate = new Graphics();
    view.addChild(plate);
  }

  const label = new Text({
    text: "",
    style: {
      fill: 0xf3f6fb,
      stroke: { color: 0x0f121a, width: 1 },
      fontFamily: "Outfit, sans-serif",
      fontSize: 13,
      fontWeight: "600",
      align: "center",
      wordWrap: true,
      wordWrapWidth: CLOUD_MAX_W,
    },
    // Baked above the renderer's density: the room is scaled to fit the viewport
    // and a rasterised label scaled up is a blurry label.
    resolution: Math.max(2, Math.ceil(window.devicePixelRatio || 1) * 2),
  });
  label.anchor.set(0.5, 1);
  view.addChild(label);
  view.visible = false;

  let drawn = "";

  return {
    view,

    draw(line) {
      if (line === drawn) return;
      drawn = line;
      if (!line) {
        view.visible = false;
        return;
      }
      label.text = line;

      const w = label.width + CLOUD_PAD_X * 2;
      const h = label.height + CLOUD_PAD_Y * 2;

      if (sprite) {
        // The tail is part of the art, so the sprite covers the cloud and the
        // tail together and its bottom edge sits on the origin.
        sprite.width = w;
        sprite.height = h + TAIL_H;
        sprite.position.set(-w / 2, -(h + TAIL_H));
      } else if (plate) {
        plate.clear();
        outline(plate, w, cloudLobes(w, h));
        plate
          .fill({ color: CLOUD_INK, alpha: 0.9 })
          .stroke({ color: CLOUD_EDGE, alpha: 0.55, width: 1 });
      }
      label.position.set(0, -CLOUD_PAD_Y - TAIL_H);
    },

    visible(on) {
      view.visible = on && drawn !== "";
    },

    destroy() {
      // The sprite goes first and keeps its texture: that one belongs to Pixi's
      // `Assets` cache, which outlives this room. The Text's is generated here
      // and is ours to free. We destroy only what we made.
      sprite?.destroy({ texture: false, textureSource: false });
      view.destroy({ children: true, texture: true });
    },
  };
}

/**
 * The cloud, as **one** closed path: a scalloped top, straight sides, a flat
 * base, and the tail cut into that base at the origin.
 *
 * One path rather than two matters more than it looks. The fill is drawn at 0.9
 * alpha, so two overlapping shapes would show their overlap as a darker patch,
 * and two abutting shapes would leave the base's stroke drawn straight across
 * the tail's mouth. Walking the whole silhouette once gives a single fill and a
 * single continuous outline, and the tail is genuinely part of the cloud.
 *
 * The base is flat on purpose: it puts the tail on solid edge wherever the line
 * length lands, instead of in a valley between two bottom lobes.
 */
function outline(g: Graphics, w: number, lobes: CloudLobes): void {
  const { base, cy, first, d, count, r } = lobes;

  g.moveTo(-w / 2, base);
  g.lineTo(-w / 2, cy);
  for (let i = 0; i < count; i++) {
    const { start, end } = lobeArc(lobes, i);
    g.arc(first + d * i, cy, r, start, end);
  }
  g.lineTo(w / 2, base);
  g.lineTo(TAIL_W / 2, base);
  g.lineTo(0, 0);
  g.lineTo(-TAIL_W / 2, base);
  g.closePath();
}
