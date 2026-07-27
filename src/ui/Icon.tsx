// Icon set — Kenney's CC0 "Game Icons" pack (see public/assets/ASSETS_LICENSES.md).
//
// Rendered as a CSS mask rather than an <img>: the source PNGs are white-on-
// transparent, so masking a currentColor block gives us icons that inherit text
// colour, hover states and the design tokens for free. An <img> would be stuck
// white and need a filter hack to tint.
//
// This replaces emoji and typographic stand-ins (¢, 🏅, 🎉, ✕, ★, ✓, ▲▼) which
// rendered differently on every platform and clashed with the flat art style.

export type IconName =
  | "coin"
  | "trophy"
  | "medal"
  | "medal-alt"
  | "star"
  | "check"
  | "cross"
  | "locked"
  | "arrow-up"
  | "arrow-down"
  | "arrow-right"
  | "audio-on"
  | "audio-off"
  | "info"
  | "warning"
  | "diamond"
  | "home";

export function Icon({
  name,
  className = "",
  title,
}: {
  name: IconName;
  /** Size via height/width utilities; colour follows the current text colour. */
  className?: string;
  /** Provide when the icon is the only label; omitted icons are decorative. */
  title?: string;
}) {
  const url = `url("/assets/icons/${name}.png")`;
  return (
    <span
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      title={title}
      className={`inline-block shrink-0 bg-current ${className || "h-4 w-4"}`}
      style={{
        maskImage: url,
        WebkitMaskImage: url,
        maskRepeat: "no-repeat",
        WebkitMaskRepeat: "no-repeat",
        maskPosition: "center",
        WebkitMaskPosition: "center",
        maskSize: "contain",
        WebkitMaskSize: "contain",
      }}
    />
  );
}
