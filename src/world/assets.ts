// City asset loader — loads the CC0 Kenney sprites used as real art (props) into
// a small cache before the scene builds. Falls back gracefully (procedural) if a
// texture is missing, so the world never depends on a fetch succeeding.

import { Assets, type Texture } from 'pixi.js';

const cache = new Map<string, Texture>();

const url = (p: string) => `${import.meta.env.BASE_URL}${p}`;

export async function loadCityAssets(): Promise<void> {
  try {
    const tree = await Assets.load<Texture>(url('assets/city/tree.png'));
    cache.set('tree', tree);
  } catch {
    /* missing → procedural fallback */
  }
}

export function cityTexture(key: string): Texture | undefined {
  return cache.get(key);
}
