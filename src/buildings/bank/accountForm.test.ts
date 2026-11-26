import { describe, it, expect } from "vitest";
import {
  checkAccountForm,
  emptyForm,
  pinProblem,
  toRequest,
  type AccountFormValues,
} from "./accountForm";
import { CITY_ADDRESSES, pocketFor, VALID_ID } from "./pocket";

const pocket = pocketFor("Asha Rao");

const good = (): AccountFormValues => ({
  ...emptyForm("Asha Rao"),
  address: pocket.address,
  phone: pocket.phone,
  idDocument: VALID_ID,
  signature: "A. Rao",
  type: "savings",
});

const fields = (f: AccountFormValues) => checkAccountForm(f, pocket).map((i) => i.field);

describe("the pocket", () => {
  it("is the same for the same name, every time", () => {
    expect(pocketFor("Asha Rao")).toEqual(pocket);
    expect(CITY_ADDRESSES).toContain(pocket.address);
    expect(pocket.phone).toMatch(/^\d{10}$/);
  });

  it("holds exactly one valid ID, and the expired licence has an old address", () => {
    expect(pocket.cards.filter((c) => c.valid).map((c) => c.id)).toEqual([VALID_ID]);
    const licence = pocket.cards.find((c) => c.id === "driving_licence")!;
    expect(licence.address).not.toBe(pocket.address);
    for (const c of pocket.cards.filter((c) => !c.valid)) expect(c.refusal).toBeTruthy();
  });
});

describe("Daniel checks the account form", () => {
  it("accepts a form copied correctly from the City ID", () => {
    expect(checkAccountForm(good(), pocket)).toEqual([]);
    // Spacing and case in the name are forgiven; it is the same name.
    expect(fields({ ...good(), holder: "  asha   RAO " })).toEqual([]);
  });

  it("returns an empty form with every required box marked", () => {
    expect(fields(emptyForm(""))).toEqual([
      "holder",
      "address",
      "phone",
      "idDocument",
      "signature",
      "type",
    ]);
  });

  it("turns down the expired licence and the library card, saying why", () => {
    for (const id of ["driving_licence", "library_card"] as const) {
      const issues = checkAccountForm({ ...good(), idDocument: id }, pocket);
      expect(issues.map((i) => i.field)).toEqual(["idDocument"]);
      expect(issues[0].message.length).toBeGreaterThan(30);
    }
  });

  it("catches a name, an address or a phone that doesn't match", () => {
    expect(fields({ ...good(), holder: "Asha R." })).toEqual(["holder"]);
    const other = CITY_ADDRESSES.find((a) => a !== pocket.address)!;
    expect(fields({ ...good(), address: other })).toEqual(["address"]);
    expect(
      fields({ ...good(), phone: "5551234567" === pocket.phone ? "5559999999" : "5551234567" }),
    ).toEqual(["phone"]);
    expect(fields({ ...good(), phone: "555-12" })).toEqual(["phone"]);
  });

  it("asks how a nominee is related, only when there is one", () => {
    expect(fields({ ...good(), nomineeName: "Ravi Rao" })).toEqual(["nomineeRelation"]);
    expect(fields({ ...good(), nomineeName: "Ravi Rao", nomineeRelation: "brother" })).toEqual([]);
  });

  it("sends the server a tidy request", () => {
    const req = toRequest({
      ...good(),
      phone: `(${pocket.phone.slice(0, 3)}) ${pocket.phone.slice(3)}`,
      nomineeName: "Ravi",
      nomineeRelation: "brother",
    });
    expect(req.phone).toBe(pocket.phone);
    expect(req.nominee).toBe("Ravi (brother)");
    expect(req.idDocument).toBe(VALID_ID);
  });
});

describe("choosing a PIN", () => {
  it("refuses the guessable ones, as the server does", () => {
    for (const weak of ["1234", "4321", "0000", "9999", "6789", "123", "12a4"])
      expect(pinProblem(weak)).not.toBeNull();
    for (const ok of ["4071", "8352", "1357", "2024"]) expect(pinProblem(ok)).toBeNull();
  });
});
