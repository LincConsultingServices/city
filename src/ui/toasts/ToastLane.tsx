// ToastLane (PRD §9.1) — top-center transient messages (badges, errors, info).
// Reads uiStore.toasts; each toast auto-dismisses. A polite live region so
// screen readers announce changes (PRD §16).

import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useUiStore } from '@/framework/stores/uiStore';

const DISMISS_MS = 3200;

const LEVEL_CLASS: Record<string, string> = {
  info: 'border-white/15 bg-black/70 text-white',
  success: 'border-accent/40 bg-accent/15 text-accent',
  error: 'border-red-400/40 bg-red-500/15 text-red-100',
};

export function ToastLane() {
  const toasts = useUiStore((s) => s.toasts);
  const removeToast = useUiStore((s) => s.removeToast);

  useEffect(() => {
    if (toasts.length === 0) return;
    const timers = toasts.map((t) => setTimeout(() => removeToast(t.id), DISMISS_MS));
    return () => timers.forEach(clearTimeout);
  }, [toasts, removeToast]);

  return (
    <div
      className="pointer-events-none absolute left-1/2 top-4 z-40 flex -translate-x-1/2 flex-col items-center gap-2"
      role="status"
      aria-live="polite"
    >
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className={`rounded-full border px-4 py-2 text-sm backdrop-blur ${LEVEL_CLASS[t.level] ?? LEVEL_CLASS.info}`}
          >
            {t.message}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
