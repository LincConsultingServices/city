// What inventory items look like: a front, and for the things you can turn
// over, a back. Drawn in HTML/SVG so they need no art files, and so the
// details on them (your name, your signature, your account number) are real.
import type { CharacterLook } from "@/ui/characters";
import { Portrait } from "@/ui/Portrait";

const SIGNATURE_FONT = '"Segoe Script", "Brush Script MT", "Snell Roundhand", cursive';

// ── The debit card ───────────────────────────────────────────────────────────

export function CardFront({
  holder,
  last4,
  expiry,
}: {
  holder: string;
  last4: string;
  expiry: string;
}) {
  return (
    <div
      className="h-full w-full rounded-2xl p-4 text-white shadow-lg"
      style={{ background: "linear-gradient(135deg,#26385f 0%,#1a2440 60%,#3a2f17 100%)" }}
    >
      <div className="flex items-center justify-between">
        <span className="font-display text-sm font-semibold text-[#e5c77a]">MERIDIAN</span>
        <span className="text-[10px] uppercase tracking-widest opacity-70">Debit</span>
      </div>
      <div className="mt-5 h-7 w-10 rounded-md bg-gradient-to-br from-[#e5c77a] to-[#9a7a35]" />
      <p className="mt-3 font-mono text-base tracking-widest">•••• •••• •••• {last4}</p>
      <div className="mt-2 flex items-end justify-between text-[11px]">
        <span className="truncate uppercase tracking-wider">{holder}</span>
        <span className="opacity-80">VALID THRU {expiry}</span>
      </div>
    </div>
  );
}

export function CardBack({ signature }: { signature: string }) {
  return (
    <div
      className="h-full w-full rounded-2xl text-white shadow-lg"
      style={{ background: "linear-gradient(135deg,#1a2440,#26385f)" }}
    >
      <div className="mt-4 h-9 w-full bg-[#0c0e12]" />
      <div className="mx-4 mt-3 flex items-center gap-2">
        <div
          className="flex-1 rounded-sm bg-[#f3efe6] px-2 py-1 text-[#22252c]"
          style={{ fontFamily: SIGNATURE_FONT }}
        >
          {signature || " "}
        </div>
        <div className="rounded-sm bg-white px-1.5 py-1 font-mono text-[10px] italic text-[#22252c]">
          •••
        </div>
      </div>
      <p className="mx-4 mt-3 text-[9px] leading-snug opacity-80">
        This card belongs to Meridian Bank. If found, please return it to any Meridian branch. Never
        share your PIN: the bank will never ask for it.
      </p>
    </div>
  );
}

// ── The passbook ─────────────────────────────────────────────────────────────

export function PassbookCover() {
  return (
    <div
      className="flex h-full w-full flex-col items-center justify-center rounded-lg border-4 border-[#c9a24a]/60 p-4 text-center shadow-lg"
      style={{ background: "linear-gradient(160deg,#1f2d4d,#141d33)" }}
    >
      <div className="grid h-12 w-12 place-items-center rounded-full bg-[#c9a24a] font-display text-xl font-bold text-[#1f2d4d]">
        M
      </div>
      <p className="mt-3 font-display text-lg text-[#e5c77a]">MERIDIAN BANK</p>
      <p className="text-[11px] uppercase tracking-[0.3em] text-[#e5c77a]/80">Passbook</p>
    </div>
  );
}

export function PassbookPage({
  holder,
  number,
  type,
  balance,
}: {
  holder: string;
  number: string;
  type: string;
  balance: number;
}) {
  return (
    <div className="h-full w-full rounded-lg bg-[#f6f1e4] p-4 text-[#22252c] shadow-lg">
      <p className="text-[10px] uppercase tracking-widest text-[#22252c]/60">Account holder</p>
      <p className="font-display text-lg">{holder}</p>
      <dl className="mt-3 space-y-1 text-xs">
        <div className="flex justify-between border-b border-[#22252c]/15 pb-1">
          <dt>Account no.</dt>
          <dd className="font-mono">{number}</dd>
        </div>
        <div className="flex justify-between border-b border-[#22252c]/15 pb-1">
          <dt>Type</dt>
          <dd className="capitalize">{type}</dd>
        </div>
        <div className="flex justify-between border-b border-[#22252c]/15 pb-1">
          <dt>Branch</dt>
          <dd>Downtown</dd>
        </div>
        <div className="flex justify-between">
          <dt>Balance</dt>
          <dd className="font-semibold">${balance}</dd>
        </div>
      </dl>
    </div>
  );
}

// ── Cheques and the cheque book ──────────────────────────────────────────────

