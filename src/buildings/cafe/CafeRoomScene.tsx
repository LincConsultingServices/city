// The Café's illustrated room — a small, self-contained Pixi sub-scene the
// interior module hosts behind its hotspot cards (PRD_City_Frontend.md §7.1:
// an interior "may host its own Pixi sub-scene"; §12.6 confirms buildings own
// this choice locally). Static diorama, no ticker/animation needed — mounted
// once, destroyed on unmount, same Application lifecycle as <CityCanvas>.
import { useEffect, useRef } from "react";
import { Application, Graphics, Sprite } from "pixi.js";
import { loadCafeAssets, cafeTex } from "./assets";

const W = 640;
const H = 260;
const FLOOR_Y = 224;

export function CafeRoomScene() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let destroyed = false;
    let app: Application | null = null;
    const mount = mountRef.current;
    if (!mount) return;

    (async () => {
      const application = new Application();
      await application.init({
        width: W,
        height: H,
        background: 0xf3e6d3,
        antialias: true,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
      });
      await loadCafeAssets();
      if (destroyed) {
        application.destroy(true);
        return;
      }
      app = application;
      mount.appendChild(application.canvas);

      // Wall (upper) / floor (lower) backdrop — a warm, cozy split, not tiled art.
      const backdrop = new Graphics()
        .rect(0, 0, W, FLOOR_Y)
        .fill(0xf3e6d3)
        .rect(0, FLOOR_Y, W, H - FLOOR_Y)
        .fill(0xcda875)
        .rect(0, FLOOR_Y - 2, W, 2)
        .fill(0xb08d5f);
      application.stage.addChild(backdrop);

      const place = (key: Parameters<typeof cafeTex>[0], x: number, scale: number) => {
        const sprite = new Sprite(cafeTex(key));
        sprite.anchor.set(0.5, 1);
        sprite.position.set(x, FLOOR_Y + 4);
        sprite.scale.set(scale);
        application.stage.addChild(sprite);
        return sprite;
      };

      const rug = place("cafe_rug", W / 2, 0.85);
      rug.anchor.set(0.5, 0.5);
      rug.position.set(W / 2, FLOOR_Y - 20);

      place("cafe_counter", 110, 0.6);
      place("cafe_table", W / 2, 0.62);
      const shelf = place("cafe_shelf", W - 110, 0.58);
      const lamp = place("cafe_lamp", W - 110, 0.42);
      lamp.position.set(shelf.x, shelf.y - shelf.height + 6);
    })();

    return () => {
      destroyed = true;
      if (app) app.destroy(true, { children: true });
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className="mx-auto overflow-hidden rounded-xl border border-line"
      style={{ width: W, maxWidth: "100%" }}
      aria-hidden="true"
    />
  );
}
