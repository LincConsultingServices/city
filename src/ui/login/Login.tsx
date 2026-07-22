// Login (PRD §5.2, §10) — email + password via Firebase (or dev-mock). No
// sign-up ever: unknown users get the RegisterInterstitial, and a persistent
// "Register" link is always visible (email-enumeration protection can hide the
// unknown-email signal). Config-missing shows a clear message, never a crash.

import { useState, type FormEvent } from 'react';
import { motion } from 'framer-motion';
import { appConfig, isConfigured } from '@/config/appConfig';
import { login } from '@/framework/auth/session';
import { Button } from '@/ui/design-system/Button';
import { RegisterInterstitial } from './RegisterInterstitial';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showRegister, setShowRegister] = useState(false);
  const configured = isConfigured();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    const outcome = await login(email, password, remember);
    setSubmitting(false);
    if (outcome.status === 'ok') return; // AppRouter switches to the city
    if (outcome.status === 'unregistered') {
      setShowRegister(true);
      return;
    }
    setError(outcome.message || 'Sign-in failed. Please try again.');
  }

  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-night">
      <Skyline />

      <motion.form
        onSubmit={onSubmit}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative z-10 w-[min(92vw,400px)] rounded-2xl border border-white/10 bg-white/[0.04] p-8 backdrop-blur-md"
      >
        <p className="text-xs uppercase tracking-[0.3em] text-accent/80">Welcome to</p>
        <h1 className="font-display text-5xl leading-none text-white">The City</h1>
        <p className="mt-2 text-sm text-white/55">Sign in with your WarRoom account to walk in.</p>

        {appConfig.mockAuth && (
          <p className="mt-4 rounded-md border border-accent/30 bg-accent/10 px-3 py-2 text-xs text-accent">
            Dev-mock mode — any email/password signs you in offline.
          </p>
        )}
        {!configured && (
          <p className="mt-4 rounded-md border border-red-400/30 bg-red-400/10 px-3 py-2 text-xs text-red-200">
            Configuration missing: set VITE_FIREBASE_API_KEY in .env to enable login.
          </p>
        )}

        <div className="mt-6 space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs text-white/60">Email</span>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-lg border border-white/12 bg-black/25 px-3 py-2 text-sm text-white outline-none focus:border-accent/60"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-white/60">Password</span>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-lg border border-white/12 bg-black/25 px-3 py-2 text-sm text-white outline-none focus:border-accent/60"
            />
          </label>
          <label className="flex items-center gap-2 text-xs text-white/60">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="accent-accent"
            />
            Keep me signed in
          </label>
        </div>

        {error && (
          <p role="alert" className="mt-4 text-sm text-red-300">
            {error}
          </p>
        )}

        <Button type="submit" disabled={submitting} className="mt-6 w-full">
          {submitting ? 'Signing in…' : 'Enter the city'}
        </Button>

        <p className="mt-5 text-center text-xs text-white/45">
          New to WarRoom?{' '}
          <a
            href={appConfig.registerUrl}
            target="_blank"
            rel="noreferrer"
            className="text-accent underline-offset-2 hover:underline"
          >
            Register
          </a>
        </p>
      </motion.form>

      <RegisterInterstitial
        open={showRegister}
        onOpenChange={setShowRegister}
        onRetry={() => setShowRegister(false)}
      />
    </div>
  );
}

// A quiet iso-rooftop silhouette + glow behind the card (frontend polish, not
// gameplay). Pure CSS/SVG so it costs nothing and needs no assets.
function Skyline() {
  return (
    <div className="pointer-events-none absolute inset-0">
      <div className="absolute left-1/2 top-[38%] h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/10 blur-[120px]" />
      <svg
        className="absolute bottom-0 left-0 w-full text-white/[0.05]"
        viewBox="0 0 1200 240"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        {Array.from({ length: 14 }).map((_, i) => {
          const x = i * 90 + 20;
          const h = 60 + ((i * 37) % 110);
          return (
            <g key={i} fill="currentColor">
              <polygon
                points={`${x},${240 - h} ${x + 45},${240 - h - 26} ${x + 90},${240 - h} ${x + 45},${240 - h + 26}`}
              />
              <rect x={x} y={240 - h} width={90} height={h} />
            </g>
          );
        })}
      </svg>
    </div>
  );
}
