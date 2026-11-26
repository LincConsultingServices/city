// The account-opening form, checked the way Daniel checks it at the desk
// (docs/PRD_Building_Bank.md §7.2).
//
// Pure, so every lesson is a test. Each problem is said in the bank's voice and
// says WHY the box matters, not just that it is wrong — a returned form is the
// lesson, so it has to teach. The server holds its own line on top of this
// (it refuses anything but the valid ID, a ten-digit phone, an empty name…);
// this is the friendly check that comes first.
import type { BankAccountType } from "@/framework/api";
import type { IdCardId, Pocket } from "./pocket";

export interface AccountFormValues {
  holder: string;
  address: string;
  phone: string;
  idDocument: IdCardId | "";
  signature: string;
  nomineeName: string;
  nomineeRelation: string;
  type: BankAccountType | "";
}

export type FormField = keyof AccountFormValues;

export interface FormIssue {
  field: FormField;
  message: string;
}

export function emptyForm(name: string): AccountFormValues {
  return {
    holder: name,
    address: "",
    phone: "",
    idDocument: "",
    signature: "",
    nomineeName: "",
    nomineeRelation: "",
    type: "",
  };
}

const same = (a: string, b: string) => a.trim().toLowerCase().replace(/\s+/g, " ") === b.trim().toLowerCase().replace(/\s+/g, " ");

/** Every problem with the form, in the order the boxes appear. Empty = good to go. */
export function checkAccountForm(f: AccountFormValues, pocket: Pocket): FormIssue[] {
  const issues: FormIssue[] = [];
  const card = pocket.cards.find((c) => c.id === f.idDocument);

  if (!f.holder.trim()) {
    issues.push({ field: "holder", message: "The account needs your name on it." });
  } else if (!same(f.holder, pocket.name)) {
    issues.push({
      field: "holder",
      message: "The name has to match your ID exactly. Otherwise the bank can't be sure the account is really yours.",
    });
  }

  if (!f.address) {
    issues.push({ field: "address", message: "Fill in your address. The bank sends your statements and your card there." });
  } else if (f.address !== pocket.address) {
    issues.push({
      field: "address",
      message: "That isn't the address on your City ID. Copy it from the card, so your letters reach you.",
    });
  }

  const digits = f.phone.replace(/\D/g, "");
  if (digits.length !== 10) {
    issues.push({ field: "phone", message: "A phone number here is ten digits. Check it against your phone." });
  } else if (digits !== pocket.phone) {
    issues.push({
      field: "phone",
      message: "That isn't your number. The bank uses it to warn you about anything unusual on your account.",
    });
  }

  if (!card) {
    issues.push({ field: "idDocument", message: "Choose an ID from your pocket. Every new account needs an identity check." });
  } else if (!card.valid) {
    issues.push({ field: "idDocument", message: card.refusal ?? "That can't be used as ID." });
  }

  if (!f.signature.trim()) {
    issues.push({
      field: "signature",
      message: "Sign the form. Your signature is how the bank checks that cheques and slips really come from you.",
    });
  }

  if (f.nomineeName.trim() && !f.nomineeRelation.trim()) {
    issues.push({ field: "nomineeRelation", message: "Say how your nominee is related to you: a parent, a sibling, a friend." });
  }

  if (!f.type) {
    issues.push({ field: "type", message: "Choose a savings or a current account." });
  }

  return issues;
}

/** What goes to the server once the form is right. */
export function toRequest(f: AccountFormValues) {
  const nominee = f.nomineeName.trim()
    ? `${f.nomineeName.trim()} (${f.nomineeRelation.trim()})`
    : "";
  return {
    type: f.type as BankAccountType,
    holder: f.holder.trim(),
    address: f.address,
    phone: f.phone.replace(/\D/g, ""),
    idDocument: f.idDocument,
    signature: f.signature.trim(),
    nominee,
  };
}

/** Why a PIN would be refused — the same rules the server holds. */
export function pinProblem(pin: string): string | null {
  if (!/^\d{4}$/.test(pin)) return "A PIN is exactly four digits.";
  if (/^(\d)\1{3}$/.test(pin)) {
    return "Four of the same digit is one of the first PINs anyone would try. Choose something harder to guess.";
  }
  const d = pin.split("").map(Number);
  const up = d.every((v, i) => i === 0 || v === d[i - 1] + 1);
  const down = d.every((v, i) => i === 0 || v === d[i - 1] - 1);
  if (up || down) return "Digits in a row, like 1234, are the easiest PINs to guess. Choose something harder.";
  return null;
}
