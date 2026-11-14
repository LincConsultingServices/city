// The player's walking figure, live — the same rig and the same bake the city
// uses (world/characterArt.ts), so what the creator shows is exactly who walks
// out onto the street, not a drawing of them.
//
// Baked on the CITY's own renderer and copied out to a plain canvas. A second
// Pixi application would be simpler to write, but two in one page share state
// they should not: tearing the second one down broke the city's batcher, and
// the street stopped drawing behind the creator the moment it closed.
import { useEffect, useRef, useState } from "react";
import type { Renderer, Texture } from "pixi.js";
import { whenInteriorHost } from "@/framework/building/interiorStage";
import { bakePersonTextures, destroyTextures, type PersonPalette } from "@/world/characterArt";
import type { Cardinal } from "@/world/assets";
import { prefersReducedMotion } from "@/lib/motion";

const W = 120;
const H = 150;
/** How much bigger than on the street. */
const SCALE = 3;
const STEP_S = 0.28;
const FACINGS: Cardinal[] = ["S", "E", "N", "W"];

/** Every frame the preview shows, as plain canvases at the bake's own size. */
interface Frames {
  idle: Record<Cardinal, HTMLCanvasElement>;
  walk: Record<Cardinal, [HTMLCanvasElement, HTMLCanvasElement]>;
  /** The bake's size in world units — the canvases are larger, at its resolution. */
  w: number;
  h: number;
}

export function WorldFigurePreview({
  palette,
  facing,
  className = "",
}: {
  palette: PersonPalette;
  facing: Cardinal;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [renderer, setRenderer] = useState<Renderer | null>(null);
  const frames = useRef<Frames | null>(null);
  const facingRef = useRef(facing);
  facingRef.current = facing;

  // Borrow the city's renderer once it exists. Never destroy it.
  useEffect(() => {
    let live = true;
    void whenInteriorHost().then((h) => {
      if (live) setRenderer(h.app.renderer);
    });
    return () => {
      live = false;
    };
  }, []);

  // Re-bake whenever the look changes, copy the frames out, free the textures.
  const key = JSON.stringify(palette);
  useEffect(() => {
    if (!renderer) return;
    let tex: ReturnType<typeof bakePersonTextures> | null = null;
    try {
      const baked = bakePersonTextures(renderer, palette);
      tex = baked;
      const out = (t: Texture) => renderer.extract.canvas({ target: t }) as HTMLCanvasElement;
      frames.current = {
        idle: Object.fromEntries(FACINGS.map((f) => [f, out(baked.idle[f])])) as Frames["idle"],
        walk: Object.fromEntries(
          FACINGS.map((f) => [f, [out(baked.walk[f][0]), out(baked.walk[f][1])]]),
        ) as Frames["walk"],
        w: baked.idle.S.width,
        h: baked.idle.S.height,
      };
    } catch {
      frames.current = null; // no preview; the portrait still shows the look
    } finally {
      if (tex) destroyTextures(tex.all);
    }
    // `key` stands for the palette's contents.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [renderer, key]);

  // Draw: a few steps, then a pause — walking on the spot reads as nervous.
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const reduced = prefersReducedMotion();
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    let raf = 0;
    const started = performance.now();

    const draw = (now: number) => {
      const f = frames.current;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (f) {
        const face = facingRef.current;
        const cycle = ((now - started) / 1000) % 3.2;
        const img =
          !reduced && cycle < 2 ? f.walk[face][Math.floor(cycle / STEP_S) % 2] : f.idle[face];
        const w = f.w * SCALE * dpr;
        const h = f.h * SCALE * dpr;
        ctx.imageSmoothingEnabled = false;
        // Feet at the bottom centre, as on the street.
        ctx.translate(canvas.width / 2, canvas.height - 14 * dpr);
        ctx.fillStyle = "rgba(0,0,0,0.25)";
        ctx.beginPath();
        ctx.ellipse(0, 0, 5 * SCALE * dpr, 2 * SCALE * dpr, 0, 0, Math.PI * 2);
        ctx.fill();
        if (face === "W") ctx.scale(-1, 1);
        ctx.drawImage(img, -w / 2, -h, w, h);
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [renderer]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={className}
      style={{ width: W, height: H }}
    />
  );
}
