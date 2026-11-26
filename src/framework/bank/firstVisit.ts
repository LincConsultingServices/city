// The first visit to the bank, and the only time the bank steers anybody: open
// an account, then pay your cash in. After the first deposit it stops — the
// bank is a service you use, not a mission you finish.
//
// Shared by the bank's own "Next" card and the city's guide box, so the two can
// never disagree about what the player should do next.

export interface FirstVisitStep {
  /** In the bank, said to someone standing inside it. */
  line: string;
  /** The station to light up on the bank's map. */
  station: string;
  /** Said on the street, by the guide box. */
  cityLine: string;
}

export function firstVisitStep(hasAccount: boolean, deposited: boolean): FirstVisitStep | null {
  if (!hasAccount) {
    return {
      line: "Open an account at New Accounts. Daniel is at the desk on the right.",
      station: "st_accounts",
      cityLine:
        "Your café earnings are in your wallet. Visit Meridian Bank downtown, open an account and deposit your money.",
    };
  }
  if (!deposited) {
    return {
      line: "Take a ticket from the machine by the door, then deposit your cash at window 1.",
      station: "st_token",
      cityLine: "Your account is open. Go back to Meridian Bank and deposit your cash at window 1.",
    };
  }
  return null;
}
