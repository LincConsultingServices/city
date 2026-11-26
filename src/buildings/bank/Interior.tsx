// Meridian Bank's interior — the DOM half. Owns the full-bleed layer, the
// prompts, the panels (talking to staff, the rates board, the leaflets), the
// queue, the live region and the keyboard, and hosts <BankCanvas> for the room.
// Default-exported because the framework mounts it through `lazy()`.
import { useEffect, useState } from "react";
import type { InteriorProps } from "@/framework/building/manifest";
import { audio } from "@/framework/audio/audioManager";
import { Icon } from "@/ui/Icon";
import { Modal } from "@/ui/Modal";
import { Portrait } from "@/ui/Portrait";
import { BankCanvas } from "./BankCanvas";
import { stationById, zoneAt } from "./room";
import { BankMapPanel, BankMinimap } from "./BankMap";
import { staffById, type StaffId } from "./cast";
import {
  actHere,
  resetRoomState,
  tickQueue,
  ticketLabel,
  useRoomStore,
  type Panel,
} from "./roomStore";
import { LEAFLETS, RATES } from "./content";
import { AccountOpening } from "./AccountOpening";
import { CloseAccount, Passbook } from "./Passbook";
import { PassbookPrinter, Slip, TicketMachine } from "./Counter";
import { Atm } from "./Atm";
import { CashACheque, ChequeBookRequest, PayInCheque, SpotTheCheque } from "./ChequeDesk";
import { MyDeposits, OpenDeposit, SavingsCalculator } from "./FarahDesk";
import { SalarySetting, TransferMoney } from "./Payments";
import { BorrowMoney, CreditReport, MyLoan } from "./SofiaDesk";
import {
  hasDeposited,
  loadBank,
  nextClearing,
  nextDepositMonth,
  nextLoanMonth,
  useBankStore,
} from "@/framework/bank/bankStore";
import { firstVisitStep } from "@/framework/bank/firstVisit";

/** How often the queue moves while you hold a ticket. */
const QUEUE_STEP_MS = 3000;
/** How long a station's note stays on screen. */
const NOTE_MS = 6500;

