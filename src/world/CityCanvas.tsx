// CityCanvas — THE Pixi↔React boundary (PRD §12.2). One React component owns one
// PIXI.Application and one CityScene; React never re-renders the world. The
// StrictMode double-mount is handled by the `cancelled` guard + full teardown, so
// we never leak a second Application or a detached canvas.

import { useEffect, useRef } from 'react';
import { Application } from 'pixi.js';
import { CityScene } from './cityScene';
import { loadCityAssets } from './assets';

export function CityCanvas() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let scene: CityScene | null = null;
    let app: Application | null = null;
    let cancelled = false;

    const pending = new Application();
    pending
      .init({
        background: '#0d0f17',
        resizeTo: window,
        antialias: true,
        autoDensity: true,
        resolution: window.devicePixelRatio || 1,
        roundPixels: true,
      })
      .then(async () => {
        if (cancelled) {
          pending.destroy(true, { children: true });
          return;
        }
        await loadCityAssets(); // real CC0 sprites (tree); procedural fallback if missing
        if (cancelled) {
          pending.destroy(true, { children: true });
          return;
        }
        app = pending;
        host.appendChild(app.canvas);
        scene = new CityScene(app);
      })
      .catch((err) => {
        console.error('[CityCanvas] Pixi init failed', err);
      });

    return () => {
      cancelled = true;
      scene?.destroy();
      if (app) app.destroy(true, { children: true });
    };
  }, []);

  return <div ref={hostRef} className="absolute inset-0" aria-hidden="true" />;
}
