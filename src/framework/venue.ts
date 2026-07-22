// Venue enter/exit — the overlay flow, split out of router.tsx so the router
// file stays component-only (clean fast-refresh). F0 venue model: interior:null
// → the framework runs the venue as an overlay over the live city, so "exit →
// same spot" is free (the city never unloaded).

import type { BuildingManifest } from '@/framework/building';
import { events } from '@/framework/events';
import { useUiStore } from '@/framework/stores/uiStore';
import { useWorldStore } from '@/framework/stores/worldStore';

/** Open a venue as an overlay above the live city. */
export function enterBuilding(manifest: BuildingManifest): void {
  if (useUiStore.getState().activeOverlay) return;
  useUiStore.getState().setOverlay(manifest.id);
  events.emit('building_entered', { id: manifest.id });
}

export function exitBuilding(): void {
  const id = useUiStore.getState().activeOverlay;
  if (!id) return;
  useUiStore.getState().setOverlay(null);
  useWorldStore.getState().markVisited(id); // unlock fast travel after first visit (PRD §6.6)
  events.emit('building_exited', { id });
}