export default function BankInterior({ manifest, onExit }: InteriorProps) {
  const [ready, setReady] = useState(false);
  const panel = useRoomStore((s) => s.panel);
  const charCell = useRoomStore((s) => s.charCell);
  const nearExit = useRoomStore((s) => s.nearExit);
  const nearStationId = useRoomStore((s) => s.nearStationId);
  const announcement = useRoomStore((s) => s.announcement);
  const note = useRoomStore((s) => s.note);
  const queue = useRoomStore((s) => s.queue);

  useEffect(() => {
    resetRoomState();
    // Read the account on the way in. That also pays any interest that came due
    // while the player was away, so the passbook is up to date before they ask.
    loadBank().catch(() =>
      useRoomStore
        .getState()
        .say("The bank's systems are slow today. Your account will show up in a moment."),
    );
  }, []);

  const account = useBankStore((s) => s.account);
  const statement = useBankStore((s) => s.statement);
  const bankLoaded = useBankStore((s) => s.loaded);
  const guide = bankLoaded ? firstVisitStep(account !== null, hasDeposited(statement)) : null;
  const cheques = useBankStore((s) => s.cheques);
  const heldCheque = account
    ? cheques.find((c) => c.direction === "in" && c.status === "held")
    : undefined;
  const clearsAt = nextClearing(cheques);
  const deposits = useBankStore((s) => s.deposits);
  const monthHours = useBankStore((s) => s.rules?.monthHours);
  const loans = useBankStore((s) => s.loans);
  const loanAt = nextLoanMonth(loans, monthHours);
  const depositAt0 = nextDepositMonth(deposits, monthHours);
  // The sooner of a deposit month and a loan instalment.
  const depositAt =
    depositAt0 && loanAt ? (depositAt0 < loanAt ? depositAt0 : loanAt) : (depositAt0 ?? loanAt);
  // The next thing that will change the account on its own: a cheque clearing,
  // or a deposit month (an instalment, interest, a maturity).
  const nextEvent =
    clearsAt && depositAt ? (clearsAt < depositAt ? clearsAt : depositAt) : (clearsAt ?? depositAt);

  // When it is due, read the bank again, so the change shows up without the
  // player having to leave and come back.
  useEffect(() => {
    if (!nextEvent) return;
    const wait = Math.max(1000, nextEvent.getTime() - Date.now() + 1500);
    const t = window.setTimeout(() => {
      const before = useBankStore.getState().statement[0]?.id;
      void loadBank()
        .then(() => {
          const latest = useBankStore.getState().statement[0];
          if (latest && latest.id !== before)
            useRoomStore.getState().say(`Your account: ${latest.note || latest.kind}.`);
        })
        .catch(() => undefined);
    }, wait);
    return () => window.clearTimeout(t);
  }, [nextEvent?.getTime()]); // eslint-disable-line react-hooks/exhaustive-deps

  // A panel over the room freezes the room.
  useEffect(() => {
    useRoomStore.getState().setInputLocked(panel !== null);
  }, [panel]);

  // The queue moves while you hold a ticket that has not been called.
  const waiting = queue.ticket !== null && queue.calledTo === null;
  useEffect(() => {
    if (!waiting) return;
    const t = window.setInterval(tickQueue, QUEUE_STEP_MS);
    return () => window.clearInterval(t);
  }, [waiting]);

  // A station's note fades after a few seconds.
  const [shownNote, setShownNote] = useState<string | null>(null);
  useEffect(() => {
    if (!note.text) return;
    setShownNote(note.text);
    const t = window.setTimeout(() => setShownNote(null), NOTE_MS);
    return () => window.clearTimeout(t);
  }, [note]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (useRoomStore.getState().inputLocked) return;
        leave();
        return;
      }
      // M opens the bank's own map — the city's has no business in here.
      if ((e.key === "m" || e.key === "M") && !e.repeat) {
        const st = useRoomStore.getState();
        if (st.panel?.kind === "map") {
          audio.play("ui_close");
          st.setPanel(null);
        } else if (!st.inputLocked) {
          audio.play("ui_open");
          st.setPanel({ kind: "map" });
        }
        return;
      }
      if (e.key !== "e" && e.key !== "E" && e.key !== "Enter") return;
      if (e.key === "Enter" && document.activeElement instanceof HTMLButtonElement) return;
      if (useRoomStore.getState().inputLocked) return;
      if (useRoomStore.getState().nearExit) leave();
      else actHere();
    }
    function leave() {
      audio.play("ui_close");
      onExit();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onExit]);

  const station = nearStationId ? stationById(nearStationId) : undefined;
  const prompt = nearExit ? "leave the bank" : (station?.prompt ?? null);
  const close = () => {
    audio.play("ui_close");
    useRoomStore.getState().setPanel(null);
  };

  return (
    <div className="pointer-events-none absolute inset-0 z-20 animate-fade-in">
      <BankCanvas onReady={() => setReady(true)} />

      {!ready && (
        <div className="absolute inset-0 grid place-items-center bg-ink">
          <p className="text-sm text-muted">The heavy doors swing open…</p>
        </div>
      )}

      <div className="pointer-events-none absolute left-5 top-5 z-10">
        <p className="font-display text-lg font-semibold text-gold">{manifest.displayName}</p>
        <p className="text-xs uppercase tracking-widest text-muted">{zoneAt(charCell).label}</p>
        {guide && (
          <div className="mt-2 max-w-[18rem] rounded-xl border border-gold/40 bg-surface/85 px-3 py-2 backdrop-blur">
            <p className="text-[10px] uppercase tracking-widest text-muted">
              {account ? "Next" : "First visit"}
            </p>
            <p className="mt-0.5 text-xs leading-relaxed text-text">{guide.line}</p>
          </div>
        )}
        {!guide && heldCheque && (
          <div className="mt-2 max-w-[18rem] rounded-xl border border-gold/40 bg-surface/85 px-3 py-2 backdrop-blur">
            <p className="text-[10px] uppercase tracking-widest text-muted">In your pocket</p>
            <p className="mt-0.5 text-xs leading-relaxed text-text">
              A cheque for ${heldCheque.amount} from {heldCheque.from}. Pay it in at window 2 (B
              ticket) or the drop box.
            </p>
          </div>
        )}
        {clearsAt && (
          <p className="mt-2 text-xs text-muted">
            Cheque clearing · ready about{" "}
            {clearsAt.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
          </p>
        )}
        {account && (
          <button
            onClick={() => {
              audio.play("ui_open");
              useRoomStore.getState().setPanel({ kind: "passbook" });
            }}
            className="pointer-events-auto mt-2 flex items-center gap-2 rounded-full border border-line/70 bg-surface/80 px-3 py-1.5 text-xs text-text backdrop-blur hover:border-gold/60"
          >
            <span className="text-muted">Passbook</span>
            <span className="font-semibold tabular-nums text-gold">${account.balance}</span>
          </button>
        )}
        {queue.ticket !== null && (
          <p className="mt-1 text-xs tabular-nums text-text">
            Your ticket {ticketLabel(queue.ticket, queue.service)}
            <span className="text-muted">
              {queue.calledTo !== null
                ? ` · go to window ${queue.calledTo}`
                : ` · now serving ${ticketLabel(queue.serving, queue.service)}`}
            </span>
          </p>
        )}
      </div>

      <button
        onClick={() => {
          audio.play("ui_close");
          onExit();
        }}
        className="pointer-events-auto absolute right-5 top-5 z-10 flex items-center gap-2 rounded-full border border-line/70 bg-surface/80 px-4 py-2 text-sm text-text backdrop-blur hover:brightness-110"
      >
        <Icon name="home" className="h-4 w-4" />
        Back to the street
        <span className="rounded bg-line/50 px-1.5 py-0.5 text-xs text-muted">Esc</span>
      </button>

      {shownNote && !panel && (
        <div className="pointer-events-none absolute bottom-40 left-1/2 z-10 w-[min(36rem,calc(100vw-2rem))] -translate-x-1/2 animate-slide-up">
          <p className="rounded-2xl border border-line/70 bg-surface/90 px-4 py-3 text-sm leading-relaxed text-text shadow-lg backdrop-blur">
            {shownNote}
          </p>
        </div>
      )}

      {prompt && !panel && (
        <div className="pointer-events-none absolute bottom-24 left-1/2 z-10 -translate-x-1/2 animate-slide-up">
          <button
            onClick={() => {
              if (!nearExit) return void actHere();
              audio.play("ui_close");
              onExit();
            }}
            className="pointer-events-auto rounded-full border border-gold/60 bg-surface/90 px-5 py-2.5 text-sm text-text shadow-lg backdrop-blur"
          >
            <span className="font-semibold text-gold">{prompt}</span>
            <span className="ml-2 rounded bg-line/50 px-1.5 py-0.5 text-xs text-muted">E</span>
          </button>
        </div>
      )}

      {!panel && (
        <BankMinimap
          highlight={guide?.station ?? null}
          onOpen={() => {
            audio.play("ui_open");
            useRoomStore.getState().setPanel({ kind: "map" });
          }}
        />
      )}

      <p className="pointer-events-none absolute bottom-4 right-5 z-10 text-xs text-muted">
        WASD or click to move · E to use · M map
      </p>

      {panel && (
        <div className="pointer-events-auto">
          {panel.kind === "talk" && <Conversation staff={panel.staff} onClose={close} />}
          {panel.kind === "rates" && <RatesBoard onClose={close} />}
          {panel.kind === "leaflets" && <Leaflets onClose={close} />}
          {panel.kind === "map" && <BankMapPanel onClose={close} />}
          {panel.kind === "open_account" && <AccountOpening onClose={close} />}
          {panel.kind === "passbook" && <Passbook onClose={close} />}
          {panel.kind === "close_account" && <CloseAccount onClose={close} />}
          {panel.kind === "ticket" && <TicketMachine onClose={close} />}
          {panel.kind === "slip" && <Slip kind={panel.slip} onClose={close} />}
          {panel.kind === "printer" && <PassbookPrinter onClose={close} />}
          {panel.kind === "window2" && <PassbookPrinter atWindow onClose={close} />}
          {panel.kind === "atm" && <Atm onClose={close} />}
          {panel.kind === "payin" && <PayInCheque dropBox={panel.dropBox} onClose={close} />}
          {panel.kind === "cash_cheque" && <CashACheque onClose={close} />}
          {panel.kind === "chequebook" && <ChequeBookRequest onClose={close} />}
          {panel.kind === "spot" && <SpotTheCheque onClose={close} />}
          {panel.kind === "calculator" && (
            <SavingsCalculator
              onClose={close}
              onOpen={(kind) =>
                useRoomStore.getState().setPanel({ kind: "open_deposit", deposit: kind })
              }
            />
          )}
          {panel.kind === "open_deposit" && <OpenDeposit kind={panel.deposit} onClose={close} />}
          {panel.kind === "my_deposits" && <MyDeposits onClose={close} />}
          {panel.kind === "transfer" && <TransferMoney onClose={close} />}
          {panel.kind === "salary" && <SalarySetting onClose={close} />}
          {panel.kind === "credit" && <CreditReport onClose={close} />}
          {panel.kind === "borrow" && <BorrowMoney onClose={close} />}
          {panel.kind === "my_loan" && <MyLoan onClose={close} />}
        </div>
      )}

      <p aria-live="polite" className="sr-only">
        {announcement.text}
      </p>
    </div>
  );
}

