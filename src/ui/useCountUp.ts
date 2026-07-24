// rAF count-up tween for the HUD coin chip. Animates only between REAL
// server-provided balances — the first non-null balance renders instantly
// (never a fake 0→N), and reduced motion snaps straight to the value.
import { useEffect, useRef, useState } from "react";
import { prefersReducedMotion } from "@/lib/motion";

export function useCountUp(value: number | null, durationMs = 600): number | null {
  const [display, setDisplay] = useState(value);
  const prev = useRef(value);

  useEffect(() => {
    const from = prev.current;
    prev.current = value;
    if (value === null || from === null || from === value || prefersReducedMotion()) {
      setDisplay(value);
      return;
    }
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const k = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - k, 3);
      setDisplay(Math.round(from + (value - from) * eased));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, durationMs]);

  return display;
}
