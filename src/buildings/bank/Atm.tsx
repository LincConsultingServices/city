// The ATM, as a machine: a brushed-steel front with the screen in the middle,
// four function keys either side of it, the CASH dispenser beneath, the
// RECEIPT and CARD slots on the right, and a keypad with red CANCEL, yellow
// CLEAR and green ENTER.
//
// You use it the way you use a real one. Insert the card (click the card
// slot), type the PIN on the keypad, choose with the keys beside the screen,
// take your card, take your cash, and take the receipt if you asked for one.
// The PIN is checked by the server; three wrong in a row lock the card for a
// few minutes — protection, never a charge.
import { useEffect, useMemo, useState } from "react";
import { Modal } from "@/ui/Modal";
import { audio } from "@/framework/audio/audioManager";
import { atmCheckPin, atmWithdraw, newKey, pinRefusal, useBankStore } from "@/framework/bank/bankStore";
import type { StatementLine } from "@/framework/api";

type Screen =
  | "welcome"
  | "pin"
  | "menu"
  | "balance"
  | "mini"
  | "withdraw"
  | "other"
  | "working"
  | "take_card"
  | "take_cash"
  | "thanks"
  | "locked"
  | "no_card";

/** What each of the eight side keys does on a screen: [L1..L4] and [R1..R4]. */
interface Keys {
  left: (Choice | null)[];
  right: (Choice | null)[];
}
interface Choice {
  label: string;
  run: () => void;
}

const LINE = "text-[13px] leading-tight tracking-wide";