/** Talking to someone: their portrait, and what they say, one line at a time. */
function Conversation({ staff, onClose }: { staff: StaffId; onClose: () => void }) {
  const member = staffById(staff);
  const [i, setI] = useState(0);
  const account = useBankStore((s) => s.account);
  const queue = useRoomStore((s) => s.queue);
  const cheques = useBankStore((s) => s.cheques);
  if (!member) return null;
  const { services, notice } = deskServices(staff, {
    hasAccount: account !== null,
    hasCard: Boolean(account?.cardLast4),
    calledTo: queue.calledTo,
    heldCheques: cheques.filter((c) => c.direction === "in" && c.status === "held").length,
    hasLoan: Boolean(account?.activeLoan),
    chequeLeaves: account?.chequeLeaves ?? 0,
  });
  const last = i >= member.lines.length - 1;
  const next = () => {
    audio.play("ui_click");
    if (last) onClose();
    else setI(i + 1);
  };

  return (
    <Modal onClose={onClose} width="md">
      <div className="flex gap-4">
        <Portrait look={member.look} artId={`bank_${member.id}`} className="h-36 w-auto shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="font-display text-lg font-semibold text-gold">{member.name}</p>
          <p className="text-xs uppercase tracking-widest text-muted">{member.role}</p>
          <p key={i} className="mt-3 animate-fade-in text-sm leading-relaxed text-text">
            {member.lines[i]}
          </p>
        </div>
      </div>
      {notice && (
        <p className="mt-4 rounded-xl border border-line/60 bg-surface-2/60 p-3 text-sm leading-relaxed text-muted">
          {notice}
        </p>
      )}
      {services.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2 border-t border-line/60 pt-4">
          {services.map((sv) => (
            <button
              key={sv.label}
              onClick={() => {
                audio.play("ui_open");
                useRoomStore.getState().setPanel(sv.open);
              }}
              className={
                sv.primary
                  ? "rounded-full bg-gold px-4 py-2 text-sm font-semibold text-ink hover:brightness-110"
                  : "rounded-full border border-line/70 px-4 py-2 text-sm text-muted hover:border-gold/60 hover:text-text"
              }
            >
              {sv.label}
            </button>
          ))}
        </div>
      )}
      <div className="mt-5 flex items-center justify-between">
        <span className="text-xs tabular-nums text-muted">
          {i + 1} / {member.lines.length}
        </span>
        <div className="flex gap-2">
          {i > 0 && (
            <button
              onClick={() => setI(i - 1)}
              className="rounded-full border border-line/70 px-4 py-2 text-sm text-muted hover:text-text"
            >
              Back
            </button>
          )}
          <button
            autoFocus
            onClick={next}
            className="rounded-full bg-gold px-5 py-2 text-sm font-semibold text-ink hover:brightness-110"
          >
            {last ? "Thank you" : "Go on"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function RatesBoard({ onClose }: { onClose: () => void }) {
  return (
    <Modal onClose={onClose} width="md">
      <h2 className="font-display text-xl font-semibold text-gold">Today's rates</h2>
      <p className="mt-1 text-xs text-muted">
        Game rates: much faster than a real bank, so you can watch money grow in days, not years.
      </p>
      <table className="mt-4 w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-widest text-muted">
            <th className="pb-2 font-medium">Product</th>
            <th className="pb-2 font-medium">Rate</th>
            <th className="pb-2 font-medium">Good to know</th>
          </tr>
        </thead>
        <tbody>
          {RATES.map((r) => (
            <tr key={r.product} className="border-t border-line/60 align-top">
              <td className="py-2 pr-3 font-semibold text-text">{r.product}</td>
              <td className="py-2 pr-3 tabular-nums text-gold">{r.rate}</td>
              <td className="py-2 text-muted">{r.note}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-5 flex justify-end">
        <button
          autoFocus
          onClick={onClose}
          className="rounded-full bg-gold px-5 py-2 text-sm font-semibold text-ink hover:brightness-110"
        >
          Done
        </button>
      </div>
    </Modal>
  );
}

function Leaflets({ onClose }: { onClose: () => void }) {
  const [open, setOpen] = useState(0);
  const leaflet = LEAFLETS[open];
  return (
    <Modal onClose={onClose} width="md">
      <h2 className="font-display text-xl font-semibold text-gold">Leaflets</h2>
      <p className="mt-1 text-xs text-muted">Take one. They're free.</p>
      <div className="mt-4 flex flex-wrap gap-1.5">
        {LEAFLETS.map((l, i) => (
          <button
            key={l.title}
            onClick={() => setOpen(i)}
            aria-pressed={i === open}
            className={`rounded-full border px-3 py-1 text-xs ${
              i === open
                ? "border-gold bg-gold/15 text-text"
                : "border-line/70 text-muted hover:text-text"
            }`}
          >
            {l.title}
          </button>
        ))}
      </div>
      <article
        key={open}
        className="mt-4 animate-fade-in rounded-xl border border-line/60 bg-surface-2/50 p-4"
      >
        <h3 className="font-semibold text-text">{leaflet.title}</h3>
        {leaflet.body.map((p, i) => (
          <p key={i} className="mt-2 text-sm leading-relaxed text-muted">
            {p}
          </p>
        ))}
      </article>
      <div className="mt-5 flex justify-end">
        <button
          autoFocus
          onClick={onClose}
          className="rounded-full bg-gold px-5 py-2 text-sm font-semibold text-ink hover:brightness-110"
        >
          Done
        </button>
      </div>
    </Modal>
  );
}

interface DeskState {
  hasAccount: boolean;
  hasCard: boolean;
  /** The window your ticket has been called to, if any. */
  calledTo: number | null;
  /** Received cheques not paid in yet. */
  heldCheques: number;
  hasLoan: boolean;
  chequeLeaves: number;
}

interface Service {
  label: string;
  open: Panel;
  primary?: boolean;
}

/**
 * What a desk can do for you, depending on where you are with the bank, and a
 * line of what you need first when it can't do anything yet.
 */
function deskServices(staff: StaffId, st: DeskState): { services: Service[]; notice?: string } {
  switch (staff) {
    case "daniel": {
      if (!st.hasAccount)
        return {
          services: [{ label: "Open an account", open: { kind: "open_account" }, primary: true }],
        };
      const out: Service[] = [];
      if (!st.hasCard)
        out.push({ label: "Collect my card", open: { kind: "open_account" }, primary: true });
      out.push({ label: "Send money", open: { kind: "transfer" } });
      out.push({ label: "My salary", open: { kind: "salary" } });
      out.push({ label: "See my passbook", open: { kind: "passbook" } });
      out.push({ label: "Close my account", open: { kind: "close_account" } });
      return { services: out };
    }
    case "mei":
      if (!st.hasAccount) {
        return {
          services: [],
          notice:
            "You'll need an account before I can pay anything in. Daniel at New Accounts will open one for you.",
        };
      }
      if (st.calledTo !== 1) {
        return {
          services: [],
          notice:
            "Take an A ticket (cash) from the machine by the door. When the screen calls your number to window 1, I'll serve you.",
        };
      }
      return {
        services: [
          { label: "Deposit cash", open: { kind: "slip", slip: "deposit" }, primary: true },
          { label: "Withdraw cash", open: { kind: "slip", slip: "withdrawal" } },
        ],
      };
    case "sofia": {
      // Sofia's desk needs no ticket either.
      if (!st.hasAccount) {
        return {
          services: [],
          notice:
            "Loans are for customers with an account, once the bank has seen how they handle money. Daniel can open one for you.",
        };
      }
      return {
        services: [
          { label: "My credit score", open: { kind: "credit" }, primary: true },
          st.hasLoan
            ? { label: "My loan", open: { kind: "my_loan" } }
            : { label: "Borrow money", open: { kind: "borrow" } },
        ],
      };
    }
    case "farah": {
      // Farah's desk needs no ticket: you sit down and talk.
      const out: Service[] = [
        { label: "Compare my options", open: { kind: "calculator" }, primary: true },
      ];
      if (!st.hasAccount) {
        return {
          services: out,
          notice:
            "You'll need an account to open a deposit. The calculator works for anyone, though.",
        };
      }
      out.push({ label: "Open a fixed deposit", open: { kind: "open_deposit", deposit: "fd" } });
      out.push({
        label: "Start a recurring deposit",
        open: { kind: "open_deposit", deposit: "rd" },
      });
      out.push({ label: "My deposits", open: { kind: "my_deposits" } });
      return { services: out };
    }
    case "omar": {
      // Practice is free and needs no queue: Omar has a minute between customers.
      const practise: Service = { label: "Practise: spot the bad cheque", open: { kind: "spot" } };
      if (!st.hasAccount) {
        return {
          services: [practise],
          notice:
            "Once you have an account, I'll do your cheques and keep your passbook up to date.",
        };
      }
      if (st.calledTo !== 2) {
        return {
          services: [practise],
          notice:
            "Take a B ticket (cheques & passbooks) and I'll call you to window 2. Or use the printer or the cheque drop box by the wall: no queue.",
        };
      }
      const out: Service[] = [];
      if (st.heldCheques > 0)
        out.push({
          label: "Pay in a cheque",
          open: { kind: "payin", dropBox: false },
          primary: true,
        });
      out.push(
        st.chequeLeaves > 0
          ? { label: "Write a cheque", open: { kind: "cash_cheque" } }
          : { label: "Get a cheque book", open: { kind: "chequebook" } },
      );
      out.push({ label: "Update my passbook", open: { kind: "window2" } });
      out.push(practise);
      return { services: out };
    }
  }
  return { services: [] };
}
