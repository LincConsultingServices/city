import { useId, useState, type FormEvent, type ReactNode } from "react";
import {
  resetPassword,
  signIn,
  signInWithGoogle,
  signUp,
  type AuthOutcome,
} from "@/framework/auth/firebase";
import { isConfigured } from "@/framework/config/appConfig";

// The way into CEO City: sign in, create an account, or get back into one.
// Accounts are CEO City's own (its own Firebase project). Three modes on one
// card over the city skyline, so moving between them never feels like leaving.

type Mode = "signin" | "signup" | "reset";

const MIN_PASSWORD = 6;

export function Login() {
  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState<null | "form" | "google">(null);
  const [error, setError] = useState(
    isConfigured() ? "" : "Sign-in isn't set up yet — add CEO City's Firebase settings to .env.",
  );
  const [notice, setNotice] = useState("");
  const ids = { name: useId(), email: useId(), password: useId(), confirm: useId() };

  const go = (next: Mode) => {
    setMode(next);
    setError("");
    setNotice("");
    setPassword("");
    setConfirm("");
  };

  const finish = (res: AuthOutcome) => {
    setBusy(null);
    // On success AuthProvider moves the app into the city by itself.
    if (!res.ok && res.status !== "cancelled") setError(res.message);
  };

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError("");
    setNotice("");
    const mail = email.trim();
    if (mode === "reset") {
      setBusy("form");
      const res = await resetPassword(mail);
      setBusy(null);
      if (res.ok) setNotice(`If there's an account for ${mail}, a reset link is on its way.`);
      else setError(res.message);
      return;
    }
    if (mode === "signup") {
      if (!name.trim()) return setError("Tell us your name.");
      if (password.length < MIN_PASSWORD)
        return setError(`Choose a password of at least ${MIN_PASSWORD} characters.`);
      if (password !== confirm) return setError("The two passwords don't match.");
      setBusy("form");
      return finish(await signUp(name, mail, password, remember));
    }
    setBusy("form");
    finish(await signIn(mail, password, remember));
  }

  async function google() {
    if (busy) return;
    setError("");
    setBusy("google");
    finish(await signInWithGoogle(remember));
  }

  const title =
    mode === "signin"
      ? "Welcome back"
      : mode === "signup"
        ? "Start your career"
        : "Reset your password";
  const subtitle =
    mode === "signin"
      ? "Sign in to pick up where you left off."
      : mode === "signup"
        ? "Create your CEO City account — it takes a minute."
        : "We'll email you a link to choose a new one.";

  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden bg-ink px-4 py-8">
      <Skyline />
      <div className="relative z-10 w-full max-w-[400px]">
        <p className="text-center font-display text-4xl font-semibold tracking-wide text-gold">
          CEO CITY
        </p>
        <p className="mt-1 text-center text-xs uppercase tracking-[0.3em] text-muted">
          From first shift to the corner office
        </p>

        <form
          onSubmit={onSubmit}
          noValidate
          aria-labelledby="auth-title"
          className="mt-6 rounded-2xl border border-line/70 bg-surface/85 p-7 shadow-2xl backdrop-blur"
        >
          {mode !== "reset" && (
            <div
              role="tablist"
              aria-label="Account"
              className="mb-5 grid grid-cols-2 rounded-xl bg-surface-2 p-1"
            >
              {(["signin", "signup"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  role="tab"
                  aria-selected={mode === m}
                  onClick={() => go(m)}
                  className={`rounded-lg py-1.5 text-sm transition ${
                    mode === m ? "bg-gold text-ink font-medium" : "text-muted hover:text-text"
                  }`}
                >
                  {m === "signin" ? "Sign in" : "Create account"}
                </button>
              ))}
            </div>
          )}

          <h1 id="auth-title" className="font-display text-2xl font-semibold text-text">
            {title}
          </h1>
          <p className="mt-1 text-sm text-muted">{subtitle}</p>

          {mode === "signup" && (
            <Field id={ids.name} label="Your name">
              <input
                id={ids.name}
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={INPUT}
                required
              />
            </Field>
          )}

          <Field id={ids.email} label="Email">
            <input
              id={ids.email}
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={INPUT}
              required
            />
          </Field>

          {mode !== "reset" && (
            <Field
              id={ids.password}
              label="Password"
              aside={
                mode === "signin" ? (
                  <button
                    type="button"
                    onClick={() => go("reset")}
                    className="text-xs text-muted underline-offset-2 hover:text-gold hover:underline"
                  >
                    Forgot password?
                  </button>
                ) : undefined
              }
            >
              <div className="relative">
                <input
                  id={ids.password}
                  type={showPassword ? "text" : "password"}
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`${INPUT} pr-16`}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-pressed={showPassword}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded px-2 py-1 text-xs text-muted hover:text-text"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
              {mode === "signup" && (
                <p className="mt-1 text-[11px] text-muted">At least {MIN_PASSWORD} characters.</p>
              )}
            </Field>
          )}

          {mode === "signup" && (
            <Field id={ids.confirm} label="Confirm password">
              <input
                id={ids.confirm}
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className={INPUT}
                required
              />
            </Field>
          )}

          {mode !== "reset" && (
            <label className="mt-4 flex items-center gap-2 text-sm text-muted">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
              />
              Keep me signed in on this device
            </label>
          )}

          {error && (
            <p role="alert" className="mt-3 text-sm text-danger">
              {error}
            </p>
          )}
          {notice && (
            <p role="status" className="mt-3 text-sm text-text">
              {notice}
            </p>
          )}

          <button
            type="submit"
            disabled={busy !== null || !isConfigured()}
            className="mt-5 w-full rounded-lg bg-gold py-2.5 font-medium text-ink transition hover:brightness-110 disabled:opacity-60"
          >
            {busy === "form"
              ? mode === "reset"
                ? "Sending…"
                : mode === "signup"
                  ? "Creating your account…"
                  : "Entering…"
              : mode === "reset"
                ? "Send reset link"
                : mode === "signup"
                  ? "Create account"
                  : "Enter the city"}
          </button>

          {mode !== "reset" && (
            <>
              <div className="my-4 flex items-center gap-3 text-[11px] uppercase tracking-widest text-muted">
                <span className="h-px flex-1 bg-line/70" />
                or
                <span className="h-px flex-1 bg-line/70" />
              </div>
              <button
                type="button"
                onClick={() => void google()}
                disabled={busy !== null || !isConfigured()}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-line/80 bg-surface-2 py-2.5 text-sm text-text transition hover:border-gold/60 disabled:opacity-60"
              >
                <GoogleMark />
                {busy === "google" ? "Opening Google…" : "Continue with Google"}
              </button>
            </>
          )}

          <p className="mt-5 text-center text-xs text-muted">
            {mode === "signin" && (
              <>
                New here? <LinkButton onClick={() => go("signup")}>Create an account</LinkButton>
              </>
            )}
            {mode === "signup" && (
              <>
                Already have an account?{" "}
                <LinkButton onClick={() => go("signin")}>Sign in</LinkButton>
              </>
            )}
            {mode === "reset" && (
              <LinkButton onClick={() => go("signin")}>Back to sign in</LinkButton>
            )}
          </p>
        </form>
      </div>
    </div>
  );
}

