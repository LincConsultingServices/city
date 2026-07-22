// WorldPrompt (PRD §6.3) — a DOM "Press E" prompt anchored to a venue's entrance
// in WORLD space. It follows the camera each frame via its own rAF reading the
// viewport singleton (no React re-render at 60fps). Keyboard-accessible: it is a
// real button, so clicking it enters too.

import { useEffect, useRef } from 'react';
import { mapToWorld } from '@/lib/iso';
import { entranceCell, getManifestById } from '@/framework/building';
import { events } from '@/framework/events';
import { enterBuilding } from '@/framework/venue';
import { useWorldStore } from '@/framework/stores/worldStore';
import { worldToScreen } from '@/world/viewport';

export function WorldPrompt() {
  const near = useWorldStore((s) => s.nearestVenue);
  const ref = useRef<HTMLButtonElement>(null);
  const manifest = near ? getManifestById(near.id) : undefined;

  useEffect(() => {
    if (!near || !manifest) return;
    const ent = entranceCell(manifest);
    const world = mapToWorld(ent);
    let raf = 0;
    const loop = () => {
      const s = worldToScreen(world.x, world.y);
      if (ref.current) {
        ref.current.style.transform = `translate(-50%, -180%) translate(${s.x}px, ${s.y}px)`;
      }
      raf = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(raf);
  }, [near, manifest]);

  if (!near || !manifest) return null;

  const onActivate = () => {
    if (manifest.enabled) enterBuilding(manifest);
    else
      events.emit('toast_requested', {
        message: `${manifest.displayName} is locked for now.`,
        level: 'info',
      });
  };

  return (
    <button
      ref={ref}
      type="button"
      onClick={onActivate}
      className="pointer-events-auto fixed left-0 top-0 z-20 whitespace-nowrap rounded-full border border-white/15 bg-black/70 px-3 py-1.5 text-sm text-white shadow-lg backdrop-blur"
    >
      {manifest.enabled ? (
        <>
          <kbd className="mr-1 rounded bg-white/15 px-1.5 py-0.5 text-xs">E</kbd>
          {manifest.displayName}
        </>
      ) : (
        <>🔒 {manifest.displayName} — locked</>
      )}
    </button>
  );
}
