// The one thing the city asks of you.
//
// Deliberately not a quest system. There are no chains, no branches, no board
// to open and no progress bar — there is one line, it names one place, and it
// goes away when you have been there. The later stages of the career will each
// replace it with their own line; none of them needs anything more than that.
//
// It reads its answer from state that already exists rather than inventing
// somewhere new to keep it: the Café's session blob carries `questionIndex`, and
// that blob is on the server, so the objective survives a reload and follows the
// player to another device without a second source of truth to drift.
import { readSession } from "@/framework/session/sync";
import { hasDeposited, useBankStore } from "@/framework/bank/bankStore";
import { firstVisitStep } from "@/framework/bank/firstVisit";

export interface CityObjective {
  /** The small heading over the line: "First thing", "Next". */
  label: string;
  /** One line, in the city's own voice. */
  line: string;
  /** The venue it points at — the marker sits on this. */
  venueId: string;
}

const FIRST: CityObjective = {
  label: "First thing",
  line: "Go to the Café on Market Street. Owen is expecting you at ten.",
  venueId: "cafe",
};

const BANK: CityObjective = {
  label: "Next",
  line: "Your café earnings are in your wallet. Visit Meridian Bank downtown, open an account and deposit your money.",
  venueId: "bank",
};

/** The Café's saved career, as far as this file needs it. */
function cafeBlob(): {
  questionIndex?: unknown;
  stageId?: unknown;
  index?: unknown;
  role?: unknown;
} | null {
  return readSession("cafe") as {
    questionIndex?: unknown;
    stageId?: unknown;
    index?: unknown;
    role?: unknown;
  } | null;
}

function interviewBegun(): boolean {
  const blob = cafeBlob();
  if (typeof blob?.questionIndex === "number" && blob.questionIndex > 0) return true;
  // The career journey's blob: anywhere past the first question of the interview.
  if (typeof blob?.stageId !== "string") return false;
  return blob.stageId !== "cafe.interview" || (typeof blob.index === "number" && blob.index > 0);
}

/**
 * Whether the Café career is finished — handed on to a successor, salary paid.
 *
 * Walking out at a gate also ends at `cafe.exit`, but nobody reaches it as CEO
 * except by running the place and choosing who gets it, so the role tells the
 * two apart.
 */
export function cafeFinished(): boolean {
  const blob = cafeBlob();
  return blob?.stageId === "cafe.exit" && blob.role === "ceo";
}

/**
 * The bank's part of the story, once the café is behind them: open an account,
 * then pay the money in. Until the bank has answered, assume the first step —
 * it is the only one a player who has not been there yet can be on.
 */
function bankObjective(): CityObjective | null {
  const bank = useBankStore.getState();
  if (!bank.loaded) return BANK;
  const step = firstVisitStep(bank.account !== null, hasDeposited(bank.statement));
  return step ? { label: "Next", line: step.cityLine, venueId: "bank" } : null;
}

/** The objective, or null when there is nothing to ask of them right now. */
export function currentObjective(): CityObjective | null {
  if (cafeFinished()) return bankObjective();
  return interviewBegun() ? null : FIRST;
}

/** Whether this venue is the one the objective is pointing at. */
export function isObjectiveVenue(venueId: string): boolean {
  return currentObjective()?.venueId === venueId;
}
