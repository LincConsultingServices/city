// AppConfig — the one place environment values resolve. Web build: values come
// from Vite's import.meta.env (VITE_* names) at build time, and a
// window.__CITY_CONFIG__ hook, written by the container at start-up
// (nginx/40-city-config.sh), overrides them without a rebuild.
//
// CEO City is its own app with its own Firebase project: there is no default
// project to fall back on, so a missing key means sign-in is off, not that the
// game quietly signs in somewhere else.

export interface AppConfig {
  firebaseApiKey: string;
  firebaseProjectId: string;
  firebaseAuthDomain: string;
  apiBaseUrl: string;
  clientVersion: string;
}

const DEFAULT_API_BASE_URL = "http://localhost:8080";
export const CLIENT_VERSION = "city@0.1.0-f1"; // sent as clientVersion on submit (PRD §8.2)

const env = import.meta.env as Record<string, string | undefined>;

interface WindowConfig {
  firebaseApiKey?: string;
  firebaseProjectId?: string;
  firebaseAuthDomain?: string;
  apiBaseUrl?: string;
}

/** First present, non-empty value among the given env var names (priority order). */
function pickEnv(...names: string[]): string {
  for (const name of names) {
    const v = env[name]?.trim();
    if (v) return v;
  }
  return "";
}

/**
 * Normalise a backend base URL to the service ORIGIN that the client's hardcoded
 * "/api/v1/..." paths expect. Routes live at "/api/v1" off the root, so a
 * base URL given with a trailing "/api" would double up. Strip trailing
 * slashes, then one "/api", then slashes again.
 */
export function normalizeBaseUrl(raw: string): string {
  let u = raw.trim().replace(/\/+$/, "");
  if (u.endsWith("/api")) u = u.slice(0, -"/api".length);
  return u.replace(/\/+$/, "");
}

function resolve(): AppConfig {
  const win: WindowConfig =
    (typeof window !== "undefined" &&
      (window as unknown as { __CITY_CONFIG__?: WindowConfig }).__CITY_CONFIG__) ||
    {};

  const firebaseApiKey = win.firebaseApiKey || pickEnv("VITE_FIREBASE_API_KEY");
  const firebaseProjectId = win.firebaseProjectId || pickEnv("VITE_FIREBASE_PROJECT_ID");
  const firebaseAuthDomain =
    win.firebaseAuthDomain ||
    pickEnv("VITE_FIREBASE_AUTH_DOMAIN") ||
    (firebaseProjectId ? `${firebaseProjectId}.firebaseapp.com` : "");
  const apiBaseUrl = normalizeBaseUrl(
    win.apiBaseUrl || pickEnv("VITE_API_BASE_URL") || DEFAULT_API_BASE_URL,
  );

  return {
    firebaseApiKey,
    firebaseProjectId,
    firebaseAuthDomain,
    apiBaseUrl,
    clientVersion: CLIENT_VERSION,
  };
}

export const appConfig: AppConfig = resolve();

/** Sign-in is disabled until CEO City's Firebase key and project are both set. */
export const isConfigured = (): boolean =>
  appConfig.firebaseApiKey.length > 0 && appConfig.firebaseProjectId.length > 0;

/**
 * Dev-only world bypass: `VITE_DEV_WORLD=1 npm run dev` mounts CityScreen
 * without auth so the world can be eyeballed/screenshotted locally (Playwright
 * world spec). `import.meta.env.DEV` is statically false in production builds,
 * so this flag is dead-code-eliminated and can never ship.
 */
export const devWorldBypass: boolean = import.meta.env.DEV && pickEnv("VITE_DEV_WORLD") === "1";
