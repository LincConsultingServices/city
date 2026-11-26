import { describe, it, expect } from "vitest";
import { amountInWords, numberToWords, wordsMatch } from "./words";
import {
  checkSlip,
  emptySlip,
  notesTotal,
  slipAmount,
  type SlipContext,
  type SlipValues,
} from "./slip";

describe("amounts in words", () => {
  it("writes numbers the way a slip does", () => {
    expect(numberToWords(0)).toBe("zero");
    expect(numberToWords(7)).toBe("seven");
    expect(numberToWords(42)).toBe("forty two");
    expect(numberToWords(420)).toBe("four hundred and twenty");
    expect(numberToWords(1208)).toBe("one thousand two hundred and eight");
    expect(numberToWords(1005)).toBe("one thousand and five");
    expect(numberToWords(25_000)).toBe("twenty five thousand");
    expect(numberToWords(3_400_017)).toBe("three million four hundred thousand and seventeen");
    expect(amountInWords(1)).toBe("One dollar only");
    expect(amountInWords(250)).toBe("Two hundred and fifty dollars only");
  });

  it("forgives punctuation and filler, never the number", () => {
    expect(wordsMatch("Four hundred and twenty dollars only", 420)).toBe(true);
    expect(wordsMatch("four hundred twenty", 420)).toBe(true);
    expect(wordsMatch("FOUR-HUNDRED & TWENTY ONLY.", 420)).toBe(true);
    expect(wordsMatch("Forty-two dollars", 42)).toBe(true);
    expect(wordsMatch("four hundred and two", 420)).toBe(false);
    expect(wordsMatch("two hundred dollars only", 250)).toBe(false);
    expect(wordsMatch("", 10)).toBe(false);
  });
});

const ctx = (over: Partial<SlipContext> = {}): SlipContext => ({
  kind: "deposit",
  today: "2026-11-18",
  accountNumber: "4012345678",
  holder: "Asha Rao",
  signature: "A. Rao",
  available: 1000,
  autoTotal: false,
  ...over,
});

const goodDeposit = (): SlipValues => ({
  ...emptySlip("2026-11-18"),
  accountNumber: "4012345678",
  name: "Asha Rao",
  notes: { 100: 4, 50: 0, 20: 1, 10: 0, 5: 0, 1: 0 },
  amount: "420",
  words: "Four hundred and twenty dollars only",
  signature: "A. Rao",
});

const fields = (v: SlipValues, c = ctx()) => checkSlip(v, c).map((i) => i.field);

describe("Mei checks a deposit slip", () => {
  it("accepts a slip filled in correctly", () => {
    expect(checkSlip(goodDeposit(), ctx())).toEqual([]);
    expect(notesTotal(goodDeposit().notes)).toBe(420);
  });

  it("catches the most common mistake: a wrong account number", () => {
    const issues = checkSlip({ ...goodDeposit(), accountNumber: "4012345679" }, ctx());
    expect(issues.map((i) => i.field)).toEqual(["accountNumber"]);
    expect(issues[0].message).toMatch(/someone else's account/);
  });

  it("checks the notes against the total, and the words against the figures", () => {
    expect(fields({ ...goodDeposit(), amount: "400" })).toContain("amount");
    expect(fields({ ...goodDeposit(), words: "Four hundred dollars only" })).toEqual(["words"]);
  });

  it("adds the notes up for Level A, so only the words have to agree", () => {
    const a = ctx({ autoTotal: true });
    const v = { ...goodDeposit(), amount: "" };
    expect(slipAmount(v, a)).toBe(420);
    expect(checkSlip(v, a)).toEqual([]);
  });

  it("won't take more cash than you have", () => {
    expect(fields(goodDeposit(), ctx({ available: 300 }))).toEqual(["amount"]);
  });

  it("wants today's date, the account's name and the account's signature", () => {
    expect(fields({ ...goodDeposit(), date: "2026-11-01" })).toEqual(["date"]);
    expect(fields({ ...goodDeposit(), name: "A Rao" })).toEqual(["name"]);
    expect(fields({ ...goodDeposit(), signature: "Asha" })).toEqual(["signature"]);
    expect(fields({ ...goodDeposit(), signature: "" })).toEqual(["signature"]);
  });
});

describe("Mei checks a withdrawal slip", () => {
  const w = ctx({ kind: "withdrawal", available: 500 });
  const goodWithdrawal = (): SlipValues => ({
    ...goodDeposit(),
    notes: emptySlip("").notes,
    amount: "120",
    words: "One hundred and twenty dollars",
  });

  it("needs no notes, and can't take out more than the account holds", () => {
    expect(checkSlip(goodWithdrawal(), w)).toEqual([]);
    expect(fields({ ...goodWithdrawal(), amount: "600", words: "six hundred" }, w)).toEqual([
      "amount",
    ]);
  });
});
