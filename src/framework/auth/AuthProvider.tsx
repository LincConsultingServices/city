import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { User } from "firebase/auth";
import { onAuthChange } from "./firebase";
import { isConfigured } from "@/framework/config/appConfig";

export type AuthStatus = "loading" | "signedIn" | "signedOut";

interface AuthState {
  user: User | null;
  status: AuthStatus;
  configured: boolean;
}

const AuthContext = createContext<AuthState>({
  user: null,
  status: "loading",
  configured: false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    status: isConfigured() ? "loading" : "signedOut",
    configured: isConfigured(),
  });

  useEffect(() => {
    if (!isConfigured()) return; // no key → stay on login with a config message
    const unsub = onAuthChange((user) => {
      setState({ user, status: user ? "signedIn" : "signedOut", configured: true });
    });
    return unsub;
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export const useAuth = (): AuthState => useContext(AuthContext);
