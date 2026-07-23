import { useState, type FormEvent } from "react";
import { signIn } from "@/framework/auth/firebase";
import { appConfig, isConfigured } from "@/framework/config/appConfig";

// Login (PRD §10). No in-game sign-up: an unrecognised account routes to the
// WarRoom register page. Ported look/flow from the Godot F0 login.
export function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(isConfigured() ? "" : "Set FIREBASE_API_KEY in .env to enable sign-in.");
  const [showRegister, setShowRegister] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError("");
    setBusy(true);
    const res = await signIn(email.trim(), password, remember);
    setBusy(false);
    if (res.ok) return; // AuthProvider flips the app to the city
    if (res.status === "unregistered") setShowRegister(true);
    else setError(res.message);
  }

  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden bg-ink">
      <Skyline />
      <form
        onSubmit={onSubmit}
        className="relative z-10 w-[360px] rounded-2xl border border-line/70 bg-surface/80 p-7 shadow-2xl backdrop-blur"
      >
        <h1 className="text-center font-display text-4xl font-semibold tracking-wide text-gold">
          THE CITY
        </h1>
        <p className="mt-1 text-center text-sm text-muted">Sign in with your WarRoom account</p>

        <label className="mt-6 block text-xs font-medium text-muted" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 w-full rounded-lg border border-line bg-surface-2 px-3 py-2 text-text outline-none focus:border-gold"
          required
        />

        <label className="mt-4 block text-xs font-medium text-muted" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 w-full rounded-lg border border-line bg-surface-2 px-3 py-2 text-text outline-none focus:border-gold"
          required
        />

        <label className="mt-4 flex items-center gap-2 text-sm text-muted">
          <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
          Remember me on this device
        </label>

        {error && <p className="mt-3 text-sm text-danger">{error}</p>}

        <button
          type="submit"
          disabled={busy}
          className="mt-5 w-full rounded-lg bg-gold py-2.5 font-medium text-ink transition hover:brightness-110 disabled:opacity-60"
        >
          {busy ? "Entering…" : "Enter the city"}
        </button>

        <button
          type="button"
          onClick={() => setShowRegister(true)}
          className="mt-3 block w-full text-center text-xs text-muted underline-offset-2 hover:text-gold hover:underline"
        >
          New to WarRoom? Register
        </button>
      </form>

      {showRegister && <RegisterInterstitial onClose={() => setShowRegister(false)} />}
    </div>
  );
}

function RegisterInterstitial({ onClose }: { onClose: () => void }) {
  return (
    <div className="absolute inset-0 z-20 grid place-items-center bg-ink/80 backdrop-blur-sm">
      <div className="w-[400px] rounded-2xl border border-line bg-surface p-7 text-center">
        <h2 className="font-display text-2xl font-semibold text-gold">
          Your WarRoom account is your ticket into the city
        </h2>
        <p className="mt-3 text-sm text-muted">
          Sign-up happens on the main WarRoom site. Register there, then come back and sign in.
        </p>
        <a
          href={appConfig.registerUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-5 inline-block rounded-lg bg-gold px-5 py-2.5 font-medium text-ink hover:brightness-110"
        >
          Register at WarRoom ↗
        </a>
        <button onClick={onClose} className="mt-3 block w-full text-xs text-muted hover:text-text">
          I've registered — try again
        </button>
      </div>
    </div>
  );
}

function Skyline() {
  // Cheap parallax skyline backdrop (gray-box; real art in F4).
  return (
    <div className="pointer-events-none absolute inset-0 opacity-60">
      <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-surface/60 to-transparent" />
      <div
        className="absolute bottom-0 left-0 right-0 h-40"
        style={{
          backgroundImage:
            "repeating-linear-gradient(90deg, rgb(34 40 54) 0 40px, transparent 40px 80px)",
          maskImage: "linear-gradient(to top, black, transparent)",
        }}
      />
    </div>
  );
}