export function Atm({ onClose }: { onClose: () => void }) {
  const account = useBankStore((s) => s.account);
  const statement = useBankStore((s) => s.statement);
  const busy = useBankStore((s) => s.busy);
  const [screen, setScreen] = useState<Screen>(account?.cardLast4 ? "welcome" : "no_card");
  const [pin, setPin] = useState("");
  const [entry, setEntry] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [paid, setPaid] = useState<StatementLine | null>(null);
  const [cardIn, setCardIn] = useState(false);
  const [receipt, setReceipt] = useState<string[] | null>(null);
  const [cashOut, setCashOut] = useState<number | null>(null);
  const [wantReceipt, setWantReceipt] = useState(false);

  const balance = account?.balance ?? 0;

  // ── Actions ────────────────────────────────────────────────────────────────

  const insertCard = () => {
    if (screen !== "welcome" || !account?.cardLast4) return;
    audio.play("ui_click");
    setCardIn(true);
    setPin("");
    setMessage(null);
    setScreen("pin");
  };

  const ejectCard = (next: Screen) => {
    audio.play("ui_click");
    setScreen(next);
  };

  const checkPin = async () => {
    if (pin.length !== 4) return;
    setMessage(null);
    try {
      await atmCheckPin(pin);
      audio.play("ui_confirm");
      setScreen("menu");
    } catch (e) {
      const r = pinRefusal(e);
      setPin("");
      audio.play("ui_error");
      if (r?.locked) {
        setScreen("locked");
      } else if (r) {
        setMessage(`INCORRECT PIN · ${r.attemptsLeft} ${r.attemptsLeft === 1 ? "TRY" : "TRIES"} LEFT`);
      } else {
        setMessage("SERVICE UNAVAILABLE · TRY AGAIN");
      }
    }
  };

  const withdraw = async (amount: number) => {
    setMessage(null);
    if (amount <= 0 || amount % 10 !== 0 || amount > 500) {
      setMessage("MULTIPLES OF $10, UP TO $500");
      audio.play("ui_error");
      return;
    }
    if (amount > balance) {
      setMessage(`INSUFFICIENT FUNDS · AVAILABLE $${balance}`);
      audio.play("ui_error");
      return;
    }
    setScreen("working");
    try {
      const line = await atmWithdraw(pin, amount, newKey());
      setPaid(line);
      // A real ATM gives the card back before the cash, so it isn't left behind.
      ejectCard("take_card");
    } catch (e) {
      const r = pinRefusal(e);
      audio.play("ui_error");
      if (r?.locked) setScreen("locked");
      else {
        setMessage(e instanceof Error ? e.message.toUpperCase() : "TRANSACTION FAILED");
        setScreen("withdraw");
      }
    }
  };

  const printReceipt = (lines: string[]) => {
    audio.play("ui_click");
    const now = new Date();
    setReceipt([
      "MERIDIAN BANK",
      `${now.toLocaleDateString()} ${now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
      `CARD •••• ${account?.cardLast4 ?? ""}`,
      "------------------------",
      ...lines,
      "------------------------",
      `BALANCE      $${useBankStore.getState().account?.balance ?? balance}`,
    ]);
  };

  const takeCard = () => {
    if (screen !== "take_card") return;
    audio.play("ui_click");
    setCardIn(false);
    if (paid) {
      setCashOut(-paid.amount);
      setScreen("take_cash");
    } else {
      setScreen("thanks");
    }
  };

  const takeCash = () => {
    if (screen !== "take_cash") return;
    audio.play("ui_confirm");
    setCashOut(null);
    if (wantReceipt && paid) printReceipt([`WITHDRAWAL   $${-paid.amount}`]);
    setScreen("thanks");
  };

  // ── The keypad ─────────────────────────────────────────────────────────────

  const press = (k: string) => {
    audio.play("ui_click");
    if (k === "cancel") {
      if (cardIn) ejectCard("take_card");
      else onClose();
      setPaid(null);
      return;
    }
    if (screen === "pin") {
      if (k === "clear") setPin("");
      else if (k === "enter") void checkPin();
      else if (/^\d$/.test(k) && pin.length < 4) setPin(pin + k);
    } else if (screen === "other") {
      if (k === "clear") setEntry("");
      else if (k === "enter") void withdraw(Number(entry));
      else if (/^\d$/.test(k) && entry.length < 4) setEntry(entry + k);
    }
  };

  // Typing works too: digits, Backspace/Delete to clear, Enter, Escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (/^\d$/.test(e.key)) press(e.key);
      else if (e.key === "Enter") press("enter");
      else if (e.key === "Backspace" || e.key === "Delete") press("clear");
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // ── What the screen shows, and what the side keys do ───────────────────────

  const none: Keys = { left: [null, null, null, null], right: [null, null, null, null] };
  const keys: Keys = useMemo(() => {
    switch (screen) {
      case "menu":
        return {
          left: [
            { label: "BALANCE", run: () => setScreen("balance") },
            { label: "MINI STATEMENT", run: () => setScreen("mini") },
            null,
            null,
          ],
          right: [
            { label: "WITHDRAW CASH", run: () => { setMessage(null); setScreen("withdraw"); } },
            { label: "FAST CASH $100", run: () => void withdraw(100) },
            null,
            { label: "EXIT", run: () => ejectCard("take_card") },
          ],
        };
      case "balance":
        return {
          left: [null, null, null, { label: "PRINT RECEIPT", run: () => printReceipt(["BALANCE ENQUIRY"]) }],
          right: [null, null, null, { label: "BACK", run: () => setScreen("menu") }],
        };
      case "mini":
        return {
          left: [
            null,
            null,
            null,
            {
              label: "PRINT RECEIPT",
              run: () =>
                printReceipt(
                  statement.slice(0, 5).map((l) => `${l.kind.toUpperCase().slice(0, 11).padEnd(12)} ${l.amount >= 0 ? "+" : ""}${l.amount}`),
                ),
            },
          ],
          right: [null, null, null, { label: "BACK", run: () => setScreen("menu") }],
        };
      case "withdraw":
        return {
          left: [20, 50, 100, 200].map((a) => ({ label: `$${a}`, run: () => void withdraw(a) })),
          right: [
            { label: "$500", run: () => void withdraw(500) },
            { label: "OTHER AMOUNT", run: () => { setEntry(""); setMessage(null); setScreen("other"); } },
            { label: wantReceipt ? "RECEIPT: YES" : "RECEIPT: NO", run: () => setWantReceipt((w) => !w) },
            { label: "BACK", run: () => setScreen("menu") },
          ],
        };
      case "other":
        return { ...none, right: [null, null, null, { label: "BACK", run: () => setScreen("withdraw") }] };
      default:
        return none;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, statement, wantReceipt, balance, pin]);

  const body = (() => {
    switch (screen) {
      case "no_card":
        return (
          <Centre>
            <p>WELCOME TO MERIDIAN</p>
            <p className="mt-3 text-[11px] opacity-80">
              {account ? "COLLECT YOUR DEBIT CARD FROM NEW ACCOUNTS" : "OPEN AN ACCOUNT TO GET A CARD"}
            </p>
          </Centre>
        );
      case "welcome":
        return (
          <Centre>
            <p className="text-base">WELCOME TO MERIDIAN</p>
            <p className="mt-3 animate-pulse">PLEASE INSERT YOUR CARD ›</p>
            <p className="mt-4 text-[10px] opacity-70">COVER THE KEYPAD WHEN YOU ENTER YOUR PIN</p>
          </Centre>
        );
      case "pin":
        return (
          <Centre>
            <p>ENTER YOUR PIN</p>
            <p className="mt-3 font-mono text-3xl tracking-[0.5em]">{"•".repeat(pin.length).padEnd(4, "_")}</p>
            <p className="mt-3 text-[10px] opacity-80">PRESS ENTER · CLEAR TO CORRECT · CANCEL FOR CARD</p>
            {message && <p className="mt-2 text-[#ffc65c]">{message}</p>}
          </Centre>
        );
      case "menu":
        return <Centre>SELECT A SERVICE</Centre>;
      case "balance":
        return (
          <Centre>
            <p>AVAILABLE BALANCE</p>
            <p className="mt-2 text-3xl">${balance}</p>
          </Centre>
        );
      case "mini":
        return (
          <div className="px-28 pt-3 font-mono text-[11px]">
            <p className="mb-1 text-center">MINI STATEMENT</p>
            {statement.slice(0, 5).map((l) => (
              <p key={l.id} className="flex justify-between">
                <span>{l.kind.toUpperCase().slice(0, 14)}</span>
                <span>{l.amount > 0 ? `+${l.amount}` : l.amount || "0"}</span>
              </p>
            ))}
          </div>
        );
      case "withdraw":
        return (
          <Centre>
            <p>CHOOSE AN AMOUNT</p>
            <p className="mt-1 text-[10px] opacity-80">AVAILABLE ${balance} · NOTES OF $10</p>
            {message && <p className="mt-2 text-[#ffc65c]">{message}</p>}
          </Centre>
        );
      case "other":
        return (
          <Centre>
            <p>ENTER AMOUNT · MULTIPLES OF $10</p>
            <p className="mt-3 font-mono text-3xl">${entry || "0"}</p>
            <p className="mt-2 text-[10px] opacity-80">PRESS ENTER</p>
            {message && <p className="mt-2 text-[#ffc65c]">{message}</p>}
          </Centre>
        );
      case "working":
        return <Centre><p className="animate-pulse">PLEASE WAIT…</p></Centre>;
      case "take_card":
        return <Centre><p className="animate-pulse">PLEASE TAKE YOUR CARD</p></Centre>;
      case "take_cash":
        return <Centre><p className="animate-pulse">PLEASE TAKE YOUR CASH</p></Centre>;
      case "thanks":
        return (
          <Centre>
            <p>THANK YOU FOR BANKING WITH MERIDIAN</p>
            {paid && <p className="mt-2 text-[11px] opacity-80">BALANCE NOW ${paid.balanceAfter}</p>}
          </Centre>
        );
      case "locked":
        return (
          <Centre>
            <p className="text-[#ffc65c]">TOO MANY INCORRECT PINS</p>
            <p className="mt-2 text-[11px]">FOR YOUR SAFETY YOUR CARD IS LOCKED FOR A FEW MINUTES. NOTHING IS CHARGED.</p>
          </Centre>
        );
    }
  })();

  // ── The machine ────────────────────────────────────────────────────────────

  return (
    <Modal onClose={onClose} width="lg" className="!bg-transparent !p-0 !shadow-none !border-0">
      <div
        className="mx-auto w-full max-w-[560px] rounded-[18px] p-4 text-[#1b1f27] shadow-2xl"
        style={{ background: "linear-gradient(180deg,#d9dde3 0%,#b8bec7 55%,#a7aeb8 100%)" }}
        role="application"
        aria-label="Meridian ATM"
      >
        <div className="grid grid-cols-[1fr_118px] gap-3">
          {/* Left: the screen with its side keys, and the cash dispenser */}
          <div className="rounded-xl p-3" style={{ background: "linear-gradient(180deg,#c9ced6,#aeb5bf)" }}>
            <div className="grid grid-cols-[34px_1fr_34px] gap-1.5">
              <SideKeys keys={keys.left} side="left" />
              <div className="relative h-[230px] overflow-hidden rounded-md border-4 border-[#5d6470] bg-[#0e2a3a] text-[#bfeaf5] shadow-inner">
                <div className={`absolute inset-0 flex flex-col justify-center ${LINE}`}>{body}</div>
                {/* Side-key labels, on the row of the key they belong to */}
                <div className="pointer-events-none absolute inset-y-0 left-1 flex flex-col justify-around py-3">
                  {keys.left.map((k, i) => (
                    <span key={i} className="text-[10px] font-semibold">{k ? `◂ ${k.label}` : ""}</span>
                  ))}
                </div>
                <div className="pointer-events-none absolute inset-y-0 right-1 flex flex-col items-end justify-around py-3">
                  {keys.right.map((k, i) => (
                    <span key={i} className="text-[10px] font-semibold">{k ? `${k.label} ▸` : ""}</span>
                  ))}
                </div>
              </div>
              <SideKeys keys={keys.right} side="right" />
            </div>
            {/* CASH */}
            <div className="mx-auto mt-3 w-2/3">
              <p className="rounded-sm bg-[#1f3a6b] py-0.5 text-center text-[11px] font-semibold tracking-widest text-white">CASH</p>
              <button
                aria-label={cashOut ? `Take your cash, $${cashOut}` : "Cash dispenser"}
                onClick={takeCash}
                className="relative mt-1 block h-7 w-full overflow-visible rounded-sm bg-[#2a2f38] shadow-inner"
              >
                {cashOut !== null && (
                  <span className="absolute inset-x-6 -top-6 flex h-9 animate-slide-up items-center justify-center rounded-sm border border-[#3f7a4a] bg-[#cfe6c9] text-xs font-semibold text-[#1f4a2a] shadow">
                    ${cashOut} · take it
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Right: receipt, card, the light */}
          <div className="flex flex-col gap-3">
            <div className="rounded-lg bg-[#c2c8d0] p-2 shadow-inner">
              <p className="rounded-sm bg-[#1f3a6b] py-0.5 text-center text-[10px] font-semibold tracking-widest text-white">RECEIPT</p>
              <div className="relative mt-1.5 h-2 rounded-sm bg-[#2a2f38]">
                {receipt && (
                  <button
                    onClick={() => setReceipt(null)}
                    aria-label="Take the receipt"
                    className="absolute left-1/2 top-1 z-10 w-[150px] -translate-x-1/2 animate-slide-up rounded-sm bg-[#fbfaf6] p-2 text-left font-mono text-[9px] leading-tight text-[#22252c] shadow-lg"
                  >
                    {receipt.map((r, i) => (
                      <span key={i} className="block whitespace-pre">{r}</span>
                    ))}
                    <span className="mt-1 block text-center text-[8px] text-[#8d96a6]">(click to take)</span>
                  </button>
                )}
              </div>
            </div>
            <div className="rounded-lg bg-[#c2c8d0] p-2 shadow-inner">
              <p className="rounded-sm bg-[#1f3a6b] py-0.5 text-center text-[10px] font-semibold tracking-widest text-white">CARD</p>
              <button
                onClick={screen === "take_card" ? takeCard : insertCard}
                aria-label={screen === "take_card" ? "Take your card" : "Insert your card"}
                className="relative mt-1.5 block h-14 w-full rounded-md bg-[#3a404b] shadow-inner"
              >
                <span className="absolute inset-x-3 top-1/2 h-1 -translate-y-1/2 rounded bg-[#0c0e12]" />
                {(screen === "take_card" || (!cardIn && screen === "welcome")) && (
                  <span
                    className={`absolute left-1/2 top-[30%] h-7 w-14 -translate-x-1/2 rounded-sm shadow ${screen === "take_card" ? "animate-slide-up" : "animate-pulse"}`}
                    style={{ background: "linear-gradient(135deg,#26385f,#3a2f17)" }}
                  >
                    <span className="absolute left-1 top-1 h-2 w-3 rounded-[2px] bg-[#e5c77a]" />
                  </span>
                )}
              </button>
            </div>
            <div className="flex flex-1 items-center justify-center rounded-lg bg-[#c2c8d0] p-3 shadow-inner">
              <div className={`grid h-14 w-12 place-items-center rounded-md border border-[#8d96a6] bg-[#e6e9ee] ${screen === "welcome" || screen === "take_card" ? "animate-pulse" : ""}`}>
                <span className="block h-0 w-0 border-x-[9px] border-b-[14px] border-x-transparent border-b-[#3f9a5a]" />
              </div>
            </div>
          </div>
        </div>

        {/* The keypad */}
        <div className="mx-auto mt-4 w-[300px] rounded-lg bg-[#9aa1ab] p-3 shadow-inner">
          <div className="grid grid-cols-4 gap-2">
            {["1", "2", "3", "cancel", "4", "5", "6", "clear", "7", "8", "9", "enter", "", "0", "", ""].map((k, i) =>
              k ? (
                <button
                  key={i}
                  onClick={() => press(k)}
                  disabled={busy}
                  className={`h-9 rounded-md border-b-2 text-sm font-bold shadow active:translate-y-px ${
                    k === "cancel"
                      ? "border-[#7a1f1a] bg-[#d33a2f] text-[10px] text-white"
                      : k === "clear"
                        ? "border-[#8a6d12] bg-[#f0c330] text-[10px] text-[#3a2c00]"
                        : k === "enter"
                          ? "border-[#1f5a2f] bg-[#3fa65a] text-[10px] text-white"
                          : "border-[#6d737c] bg-gradient-to-b from-[#f1f3f6] to-[#cfd4db] text-[#2a2f38]"
                  }`}
                >
                  {k === "cancel" ? "CANCEL" : k === "clear" ? "CLEAR" : k === "enter" ? "ENTER" : k}
                </button>
              ) : (
                <span key={i} />
              ),
            )}
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between text-[11px] text-[#3a404b]">
          <span>{cardIn ? `Card •••• ${account?.cardLast4} inserted` : "Click the CARD slot to insert your card"}</span>
          <button onClick={onClose} className="rounded border border-[#6d737c] px-2 py-0.5 hover:bg-white/40">
            Walk away
          </button>
        </div>
      </div>
    </Modal>
  );
}

function Centre({ children }: { children: React.ReactNode }) {
  return <div className="px-24 text-center">{children}</div>;
}

function SideKeys({ keys, side }: { keys: (Choice | null)[]; side: "left" | "right" }) {
  return (
    <div className="flex flex-col justify-around py-3">
      {keys.map((k, i) => (
        <button
          key={i}
          onClick={() => {
            if (!k) return;
            audio.play("ui_click");
            k.run();
          }}
          aria-label={k ? k.label : `${side} key ${i + 1}`}
          className="h-7 rounded-sm border-b-2 border-[#6d737c] bg-gradient-to-b from-[#eef0f3] to-[#c6ccd4] text-[10px] text-[#3a404b] shadow active:translate-y-px"
        >
          {side === "left" ? "›" : "‹"}
        </button>
      ))}
    </div>
  );
}
