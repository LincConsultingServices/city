// Who works at Meridian Bank, where they stand, and what they say when you walk
// up (docs/PRD_Building_Bank.md §6).
//
// The bank explains; it never advises. Every line here says how something
// works or where to find it — none of them tells the player what they should do
// with their own money. That rule is a test (cast.test.ts), because it is the
// easiest one in the building to break by accident.
import type { Cell } from "@/lib/pathfinding";
import type { Cardinal } from "@/world/assets";
import { BANK_CAST, CROWD, paletteOf, type CharacterLook } from "@/ui/characters";
import type { PersonPalette } from "@/world/characterArt";

export type StaffId = keyof typeof BANK_CAST;

export interface StaffMember {
  id: StaffId;
  name: string;
  role: string;
  look: CharacterLook;
  palette: PersonPalette;
  /** Where they stand. Never a blocking cell (room.test.ts). */
  anchor: Cell;
  /** Which way they face when nobody is near. */
  facing: Cardinal;
  /** The station you talk to them from. */
  stationId: string;
  /** What they say, one bubble at a time. */
  lines: readonly string[];
}

const staff = (
  id: StaffId,
  anchor: Cell,
  facing: Cardinal,
  stationId: string,
  lines: readonly string[],
): StaffMember => ({
  id,
  name: BANK_CAST[id].name,
  role: BANK_CAST[id].role,
  look: BANK_CAST[id].look,
  palette: paletteOf(BANK_CAST[id].look),
  anchor,
  facing,
  stationId,
  lines,
});

export const STAFF: readonly StaffMember[] = [
  staff("rosa", { x: 3, y: 10 }, "S", "st_welcome", [
    "Welcome to Meridian Bank! I'm Rosa. If you're not sure where to go, you start with me.",
    "Take a ticket from the machine by the door. When your number comes up on the screen over the counter, go to that window.",
    "Opening an account? That's Daniel, at the New Accounts desk on the right. Once you have one, Mei at window 1 takes deposits and pays out cash, and Omar at window 2 does cheques and passbooks.",
    "Farah, at Savings & Deposits, can show you how money grows in the bank. Sofia handles loans. And Mr Hale, the branch manager, is in the glass office at the back.",
    "The ATMs, the passbook printer and the cheque drop box are along the left wall. They work even when the counters are busy.",
  ]),
  staff("daniel", { x: 14, y: 7 }, "W", "st_accounts", [
    "Hello! Daniel Osei, New Accounts. This is where every customer's story with the bank begins.",
    "An account is your own space in the bank: your money is kept safe, and every dollar in or out is written down for you.",
    "To open one you'll fill in a form, show a valid ID so we know you are who you say you are, and sign. The signature matters: it's how we check that cheques and slips really come from you.",
    "There are two main kinds. A savings account is for keeping and growing your own money, and it pays interest. A current account is for businesses that pay and get paid all day, and it doesn't.",
  ]),
  staff("mei", { x: 8, y: 3 }, "S", "st_window1", [
    "Window 1, cash! I'm Mei.",
    "Putting money into your account is a deposit. Taking it out is a withdrawal. Both need a slip, which you'll find on the form table, and both show up in your passbook.",
    "The most common mistake on a slip? A wrong account number. Always copy it from your passbook, never from memory.",
  ]),
  staff("omar", { x: 10, y: 3 }, "S", "st_window2", [
    "Window 2. Omar. Cheques and passbooks.",
    "A cheque is a written order to your bank to pay someone from your account. The amount goes on it twice, in words and in figures, so it's hard to change.",
    "Bring me your passbook and I'll print everything that's happened since you last looked. Or use the printer by the wall. It does the same job and never takes a tea break.",
  ]),
  staff("farah", { x: 14, y: 9 }, "W", "st_savings", [
    "Farah Siddiqui, Savings & Deposits. Pull up a chair.",
    "Money in a savings account earns interest: the bank pays you a little for keeping it here. Leave the interest in too, and next month it earns interest of its own. That's compound interest.",
    "A fixed deposit locks money away for a set time at a higher rate. A recurring deposit saves the same amount every month. I explain how each one works. Which suits you is always your call.",
  ]),
  staff("sofia", { x: 14, y: 11 }, "W", "st_loans", [
    "Sofia Reyes, Loans.",
    "A loan is money the bank lends you, which you pay back over time with interest on top. The interest is the price of borrowing.",
    "Before lending, a bank looks at how you've handled money so far. That's why this desk opens to customers who've banked with us for a while.",
  ]),
  staff("gregory", { x: 3, y: 1 }, "S", "st_manager", [
    "Ah, a new face. Gregory Hale, branch manager. Come in.",
    "A bank runs on trust. You trust us with your money; we keep it safe and keep an honest record of every dollar.",
    "Every rule out there in the hall, from the ID check and the signatures to the slips, exists to protect that trust. If anything ever goes wrong at the counters, my door is open.",
  ]),
  staff("ben", { x: 10, y: 12 }, "N", "st_guard", [
    "Morning. Ben. I keep an eye on the place.",
    "Two things I tell everyone. Keep your PIN to yourself: cover the keypad at the ATM. And nobody from a real bank will ever phone you asking for your password or PIN.",
  ]),
];

export const staffById = (id: StaffId): StaffMember | undefined => STAFF.find((s) => s.id === id);

export const staffAtStation = (stationId: string): StaffMember | undefined =>
  STAFF.find((s) => s.stationId === stationId);

// ── Customers ─────────────────────────────────────────────────────────────────

const crowdPalette = (i: number): PersonPalette => paletteOf(CROWD[i % CROWD.length]);

/** Customers who stay put: someone at an ATM, people waiting their turn. */
export interface StillCustomer {
  key: string;
  palette: PersonPalette;
  cell: Cell;
  facing: Cardinal;
}

export const STILL_CUSTOMERS: readonly StillCustomer[] = [
  { key: "c_atm", palette: crowdPalette(2), cell: { x: 1, y: 9 }, facing: "W" },
  { key: "c_wait1", palette: crowdPalette(4), cell: { x: 8, y: 9 }, facing: "N" },
  { key: "c_wait2", palette: crowdPalette(6), cell: { x: 11, y: 9 }, facing: "N" },
];

/**
 * Customers who come and go. Each walks a loop of errands, pausing at each:
 * in through the door, a ticket, a wait, the counter, and back out.
 */
export interface WalkingCustomer {
  key: string;
  palette: PersonPalette;
  /** The errands, in order. The first and last are the door. */
  stops: readonly Cell[];
  /** Seconds before they set off, so they don't all arrive together. */
  delayS: number;
}

const DOOR_IN: Cell = { x: 7, y: 12 };

export const WALKING_CUSTOMERS: readonly WalkingCustomer[] = [
  {
    key: "w1",
    palette: crowdPalette(1),
    stops: [DOOR_IN, { x: 6, y: 11 }, { x: 9, y: 11 }, { x: 10, y: 6 }, DOOR_IN],
    delayS: 0,
  },
  {
    key: "w2",
    palette: crowdPalette(3),
    stops: [DOOR_IN, { x: 2, y: 8 }, { x: 4, y: 7 }, { x: 8, y: 6 }, DOOR_IN],
    delayS: 7,
  },
  {
    key: "w3",
    palette: crowdPalette(5),
    stops: [DOOR_IN, { x: 3, y: 12 }, { x: 11, y: 7 }, { x: 11, y: 10 }, DOOR_IN],
    delayS: 15,
  },
];