export function ChequeFace({
  bank,
  from,
  to,
  amount,
  words,
  date,
  number,
  crossed,
  memo,
}: {
  bank: string;
  from: string;
  to: string;
  amount: number;
  words: string;
  date: string;
  number: string;
  crossed?: boolean;
  memo?: string;
}) {
  return (
    <div
      className="relative h-full w-full overflow-hidden rounded-lg border border-[#c9a24a]/60 p-3 text-[#22252c] shadow"
      style={{ background: "linear-gradient(120deg,#f6f1e4,#eae4d2)" }}
    >
      {crossed && (
        <div className="pointer-events-none absolute left-6 top-0 h-full w-12 -skew-x-[30deg] border-x-2 border-[#22252c]/60" />
      )}
      <div className="flex justify-between text-[10px]">
        <span className="font-display font-semibold">{bank}</span>
        <span>Date {date}</span>
      </div>
      <p className="mt-2 text-[11px]">
        Pay <b>{to}</b>
      </p>
      <div className="mt-1 flex items-end gap-2">
        <p className="flex-1 truncate border-b border-[#22252c]/30 text-[10px] italic">{words}</p>
        <p className="rounded border border-[#22252c]/50 bg-white/60 px-1.5 font-mono text-[11px]">
          ${amount}
        </p>
      </div>
      <div className="mt-2 flex items-end justify-between text-[9px]">
        <span className="font-mono">
          No. {number}
          {memo ? ` · ${memo}` : ""}
        </span>
        <span className="text-sm" style={{ fontFamily: SIGNATURE_FONT }}>
          {from}
        </span>
      </div>
    </div>
  );
}

export function ChequeBack({ paidIn }: { paidIn: boolean }) {
  return (
    <div className="flex h-full w-full flex-col justify-center rounded-lg border border-dashed border-[#c9a24a]/60 bg-[#f3efe6] p-3 text-[11px] text-[#22252c]">
      <p className="uppercase tracking-widest text-[#22252c]/60">Back of the cheque</p>
      <p className="mt-2">For deposit to account no. ____________</p>
      <p className="mt-2 text-[10px] text-[#22252c]/70">
        {paidIn
          ? "Already paid in."
          : "Write your account number here when you pay it in at window 2 or the drop box."}
      </p>
    </div>
  );
}

export function ChequeBookCover({ leaves }: { leaves: number }) {
  return (
    <div
      className="flex h-full w-full flex-col justify-between rounded-lg p-3 text-[#e5c77a] shadow-lg"
      style={{ background: "linear-gradient(135deg,#3a2f17,#1f2d4d)" }}
    >
      <p className="font-display text-sm">MERIDIAN BANK</p>
      <p className="text-center text-xs uppercase tracking-[0.3em]">Cheque book</p>
      <p className="text-right text-[11px] opacity-80">{leaves} cheques left</p>
    </div>
  );
}

// ── Identity cards ───────────────────────────────────────────────────────────

export function IdFront({
  title,
  colour,
  name,
  address,
  status,
  look,
}: {
  title: string;
  colour: string;
  name: string;
  address: string;
  status: string;
  look: CharacterLook;
}) {
  return (
    <div
      className="flex h-full w-full gap-3 rounded-2xl p-3 text-white shadow-lg"
      style={{ background: `linear-gradient(135deg, ${colour}, #11151f)` }}
    >
      <div className="h-full w-[32%] shrink-0 overflow-hidden rounded-md bg-white/15">
        <Portrait look={look} className="h-full w-full object-cover" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] uppercase tracking-widest opacity-80">{title}</p>
        <p className="mt-2 truncate text-sm font-semibold">{name}</p>
        <p className="text-[10px] opacity-80">{address}</p>
        <p className="mt-3 text-[10px] font-semibold">{status}</p>
      </div>
    </div>
  );
}

export function IdBack({
  title,
  colour,
  valid,
}: {
  title: string;
  colour: string;
  valid: boolean;
}) {
  return (
    <div
      className="flex h-full w-full flex-col justify-between rounded-2xl p-3 text-white shadow-lg"
      style={{ background: `linear-gradient(135deg, #11151f, ${colour})` }}
    >
      <p className="text-[10px] uppercase tracking-widest opacity-80">
        {title} · issued by the City
      </p>
      <div className="flex h-8 items-end gap-[2px]">
        {Array.from({ length: 38 }, (_, i) => (
          <span
            key={i}
            className="block bg-white/80"
            style={{ width: i % 3 === 0 ? 3 : 1, height: `${50 + ((i * 37) % 50)}%` }}
          />
        ))}
      </div>
      <p className="text-[9px] opacity-80">
        {valid ? "Accepted as proof of identity." : "Not accepted as proof of identity."}
      </p>
    </div>
  );
}

