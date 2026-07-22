// Router — the single owner of top-level flow + transitions (PRD §12.1):
// login ↔ city, plus venue enter/exit as an OVERLAY over the live city. Every
// transition fades (PRD §2 "nothing pops"). Ported from the Godot F0
// (autoload/scene_router.gd).
//
// F0 venue model: the placeholder venue has interior:null → the framework runs
// it as an overlay, so "exit → same spot" is free (the city never unloaded).

import { useEffect, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { events } from '@/framework/events';
import { useSessionStore } from '@/framework/stores/sessionStore';
import { useUiStore } from '@/framework/stores/uiStore';
import { Login } from '@/ui/login/Login';
import { CityScreen } from '@/ui/CityScreen';
import { VenueOverlay } from '@/ui/venue/VenueOverlay';
import { ToastLane } from '@/ui/toasts/ToastLane';

const FADE = { duration: 0.35 };

const Screen = ({ children }: { children: ReactNode }) => (
  <motion.div
    className="absolute inset-0"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={FADE}
  >
    {children}
  </motion.div>
);

export function AppRouter() {
  const status = useSessionStore((s) => s.status);
  const activeOverlay = useUiStore((s) => s.activeOverlay);

  // Wire the event bus into DOM state once (world→UI channel, PRD §12.2).
  useEffect(() => {
    const offToast = events.on('toast_requested', ({ message, level }) =>
      useUiStore.getState().addToast(message, level),
    );
    // Server-awarded badges surface as a celebratory toast (PRD §9.4).
    const offBadge = events.on('badge_awarded', ({ badge }) => {
      const name =
        badge && typeof badge === 'object' && 'name' in badge
          ? String((badge as { name: unknown }).name)
          : 'a badge';
      useUiStore.getState().addToast(`🏅 Badge earned: ${name}`, 'success');
    });
    // A token expiry the ApiClient couldn't refresh returns us to login.
    const offLost = events.on('session_lost', ({ reason }) => {
      if (reason !== 'logout') useSessionStore.getState().reset();
      useUiStore.getState().setOverlay(null);
    });
    return () => {
      offToast();
      offBadge();
      offLost();
    };
  }, []);

  return (
    <div className="relative h-full w-full overflow-hidden">
      <AnimatePresence mode="wait">
        {status === 'ready' ? (
          <Screen key="city">
            <CityScreen />
          </Screen>
        ) : (
          <Screen key="login">
            <Login />
          </Screen>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activeOverlay && <VenueOverlay key={activeOverlay} buildingId={activeOverlay} />}
      </AnimatePresence>

      <ToastLane />
    </div>
  );
}
