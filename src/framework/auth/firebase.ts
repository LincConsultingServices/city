// Firebase app/auth init from AppConfig. The web port uses the Firebase JS Auth
// SDK (PRD §10) instead of the Godot F0's hand-rolled Identity Toolkit REST —
// the SDK manages id/refresh tokens and auto-refreshes (onIdTokenChanged).
//
// Returns null when there is no key (login shows "configuration missing") or in
// dev-mock mode (VITE_CITY_MOCK_AUTH=1) so the app runs with no credentials.

import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { appConfig } from '@/config/appConfig';

let app: FirebaseApp | null = null;
let authInstance: Auth | null = null;

export function getFirebaseAuth(): Auth | null {
  if (appConfig.mockAuth) return null;
  if (!appConfig.firebaseApiKey) return null;
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
