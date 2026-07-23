// AppConfig — the one place environment values resolve. Ported from the Godot F0
// (config/app_config.gd). Web build: values come from Vite's import.meta.env at
// build time, accepting BOTH our canonical VITE_* names and the main WarRoom
// frontend's NEXT_PUBLIC_* names (see envPrefix in vite.config.ts), so the
// existing .env drops in verbatim. A window.__CITY_CONFIG__ hook allows
// hosting-time override without a rebuild.

export interface AppConfig {
  firebaseApiKey: string;
  firebaseProjectId: string;
  firebaseAuthDomain: string;
  apiBaseUrl: string;
  registerUrl: string;
  clientVersion: string;
}

const DEFAULT_PROJECT_ID = "warroom-498513"; // PRD §10; confirmed in backend .env.example
const DEFAULT_API_BASE_URL = "http://localhost:8080";
const DEFAULT_REGISTER_URL = "https://warroom.humanfirstbykk.com/register";
export const CLIENT_VERSION = "city@0.1.0-f1"; // sent as clientVersion on submit (PRD §8.2)

const env = import.meta.env as Record<string, string | undefined>;

interface WindowConfig {
  firebaseApiKey?: string;
  firebaseProjectId?: string;
  firebaseAuthDomain?: string;
  apiBaseUrl?: string;
  registerUrl?: string;
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
 * "/api/v1/..." paths expect. The main frontend's NEXT_PUBLIC_API_URL ends in
 * "/api" (its own convention); academy routes live at "/api/v1" off the root, so
 * a trailing "/api" would double up. Strip trailing slashes, then one "/api",
 * then slashes again. (Ported from the Godot F0 finding.)
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

  const firebaseApiKey =
    win.firebaseApiKey || pickEnv("VITE_FIREBASE_API_KEY", "NEXT_PUBLIC_FIREBASE_API_KEY");
  const firebaseProjectId =
    win.firebaseProjectId ||
    pickEnv("VITE_FIREBASE_PROJECT_ID", "NEXT_PUBLIC_FIREBASE_PROJECT_ID") ||
    DEFAULT_PROJECT_ID;
  const firebaseAuthDomain =
    win.firebaseAuthDomain ||
    pickEnv("VITE_FIREBASE_AUTH_DOMAIN", "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN") ||
    `${firebaseProjectId}.firebaseapp.com`;
  const apiBaseUrl = normalizeBaseUrl(
    win.apiBaseUrl || pickEnv("VITE_API_BASE_URL", "NEXT_PUBLIC_API_URL") || DEFAULT_API_BASE_URL,
  );
  const registerUrl =
    win.registerUrl ||
    pickEnv("VITE_REGISTER_URL", "NEXT_PUBLIC_REGISTER_URL") ||
    DEFAULT_REGISTER_URL;

  return {
    firebaseApiKey,
    firebaseProjectId,
    firebaseAuthDomain,
    apiBaseUrl,
    registerUrl,
    clientVersion: CLIENT_VERSION,
  };
}

export const appConfig: AppConfig = resolve();

/** Login is disabled until a Firebase web API key is present. */
export const isConfigured = (): boolean => appConfig.firebaseApiKey.length > 0;
