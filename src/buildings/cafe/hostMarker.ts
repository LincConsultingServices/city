// The marker over whoever you are wanted by — "go and talk to this person".
//
// A gold tag with their name, and a chevron under it that bobs gently, floating
// over their head. It appears only while a stage is waiting for you to go to
// its host (roomStore.awaitsHost), and only while nothing else is on screen, so
// it marks the next thing to do rather than decorating the room.
//
// Sorted above everything in the room: a marker hidden behind the counter or a
// table would defeat the point of it.
import { Container, Graphics, Text } from "pixi.js";
import { CAFE_PALETTE } from "./props";

/** How far above someone's feet the marker floats, standing and sitting. */
const LIFT_STANDING = 64;
const LIFT_SEATED = 56;

export interface HostMarker {
  view: Container;
  /** `at` null hides it. `name` is only re-rendered when it changes. */
  update(elapsed: number, at: { x: number; y: number; seated: boolean } | null, name: string): void;
}

export function createHostMarker(reduced: boolean): HostMarker {
  const view = new Container();
  view.zIndex = 10_000;
  view.visible = false;

  const label = new Text({
    text: "",
    style: {
      fill: CAFE_PALETTE.espresso,
      fontFamily: "Outfit, sans-serif",
      fontSize: 13,
      fontWeight: "700",
    },
    resolution: Math.max(2, Math.ceil(window.devicePixelRatio || 1) * 2),
  });
  label.anchor.set(0.5, 0.5);

  const plate = new Graphics();
  const chevron = new Graphics()
    .poly([-8, 0, 8, 0, 0, 9])
    .fill(CAFE_PALETTE.brass)
    .stroke({ color: CAFE_PALETTE.espresso, width: 1.5, alpha: 0.7 });

  view.addChild(plate, label, chevron);

  let shownName = "";

  function drawPlate() {
    const w = label.width + 18;
    const h = label.height + 8;
    plate.clear();
    plate.roundRect(-w / 2, -h / 2, w, h, h / 2).fill({ color: CAFE_PALETTE.lamp });
    plate
      .roundRect(-w / 2, -h / 2, w, h, h / 2)
      .stroke({ color: CAFE_PALETTE.espresso, width: 1.5, alpha: 0.6 });
    chevron.position.set(0, h / 2 + 2);
  }

  return {
    view,
    update(elapsed, at, name) {
      if (!at) {
        view.visible = false;
        return;
      }
      if (name !== shownName) {
        shownName = name;
        label.text = name;
        drawPlate();
      }
      const bob = reduced ? 0 : Math.sin(elapsed * 3) * 3;
      view.position.set(at.x, at.y - (at.seated ? LIFT_SEATED : LIFT_STANDING) - 22 + bob);
      view.visible = true;
    },
  };
}
