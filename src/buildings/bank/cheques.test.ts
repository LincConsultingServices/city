import { describe, it, expect } from "vitest";
import { checkCheque, dateProblem, isoDay, judged, practiceCheques, type ChequeValues } from "./cheques";
import { wordsMatch } from "./words";

const today = "2026-11-18";

describe("cheque dates", () => {
  it("knows a good date, a post-dated one and a stale one", () => {
    expect(dateProblem(today, today)).toBeNull();
    expect(dateProblem("2026-11-19", today)).toBeNull(); // a day's leeway for time zones
    expect(dateProblem("2026-12-18", today)).toBe("post_dated");
    expect(dateProblem("2026-06-01", today)).toBeNull();
    expect(dateProblem("2026-04-01", today)).toBe("stale");
    expect(dateProblem("", today)).toBe("missing");
  });
});

describe("writing a cheque to yourself", () => {
  const ctx = { today, signature: "A. Rao", toSelf: true };
  const good: ChequeValues = {
    date: today,
    amount: "120",
    words: "One hundred and twenty dollars only",
    signature: "A. Rao",
    crossed: false,
  };
  const fields = (v: ChequeValues) => checkCheque(v, ctx).map((i) => i.field);

  it("accepts a cheque written properly", () => {
    expect(checkCheque(good, ctx)).toEqual([]);
  });

  it("catches each mistake, saying why", () => {
    expect(fields({ ...good, words: "Twelve dollars only" })).toEqual(["words"]);
    expect(fields({ ...good, signature: "" })).toEqual(["signature"]);
    expect(fields({ ...good, signature: "Asha" })).toEqual(["signature"]);
    expect(fields({ ...good, date: "2027-01-01" })).toEqual(["date"]);
    expect(fields({ ...good, amount: "" })).toEqual(["amount"]);
    // A crossed cheque can't be cashed — the classic way to get "Pay: Self" wrong.
    expect(fields({ ...good, crossed: true })).toEqual(["crossed"]);
  });
});

describe("spot the bad cheque", () => {
  const cheques = practiceCheques(new Date(2026, 10, 18), false);

  it("has exactly one good cheque among the rest, and every cheque's words are right unless that is the fault", () => {
    expect(cheques.filter((c) => c.faults.length === 0)).toHaveLength(1);
    for (const c of cheques) {
      expect(wordsMatch(c.words, c.amount)).toBe(!c.faults.includes("mismatch"));
      const dp = dateProblem(c.date, isoDay(new Date(2026, 10, 18)));
      expect(dp === "stale").toBe(c.faults.includes("stale"));
    }
  });

  it("judges exactly: every fault found and nothing invented", () => {
    const mismatch = cheques.find((c) => c.faults.includes("mismatch"))!;
    expect(judged(mismatch, ["mismatch"])).toBe(true);
    expect(judged(mismatch, [])).toBe(false);
    expect(judged(mismatch, ["mismatch", "unsigned"])).toBe(false);
    const fine = cheques.find((c) => c.faults.length === 0)!;
    expect(judged(fine, [])).toBe(true);
  });

  it("adds a cheque with two faults on Level B", () => {
    const b = practiceCheques(new Date(2026, 10, 18), true);
    const two = b.find((c) => c.faults.length === 2)!;
    expect(two).toBeDefined();
    expect(judged(two, ["post_dated"])).toBe(false);
    expect(judged(two, ["bearer", "post_dated"])).toBe(true);
  });
});
