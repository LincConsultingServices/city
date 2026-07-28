// The interior stage — how a building interior gets to draw.
//
// Buildings do NOT create their own PIXI.Application. Two Applications alive in
// one page breaks Pixi v8: the second renderer's existence corrupts the first
// one's batcher, the first throws out of its own ticker listener, and its RAF
// loop never reschedules. The city then renders nothing but its clear colour
// forever. Verified with an empty second Application and no textures at all —
// it is the second renderer itself, not anything drawn into it.
//
// So the world layer publishes its Application here, and an interior borrows it:
// hide the city's layers, add your own container, add a ticker callback, and put
// it all back on the way out.
import type { Application, Container } from "pixi.js";

export interface InteriorHost {
  /** The city's Application. Borrow it; never destroy it. */
  app: Application;
  /** Root to add interior containers to. Cleared by the interior on exit. */
  stage: Container;
  /** Hide the city's own layers so the interior has the screen to itself. */
  hideWorld: () => void;
  /** Put the city back exactly as it was. */
  showWorld: () => void;
}

let host: InteriorHost | null = null;
let waiters: Array<(h: InteriorHost) => void> = [];

/** Called by the world layer once its Application is built, and with null on teardown. */
export function registerInteriorHost(next: InteriorHost | null): void {
  host = next;
  if (!next) return;
  const pending = waiters;
  waiters = [];
  for (const resolve of pending) resolve(next);
}

/**
 * Resolves once the city's Application exists. An interior can mount before the
 * world has finished booting, so this waits rather than failing.
 */
export function whenInteriorHost(): Promise<InteriorHost> {
  if (host) return Promise.resolve(host);
  return new Promise((resolve) => waiters.push(resolve));
}
