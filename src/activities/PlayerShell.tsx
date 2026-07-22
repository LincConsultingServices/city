// PlayerShell — the one activity player shell (PRD §8): header (title /
// competency / level, progress dots, hint, quit-with-resume) hosting one
// renderer. FROZEN contract in F0; the 13 renderers + the submit wiring land in
// F1. Buildings may theme it via tokens/backdrop, never fork it.

import type { ReactNode } from 'react';

export interface PlayerShellProps {
  title: string;
  competency?: string;
  level?: string;
  /** Total steps and current index for the progress dots. */
  steps?: number;
  currentStep?: number;
  onHint?: () => void;
  onQuit: () => void;
  children?: ReactNode;
}

export function PlayerShell({
  title,
  competency,
  level,
  steps = 0,
  currentStep = 0,
  onHint,
  onQuit,
  children,
}: PlayerShellProps) {
  return (
    <div className="flex h-full flex-col bg-night text-[#e7e9f0]">
      <header className="flex items-center justify-between border-b border-white/10 px-5 py-3">
        <div className="min-w-0">
          <h2 className="truncate font-display text-xl">{title}</h2>
          {(competency || level) && (
            <p className="text-xs text-white/50">
              {[competency, level].filter(Boolean).join(' · ')}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {steps > 0 && (
            <div className="flex gap-1" aria-label={`Step ${currentStep + 1} of ${steps}`}>
              {Array.from({ length: steps }).map((_, i) => (
                <span
                  key={i}
                  className={`h-2 w-2 rounded-full ${i <= currentStep ? 'bg-accent' : 'bg-white/20'}`}
                />
              ))}
            </div>
          )}
          {onHint && (
            <button
              type="button"
              onClick={onHint}
              className="rounded-md border border-white/15 px-2 py-1 text-xs hover:bg-white/5"
            >
              Hint
            </button>
          )}
          <button
            type="button"
            onClick={onQuit}
            className="rounded-md border border-white/15 px-2 py-1 text-xs hover:bg-white/5"
          >
            Quit
          </button>
        </div>
      </header>
      <div className="min-h-0 flex-1 overflow-auto p-5">{children}</div>
    </div>
  );
}
