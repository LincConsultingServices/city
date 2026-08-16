// The cloud itself — one reusable Pixi object: a plain comic speech balloon, a
// light plate under a heavy near-black outline with a tail leaning off its
// underside. It inverts the street's venue sign (world/CityCanvas.tsx), which is
// dark ink under a gold hairline, and that is the point. Outdoors a sign names a
// place you can walk into; in here somebody is speaking, and speech is the one
// thing in the building that gets to be louder than the room.
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
import { CLOUD_PAD_X, CLOUD_PAD_Y, cloudOval, ovalRim, ovalSteps, type CloudOval } from "./cloud";

/**
 * The balloon's plate, and the ink used for both its outline and its text — the
 * building's one ink, which reads as black at this size and keeps the balloon
 * from being the only pure black in a room of oxbloods and dark woods.
 */
const CLOUD_FILL = 0xe7e7e7;
const CLOUD_INK = 0x11151f;
/**
 * Heavy rather than a hairline: a comic balloon's outline is a fraction of its
 * own width, not of the display's, and a 1px edge around a 150px plate reads as
 * a sticker.
 */
const CLOUD_EDGE_W = 2;
/**
 * A line longer than this wraps. Wide enough for a tracker line on one row and
 * for a chosen option — which the content rules hold to 13–33 words — on four or
 * five, and narrow enough that the cloud never spans the room it is drawn in.
 */
const CLOUD_MAX_W = 250;

export interface Callout {
  /** Add this to whoever the cloud belongs to. */
  view: Container;
  /** Re-letter, re-cut and show it. An empty string hides it instead. */
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
      // Dark on a light plate, and no outline under it. The old light-on-dark
      // label carried a 1px dark stroke to hold it off the ink behind it; the
      // same trick here would only fur the glyphs, because the plate is already
      // the contrast.
      fill: CLOUD_INK,
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
  // Centred, not bottom-aligned: an oval is symmetric about its middle and the
  // text has to be too, or it rides up into the curve on one side.
  label.anchor.set(0.5, 0.5);
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

      // What the oval has to contain, not what it comes out as: `cloudOval`
      // grows it by √2 to get the box's corners onto the curve.
      const oval = cloudOval(label.width + CLOUD_PAD_X * 2, label.height + CLOUD_PAD_Y * 2);

      if (sprite) {
        // The tail is part of the art, so the sprite covers the balloon and the
        // tail together and its bottom edge sits on the origin.
        sprite.width = oval.a * 2;
        sprite.height = oval.b * 2 + oval.tailH;
        sprite.position.set(-oval.a, oval.top);
      } else if (plate) {
        plate.clear();
        outline(plate, oval);
        // Opaque, where the scalloped cloud let the room through at 0.9. A light
        // plate at that alpha picks up whatever is behind it and takes the dark
        // text down with it; a balloon that is hard to read is worse than one
        // that hides a chair.
        plate.fill(CLOUD_FILL).stroke({ color: CLOUD_INK, width: CLOUD_EDGE_W });
      }
      label.position.set(0, oval.cy);
      // Drawing a line is what makes it appear. The cast's cloud got away with
      // this because callOut() flips `visible` itself; the player's had nobody
      // to do that for it and stayed hidden with a perfectly good cloud in it.
      view.visible = true;
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
 * The balloon, as **one** closed path: the oval's rim from the right corner of
 * the tail's mouth over the top to the left corner, then the two curved edges of
 * the tail down to the point at the origin and back.
 *
 * One path rather than an ellipse with a tail stuck under it, and the reason
 * survives the fill going opaque: two abutting shapes would leave the oval's own
 * outline stroked straight across the mouth, with the tail hanging off a closed
 * balloon like a flag. Walking the whole silhouette once gives a single
 * continuous outline and a tail that is genuinely part of the shape.
 *
 * The rim is a polyline because Pixi's `arc` draws circles and this is an
 * ellipse, and because the mouth has to interrupt it at an arbitrary angle —
 * `ellipse()` would only draw the closed whole. At `ovalSteps` density its worst
 * chord falls under a sixteenth of a pixel short of the true curve, across every
 * line the building can produce.
 */
function outline(g: Graphics, oval: CloudOval): void {
  const rim = ovalRim(oval, ovalSteps(oval));

  g.moveTo(rim[0].x, rim[0].y);
  for (let i = 1; i < rim.length; i++) g.lineTo(rim[i].x, rim[i].y);
  // `rim` ends on the left corner of the mouth; `closePath` returns to rim[0],
  // which is the right corner the second curve already arrived at.
  g.quadraticCurveTo(oval.tail.left.x, oval.tail.left.y, 0, 0);
  g.quadraticCurveTo(oval.tail.right.x, oval.tail.right.y, oval.mouth.x, oval.mouth.y);
  g.closePath();
}
