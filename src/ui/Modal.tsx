// One modal shell for every panel.
//
// Five panels used to hand-roll this, and they had drifted: different widths,
// some with shadows and some without, one missing the entrance animation, one
// missing the backdrop blur, and close buttons that were bare glyphs with no
// hit area. Everything routes through here now so they stay consistent.
import { useEffect, type ReactNode } from "react";
import { Icon } from "./Icon";
import { audio } from "@/framework/audio/audioManager";

export type ModalWidth = "sm" | "md" | "lg";

const WIDTH: Record<ModalWidth, string> = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
};

export function Modal({
  onClose,
  children,
  width = "md",
  /** Sits above the world HUD; the activity player stacks above other panels. */
  z = 20,
  labelledBy,
  className = "",
}: {
  onClose: () => void;
  children: ReactNode;
  width?: ModalWidth;
  z?: number;
  labelledBy?: string;
  className?: string;
}) {
  // Escape is handled globally by CityScreen for world panels, but a modal
  // opened from anywhere else still deserves it.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="absolute inset-0 grid animate-fade-in place-items-center bg-ink/70 p-4 backdrop-blur-sm"
      style={{ zIndex: z }}
      onClick={() => {
        audio.play("ui_close");
        onClose();
      }}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className={`max-h-[88vh] w-full ${WIDTH[width]} animate-pop-in overflow-y-auto rounded-2xl border border-line bg-surface p-6 shadow-2xl ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

/** Consistent close affordance: a real 32px target, not a bare glyph. */
export function ModalClose({ onClose, label = "Close" }: { onClose: () => void; label?: string }) {
  return (
    <button
      onClick={() => {
        audio.play("ui_close");
        onClose();
      }}
      className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted transition hover:bg-surface-2 hover:text-text"
      aria-label={label}
    >
      <Icon name="cross" className="h-3.5 w-3.5" />
    </button>
  );
}
