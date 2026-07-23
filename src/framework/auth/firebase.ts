// Firebase auth (PRD §10). The SDK manages idToken/refreshToken and auto-refresh;
// we expose a TokenProvider for the ApiClient and thin sign-in/out helpers. Ported
// findings from the Godot F0: no in-game sign-up; the "unregistered" signal is a
// Firebase auth error (EMAIL_NOT_FOUND / INVALID_LOGIN_CREDENTIALS), not a backend
// 403 — so the register interstitial fires here.
import { initializeApp, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onIdTokenChanged,
  setPersistence,
  browserLocalPersistence,
  inMemoryPersistence,
  type Auth,
  type User,
} from "firebase/auth";
import { appConfig, isConfigured } from "@/framework/config/appConfig";
import type { TokenProvider } from "@/framework/api/client";

let app: FirebaseApp | null = null;
let authInstance: Auth | null = null;

export function auth(): Auth {
  if (!authInstance) {
    app = initializeApp({
      apiKey: appConfig.firebaseApiKey,
      authDomain: appConfig.firebaseAuthDomain,
      projectId: appConfig.firebaseProjectId,
    });
    authInstance = getAuth(app);
  }
  return authInstance;
}

// Always-fresh token for the ApiClient; getIdToken(true) forces a refresh (401 path).
export const tokenProvider: TokenProvider = {
  async getIdToken(forceRefresh = false) {
    const user = auth().currentUser;
    if (!user) return null;
    return user.getIdToken(forceRefresh);
  },
};

export type SignInOutcome =
  | { ok: true }
  | { ok: false; status: "unregistered" | "wrong_password" | "network" | "config" | "error"; message: string };

export async function signIn(email: string, password: string, remember: boolean): Promise<SignInOutcome> {
  if (!isConfigured()) {
    return { ok: false, status: "config", message: "The city isn't configured yet (missing Firebase key)." };
  }
  try {
    await setPersistence(auth(), remember ? browserLocalPersistence : inMemoryPersistence);
    await signInWithEmailAndPassword(auth(), email, password);
    return { ok: true };
  } catch (e) {
    return mapAuthError(e);
  }
}

export function signOutUser(): Promise<void> {
  return signOut(auth());
}

/** Subscribe to identity changes; fires on sign-in, sign-out, and token refresh. */
export function onAuthChange(cb: (user: User | null) => void): () => void {
  return onIdTokenChanged(auth(), cb);
}

function mapAuthError(e: unknown): Exclude<SignInOutcome, { ok: true }> {
  const code = (e as { code?: string })?.code ?? "";
  switch (code) {
    // Enumeration protection collapses unknown-email + wrong-password into
    // invalid-credential; we treat "not found" family as unregistered (F0 finding).
    case "auth/user-not-found":
    case "auth/invalid-credential":
    case "auth/invalid-login-credentials":
      return {
        ok: false,
        status: "unregistered",
        message: "That didn't match a WarRoom account.",
      };
    case "auth/wrong-password":
      return { ok: false, status: "wrong_password", message: "Wrong password — try again." };
    case "auth/invalid-email":
      return { ok: false, status: "error", message: "That doesn't look like an email." };
    case "auth/too-many-requests":
      return { ok: false, status: "error", message: "Too many attempts — take a short break." };
    case "auth/network-request-failed":
      return { ok: false, status: "network", message: "Couldn't reach sign-in. Check your connection." };
    case "auth/invalid-api-key":
      return { ok: false, status: "config", message: "The city's Firebase key is invalid." };
    default:
      return { ok: false, status: "error", message: "Couldn't sign in. Please try again." };
  }
}
