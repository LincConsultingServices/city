import { Suspense, lazy, useMemo } from "react";
import type { BuildingManifest } from "./manifest";

// Generic building-interior mount (PRD §7.2: "lazy-load interior module (or
// overlay)"). Any manifest with a non-null `interior` gets lazy-loaded and
// Suspense-mounted here. This is shared plumbing, never per-building logic — a
// building only ever supplies its own Interior module.
export function BuildingGate({
  manifest,
  onExit,
}: {
  manifest: BuildingManifest;
  onExit: () => void;
}) {
  const Interior = useMemo(
    () => (manifest.interior ? lazy(manifest.interior) : null),
    [manifest.interior],
  );

  if (!Interior) return null; // overlay mode: the caller renders its own panel

  return (
    <Suspense fallback={<EnteringOverlay />}>
      <Interior manifest={manifest} onExit={onExit} />
    </Suspense>
  );
}

function EnteringOverlay() {
  return (
    <div className="absolute inset-0 z-20 grid place-items-center bg-ink">
      <p className="text-sm text-muted">Entering…</p>
    </div>
  );
}