const INPUT =
  "mt-1 w-full rounded-lg border border-line bg-surface-2 px-3 py-2 text-text outline-none focus:border-gold";

function Field({
  id,
  label,
  aside,
  children,
}: {
  id: string;
  label: string;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="mt-4">
      <div className="flex items-baseline justify-between">
        <label className="block text-xs font-medium text-muted" htmlFor={id}>
          {label}
        </label>
        {aside}
      </div>
      {children}
    </div>
  );
}

function LinkButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="font-medium text-gold underline-offset-2 hover:underline"
    >
      {children}
    </button>
  );
}

/** Google's "G", for the sign-in button. */
function GoogleMark() {
  return (
    <svg aria-hidden viewBox="0 0 48 48" className="h-4 w-4">
      <path
        fill="#EA4335"
        d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.6 5.4 2.7 13.3l7.9 6.1C12.5 13.6 17.8 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.7 6c4.5-4.2 6.9-10.3 6.9-17.7z"
      />
      <path
        fill="#FBBC05"
        d="M10.6 28.6c-.5-1.4-.8-3-.8-4.6s.3-3.2.8-4.6l-7.9-6.1C1 16.6 0 20.2 0 24s1 7.4 2.7 10.7l7.9-6.1z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.7-6c-2.1 1.4-4.9 2.3-8.2 2.3-6.2 0-11.5-4.1-13.4-9.9l-7.9 6.1C6.6 42.6 14.6 48 24 48z"
      />
    </svg>
  );
}

function Skyline() {
  // A living skyline: three parallax silhouette layers sliding at different
  // speeds (each loops by shifting exactly one gradient period), twinkling lit
  // windows and drifting clouds. Pure CSS; reduced motion freezes it all.
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-70">
      {/* drifting clouds */}
      <div className="absolute left-[8%] top-[12%] h-16 w-56 animate-drift-a rounded-full bg-text/5 blur-2xl" />
      <div className="absolute left-[52%] top-[24%] h-12 w-44 animate-drift-b rounded-full bg-text/5 blur-2xl" />
      {/* horizon glow */}
      <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-surface/60 to-transparent" />
      {/* far → near silhouette layers, sliding at different speeds */}
      <div
        className="absolute bottom-0 left-0 right-0 h-56 animate-skyline-far"
        style={{
          backgroundImage:
            "repeating-linear-gradient(90deg, rgb(26 30 42 / 0.55) 0 56px, transparent 56px 88px)",
          maskImage: "linear-gradient(to top, black 55%, transparent)",
        }}
      />
      <div
        className="absolute bottom-0 left-0 right-0 h-44 animate-skyline-mid"
        style={{
          backgroundImage:
            "repeating-linear-gradient(90deg, rgb(34 40 54 / 0.85) 0 40px, transparent 40px 72px)",
          maskImage: "linear-gradient(to top, black 50%, transparent)",
        }}
      />
      <div
        className="absolute bottom-0 left-0 right-0 h-32 animate-skyline-near"
        style={{
          backgroundImage:
            "repeating-linear-gradient(90deg, rgb(15 18 26) 0 34px, transparent 34px 60px)",
          maskImage: "linear-gradient(to top, black 65%, transparent)",
        }}
      />
      {/* lit windows, twinkling */}
      <div
        className="absolute bottom-0 left-0 right-0 h-40 animate-twinkle"
        style={{
          backgroundImage:
            "radial-gradient(circle at 21px 26px, rgb(226 190 120 / 0.9) 1px, transparent 1.8px), radial-gradient(circle at 64px 52px, rgb(240 200 90 / 0.7) 1px, transparent 1.8px), radial-gradient(circle at 44px 84px, rgb(226 190 120 / 0.55) 1px, transparent 1.8px)",
          backgroundSize: "88px 112px",
          maskImage: "linear-gradient(to top, black 60%, transparent)",
        }}
      />
    </div>
  );
}
