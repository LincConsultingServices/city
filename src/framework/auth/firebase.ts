// Firebase auth — CEO City's own project. The SDK manages the ID token and its
// refresh; we expose a TokenProvider for the ApiClient and the account actions
// the sign-in screen needs: sign in, create an account, sign in with Google,
// and reset a forgotten password. Accounts are made here, in the game.
import { initializeApp, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
  signInWithPopup,
  GoogleAuthProvider,
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

export type AuthOutcome =
  | { ok: true }
  | {
      ok: false;
      status: "credentials" | "taken" | "weak" | "network" | "config" | "cancelled" | "error";
      message: string;
    };

const notConfigured: AuthOutcome = {
  ok: false,
  status: "config",
  message: "Sign-in isn't set up yet — add CEO City's Firebase settings to .env.",
};

async function remembered(remember: boolean): Promise<void> {
  await setPersistence(auth(), remember ? browserLocalPersistence : inMemoryPersistence);
}

export async function signIn(
  email: string,
  password: string,
  remember: boolean,
): Promise<AuthOutcome> {
  if (!isConfigured()) return notConfigured;
  try {
    await remembered(remember);
    await signInWithEmailAndPassword(auth(), email, password);
    return { ok: true };
  } catch (e) {
    return mapAuthError(e);
  }
}

/**
 * Create a CEO City account and sign straight in. The name goes on the
 * account, so the character creator can start from it; a verification email
 * is sent, but nothing waits on it — the city opens at once.
 */
export async function signUp(
  name: string,
  email: string,
  password: string,
  remember: boolean,
): Promise<AuthOutcome> {
  if (!isConfigured()) return notConfigured;
  try {
    await remembered(remember);
    const { user } = await createUserWithEmailAndPassword(auth(), email, password);
    if (name.trim()) {
      await updateProfile(user, { displayName: name.trim() });
      // A fresh token carries the name to the backend on the first request.
      await user.getIdToken(true);
    }
    void sendEmailVerification(user).catch(() => {});
    return { ok: true };
  } catch (e) {
    return mapAuthError(e);
  }
}

export async function signInWithGoogle(remember: boolean): Promise<AuthOutcome> {
  if (!isConfigured()) return notConfigured;
  try {
    await remembered(remember);
    await signInWithPopup(auth(), new GoogleAuthProvider());
    return { ok: true };
  } catch (e) {
    return mapAuthError(e);
  }
}

/**
 * Email a password-reset link. Resolves ok whether or not the email has an
 * account — saying which would tell a stranger who plays here.
 */
export async function resetPassword(email: string): Promise<AuthOutcome> {
  if (!isConfigured()) return notConfigured;
  try {
    await sendPasswordResetEmail(auth(), email);
    return { ok: true };
  } catch (e) {
    const out = mapAuthError(e);
    return out.ok === false && out.status === "credentials" ? { ok: true } : out;
  }
}

export function signOutUser(): Promise<void> {
  return signOut(auth());
}

/** Subscribe to identity changes; fires on sign-in, sign-out, and token refresh. */
export function onAuthChange(cb: (user: User | null) => void): () => void {
  return onIdTokenChanged(auth(), cb);
}

function mapAuthError(e: unknown): Exclude<AuthOutcome, { ok: true }> {
  const code = (e as { code?: string })?.code ?? "";
  switch (code) {
    // Email enumeration protection reports an unknown email and a wrong
    // password the same way, so the message covers both.
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
    case "auth/invalid-login-credentials":
      return {
        ok: false,
        status: "credentials",
        message: "That email and password don't match an account. Check them, or create one.",
      };
    case "auth/email-already-in-use":
      return {
        ok: false,
        status: "taken",
        message: "There's already an account with that email. Sign in instead.",
      };
    case "auth/weak-password":
      return { ok: false, status: "weak", message: "Choose a password of at least 6 characters." };
    case "auth/invalid-email":
      return { ok: false, status: "error", message: "That doesn't look like an email address." };
    case "auth/missing-password":
      return { ok: false, status: "error", message: "Enter your password." };
    case "auth/too-many-requests":
      return { ok: false, status: "error", message: "Too many attempts — take a short break." };
    case "auth/network-request-failed":
      return {
        ok: false,
        status: "network",
        message: "Couldn't reach sign-in. Check your connection.",
      };
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return { ok: false, status: "cancelled", message: "" };
    case "auth/popup-blocked":
      return {
        ok: false,
        status: "error",
        message:
          "Your browser blocked the Google window. Allow pop-ups for this site and try again.",
      };
    case "auth/operation-not-allowed":
      return {
        ok: false,
        status: "config",
        message: "That way of signing in isn't switched on for CEO City yet.",
      };
    case "auth/unauthorized-domain":
      return {
        ok: false,
        status: "config",
        message:
          "This address isn't allowed to sign in yet — add it in Firebase's authorized domains.",
      };
    case "auth/invalid-api-key":
    case "auth/api-key-not-valid.-please-pass-a-valid-api-key.":
      return { ok: false, status: "config", message: "CEO City's Firebase key is invalid." };
    default:
      return { ok: false, status: "error", message: "Something went wrong. Please try again." };
  }
}