// ── The phone and the wallet ─────────────────────────────────────────────────

export function PhoneFront({ number }: { number: string }) {
  return (
    <div className="flex h-full w-full flex-col rounded-[22px] border-4 border-[#22252c] bg-[#0e2a3a] p-2 text-[#bfeaf5] shadow-lg">
      <div className="mx-auto h-1 w-8 rounded bg-[#22252c]" />
      <p className="mt-6 text-center text-xl font-semibold">10:42</p>
      <p className="mt-4 text-center text-[9px] opacity-80">My number</p>
      <p className="text-center font-mono text-[11px]">
        {number.slice(0, 3)} {number.slice(3, 6)} {number.slice(6)}
      </p>
    </div>
  );
}

export function PhoneBack() {
  return (
    <div className="h-full w-full rounded-[22px] border-4 border-[#22252c] bg-gradient-to-b from-[#3a404b] to-[#22252c] p-2 shadow-lg">
      <div className="h-6 w-6 rounded-full border-2 border-[#0c0e12] bg-[#1b1f27]" />
    </div>
  );
}

export function WalletFront() {
  return (
    <div
      className="relative h-full w-full rounded-xl shadow-lg"
      style={{ background: "linear-gradient(160deg,#6b4528,#4a2f1b)" }}
    >
      <div className="absolute inset-3 rounded-lg border border-dashed border-[#c9a24a]/50" />
      <div className="absolute right-0 top-1/2 h-8 w-6 -translate-y-1/2 rounded-l-md bg-[#3a2513]">
        <span className="absolute left-1.5 top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-[#c9a24a]" />
      </div>
    </div>
  );
}

export function WalletInside({ cash }: { cash: number | null }) {
  return (
    <div
      className="flex h-full w-full flex-col justify-end rounded-xl p-4 shadow-lg"
      style={{ background: "linear-gradient(160deg,#4a2f1b,#6b4528)" }}
    >
      <div className="mb-2 h-8 w-3/4 rounded-sm bg-[#cfe6c9] shadow" />
      <div className="-mt-6 mb-2 ml-4 h-8 w-3/4 rounded-sm bg-[#bcd9b5] shadow" />
      <p className="font-display text-2xl text-[#e5c77a]">{cash === null ? "—" : `$${cash}`}</p>
      <p className="text-[10px] uppercase tracking-widest text-[#e5c77a]/70">Cash</p>
    </div>
  );
}

// ── Shop items ───────────────────────────────────────────────────────────────

const RARITY: Record<string, string> = {
  COMMON: "#8d96a6",
  RARE: "#4f8fd6",
  EPIC: "#9b5bd6",
  LEGENDARY: "#e5a43a",
};

export function ShopItemArt({ category, rarity }: { category: string; rarity: string }) {
  const c = RARITY[rarity] ?? RARITY.COMMON;
  return (
    <div
      className="grid h-full w-full place-items-center rounded-xl shadow-inner"
      style={{ background: `radial-gradient(circle at 50% 40%, ${c}55, #11151f)` }}
    >
      <svg viewBox="0 0 64 64" className="h-3/4 w-3/4" aria-hidden>
        {category === "HAT" && (
          <>
            <ellipse cx="32" cy="44" rx="24" ry="6" fill={c} />
            <path d="M18 44 C18 22 46 22 46 44 Z" fill={c} opacity="0.85" />
            <rect x="18" y="38" width="28" height="4" fill="#22252c" opacity="0.4" />
          </>
        )}
        {category === "SKIN" && (
          <path
            d="M20 14 L28 10 L32 16 L36 10 L44 14 L52 26 L44 30 L44 54 L20 54 L20 30 L12 26 Z"
            fill={c}
          />
        )}
        {category === "BACKGROUND" && (
          <>
            <rect
              x="8"
              y="14"
              width="48"
              height="36"
              rx="3"
              fill="#1f2d4d"
              stroke={c}
              strokeWidth="3"
            />
            <path d="M12 46 L22 30 L30 40 L38 26 L52 46 Z" fill={c} />
          </>
        )}
        {category === "PET" && (
          <>
            <ellipse cx="32" cy="40" rx="16" ry="12" fill={c} />
            <circle cx="32" cy="24" r="10" fill={c} />
            <path d="M24 18 L22 8 L30 15 Z M40 18 L42 8 L34 15 Z" fill={c} />
            <circle cx="28" cy="24" r="1.6" fill="#11151f" />
            <circle cx="36" cy="24" r="1.6" fill="#11151f" />
          </>
        )}
      </svg>
    </div>
  );
}
