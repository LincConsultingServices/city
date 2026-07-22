// BuildingManifest — the plug-in contract (PRD §7.1). A building is a folder
// `src/buildings/<id>/` whose `manifest.ts` is the ONLY registration point. The
// city holds NO hardcoded venues; the world instances from the loaded manifests.
// Ported as a concept from the Godot F0 (core/building_manifest.gd).
//
// validateManifest() is pure and unit-tested: a malformed manifest is reported
// and skipped (a clear error, never a crash — PRD §18).

import type { Cell } from '@/lib/iso';

export type Tile = [number, number];

export interface BuildingExterior {
  /** Texture atlas key, or null → gray-box exterior until the §14 art pass. */
  atlas?: string | null;
  sprite?: string | null;
  footprintTiles: Tile[];
  entranceTile: Tile;
}

/** A lazy interior module loader, or null → run in the framework overlay. */
export type InteriorLoader = (() => Promise<unknown>) | null;

export interface BuildingManifest {
  id: string;
  displayName: string;
  district: string;
  exterior: BuildingExterior;
  interior: InteriorLoader;
  /** Canonical registry IDs — the venue model (PRD §7.1). */
  hostedActivities: string[];
  owner: string;
  /** false → renders Locked, door refuses politely (PRD §6.5). */
  enabled: boolean;
}

// ── Validation (pure; returns human-readable problems, empty = ok) ───────────
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isTile = (v: unknown): v is Tile =>
  Array.isArray(v) && v.length === 2 && isNum(v[0]) && isNum(v[1]);

export function validateManifest(m: unknown): string[] {
  const errors: string[] = [];
  if (!m || typeof m !== 'object') return ['manifest is not an object'];
  const o = m as Record<string, unknown>;

  for (const key of ['id', 'displayName', 'district', 'owner'] as const) {
    if (typeof o[key] !== 'string' || (o[key] as string).trim() === '') {
      errors.push(`missing required string '${key}'`);
    }
  }
  if (typeof o.enabled !== 'boolean') errors.push("missing boolean 'enabled'");
  if (!Array.isArray(o.hostedActivities)) errors.push("missing array 'hostedActivities'");

  if (o.interior !== null && typeof o.interior !== 'function' && o.interior !== undefined) {
    errors.push("'interior' must be a loader function or null");
  }

  const ext = o.exterior as Record<string, unknown> | undefined;
  if (!ext || typeof ext !== 'object') {
    errors.push("missing object 'exterior'");
  } else {
    const fp = ext.footprintTiles;
    if (!Array.isArray(fp) || fp.length === 0 || !fp.every(isTile)) {
      errors.push('exterior.footprintTiles must be a non-empty array of [x,y] pairs');
    }
    if (!isTile(ext.entranceTile)) {
      errors.push('exterior.entranceTile must be an [x,y] pair');
    }
  }

  return errors;
}

// ── Convenience accessors ────────────────────────────────────────────────────
export const footprintCells = (m: BuildingManifest): Cell[] =>
  m.exterior.footprintTiles.map(([x, y]) => ({ x, y }));

export const entranceCell = (m: BuildingManifest): Cell => ({
  x: m.exterior.entranceTile[0],
  y: m.exterior.entranceTile[1],
});

// ── Registry loader (Vite glob — no filesystem scan) ─────────────────────────
/**
 * Load + validate every manifest under `src/buildings/`. Invalid manifests are
 * logged and skipped so one bad building never breaks the city.
 */
export function loadManifests(): BuildingManifest[] {
  const modules = import.meta.glob('/src/buildings/*/manifest.ts', { eager: true }) as Record<
    string,
    { manifest?: unknown }
  >;
  const out: BuildingManifest[] = [];
  for (const [path, mod] of Object.entries(modules)) {
    const errors = validateManifest(mod.manifest);
    if (errors.length > 0) {
      console.error(`[building] ${path} is invalid:\n  - ${errors.join('\n  - ')}`);
      continue;
    }
    out.push(mod.manifest as BuildingManifest);
  }
  return out;
}

let _cache: BuildingManifest[] | null = null;

/** Memoized manifest list (loaded once). */
export function allManifests(): BuildingManifest[] {
  if (_cache === null) _cache = loadManifests();
  return _cache;
}

export function getManifestById(id: string): BuildingManifest | undefined {
  return allManifests().find((m) => m.id === id);
}
