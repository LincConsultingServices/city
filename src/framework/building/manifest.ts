// Building manifest — the plug-in contract's only registration point (PRD §7.1).
// Ported from the Godot F0 (core/building_manifest.gd). The serializable fields are
// Zod-validated; `interior` is a lazy React module loader (or null → framework
// overlay), kept out of the data schema since a function can't be serialized.
import { z } from "zod";
import type { ComponentType } from "react";

const Tile = z.tuple([z.number(), z.number()]);

export const ExteriorSchema = z.object({
  atlas: z.string().optional(),
  sprite: z.string().optional(),
  footprintTiles: z.array(Tile).min(1),
  entranceTile: Tile,
});

// The data (serializable) half of a manifest — what validate() checks.
export const BuildingManifestDataSchema = z.object({
  id: z.string().min(1),
  displayName: z.string().min(1),
  district: z.string().min(1),
  exterior: ExteriorSchema,
  hostedActivities: z.array(z.string()),
  owner: z.string().min(1),
  enabled: z.boolean(),
});
export type BuildingManifestData = z.infer<typeof BuildingManifestDataSchema>;

/** Props every building interior module receives from the framework. */
export interface InteriorProps {
  manifest: BuildingManifest;
  onExit: () => void;
}

/** Full manifest = data + the lazy interior loader (null → overlay mode). */
export type BuildingManifest = BuildingManifestData & {
  interior: (() => Promise<{ default: ComponentType<InteriorProps> }>) | null;
};

/**
 * Validate the serializable fields of a manifest. Returns an array of human-readable
 * error strings (empty = valid) — mirrors the Godot validator so bad manifests fail
 * with a clear message, not a crash. A null/absent interior is allowed (overlay mode).
 */
export function validateManifest(data: unknown): string[] {
  const result = BuildingManifestDataSchema.safeParse(data);
  if (result.success) return [];
  return result.error.issues.map((i) => {
    const path = i.path.join(".");
    return path ? `${path}: ${i.message}` : i.message;
  });
}
