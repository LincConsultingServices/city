/// <reference types="vite/client" />

// Env is resolved centrally in framework/config/appConfig.ts. Both the canonical
// VITE_* names and the main frontend's NEXT_PUBLIC_* names are exposed (see the
// envPrefix in vite.config.ts), so the existing .env drops in verbatim.
interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY?: string;
  readonly VITE_FIREBASE_PROJECT_ID?: string;
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_REGISTER_URL?: string;
  readonly NEXT_PUBLIC_FIREBASE_API_KEY?: string;
  readonly NEXT_PUBLIC_FIREBASE_PROJECT_ID?: string;
  readonly NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN?: string;
  readonly NEXT_PUBLIC_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
