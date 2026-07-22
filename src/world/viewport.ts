// viewport — a mutable singleton the Pixi camera writes each frame, so DOM
// overlays (WorldPrompt) can project world→screen without going through React
// state at 60fps (PRD §12.2). Written by the camera, read by DOM via its own rAF.

export const viewport = {
  scale: 1,
  offsetX: 0,
  offsetY: 0,
  width: 0,
  height: 0,
};

export function worldToScreen(wx: number, wy: number): { x: number; y: number } {
  return {
    x: wx * viewport.scale + viewport.offsetX,
    y: wy * viewport.scale + viewport.offsetY,
  };
}

export function screenToWorld(sx: number, sy: number): { x: number; y: number } {
  return {
    x: (sx - viewport.offsetX) / viewport.scale,
    y: (sy - viewport.offsetY) / viewport.scale,
  };
}
