// Session store (Zustand) — auth state + bootstrap payload. Read by React UI
// via the hook and by non-React code (session.ts) via getState(). This is the
// "/me substitute": modules + registry version from GET /registry/modules feed
// the HUD and building "new content" states.

import { create } from 'zustand';

export interface SessionUser {
  uid: string;
  email: string;
  displayName: string;
}

export type SessionStatus = 'anon' | 'authing' | 'ready';

interface SessionState {
  status: SessionStatus;
  user: SessionUser | null;
  modules: unknown[];
  registryVersion: string;

  setAuthing: () => void;
  setUser: (user: SessionUser | null) => void;
  setBootstrap: (p: { modules: unknown[]; registryVersion: string }) => void;
  reset: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  status: 'anon',
  user: null,
  modules: [],
  registryVersion: '',

  setAuthing: () => set({ status: 'authing' }),
  setUser: (user) => set({ user }),
  setBootstrap: ({ modules, registryVersion }) =>
    set({ status: 'ready', modules, registryVersion }),
  reset: () => set({ status: 'anon', user: null, modules: [], registryVersion: '' }),
}));
