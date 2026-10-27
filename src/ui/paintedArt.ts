// Painted character art, wherever it has been dropped in. Kept out of
// Portrait.tsx so that file exports only components.
/**
 * Real artwork, where there is some. Any image at
 * src/assets/characters/<id>.png (or .webp) is picked up at build time and
 * shown instead of the drawn stand-in — no code change to add a character's
 * art. See docs/CHARACTER_ART_BRIEF.md for what each image should be.
 */
export const ART: Readonly<Record<string, string>> = Object.fromEntries(
  Object.entries(
    import.meta.glob<string>("../assets/characters/*.{png,webp}", {
      eager: true,
      query: "?url",
      import: "default",
    }),
  ).map(([path, url]) => [path.replace(/^.*\/([^/]+)\.(png|webp)$/, "$1"), url]),
);

/** True when painted art has been dropped in for this character. */
export function hasArt(id: string | undefined): boolean {
  return !!id && id in ART;
}

/** The painted art's URL for this character, if there is some. */
export function artFor(id: string | undefined): string | undefined {
  return id ? ART[id] : undefined;
}
