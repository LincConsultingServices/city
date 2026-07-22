// Register interstitial (PRD §5.2, §10) — shown when Firebase reports an unknown
// email. Sign-up NEVER happens in-game; unknown users go to the main WarRoom
// site. Uses Radix Dialog for correct focus management + ESC handling (PRD §16).

import * as Dialog from '@radix-ui/react-dialog';
import { appConfig } from '@/config/appConfig';
import { Button } from '@/ui/design-system/Button';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRetry: () => void;
}

export function RegisterInterstitial({ open, onOpenChange, onRetry }: Props) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(92vw,440px)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/10 bg-[#141826] p-7 text-white shadow-2xl">
          <Dialog.Title className="font-display text-2xl">
            Your WarRoom account is your ticket into the city
          </Dialog.Title>
          <Dialog.Description className="mt-3 text-sm text-white/65">
            We couldn&apos;t find that account. The City uses your WarRoom login — create one on the
            main site, then come back and sign in.
          </Dialog.Description>
          <div className="mt-6 flex flex-col gap-3">
            <a href={appConfig.registerUrl} target="_blank" rel="noreferrer">
              <Button className="w-full">Register on WarRoom ↗</Button>
            </a>
            <Button variant="ghost" onClick={onRetry}>
              I&apos;ve registered — try again
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
