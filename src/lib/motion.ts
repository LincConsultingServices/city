// Reduced-motion preference (PRD §16: decorative animation must respect it —
// ambient actor counts are halved and particles/pulses disabled by callers).

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
