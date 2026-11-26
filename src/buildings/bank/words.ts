// Amounts in words, the way they are written on a slip or a cheque:
// "Four hundred and twenty dollars only".
//
// Checking is forgiving about everything that does not change the amount —
// capitals, hyphens, "and", "dollars", "only", extra spaces — and strict about
// the number itself, because that is the point of writing it twice.

const ONES = [
  "zero",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "eleven",
  "twelve",
  "thirteen",
  "fourteen",
  "fifteen",
  "sixteen",
  "seventeen",
  "eighteen",
  "nineteen",
];
const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];

function underThousand(n: number): string[] {
  const out: string[] = [];
  const h = Math.floor(n / 100);
  const rest = n % 100;
  if (h > 0) out.push(ONES[h], "hundred");
  if (rest > 0) {
    if (h > 0) out.push("and");
    if (rest < 20) out.push(ONES[rest]);
    else {
      out.push(TENS[Math.floor(rest / 10)]);
      if (rest % 10) out.push(ONES[rest % 10]);
    }
  }
  return out;
}

/** The words for a whole number, e.g. 1208 → "one thousand two hundred and eight". */
export function numberToWords(n: number): string {
  if (!Number.isInteger(n) || n < 0 || n >= 1_000_000_000) return "";
  if (n === 0) return "zero";
  const parts: string[] = [];
  const millions = Math.floor(n / 1_000_000);
  const thousands = Math.floor((n % 1_000_000) / 1000);
  const rest = n % 1000;
  if (millions) parts.push(...underThousand(millions), "million");
  if (thousands) parts.push(...underThousand(thousands), "thousand");
  if (rest) {
    // "one thousand and five": the "and" before a small remainder.
    if ((millions || thousands) && rest < 100) parts.push("and");
    parts.push(...underThousand(rest));
  }
  return parts.join(" ");
}

/** How a teller would write it on the slip: "Four hundred and twenty dollars only". */
export function amountInWords(n: number): string {
  const w = numberToWords(n);
  if (!w) return "";
  return `${w[0].toUpperCase()}${w.slice(1)} ${n === 1 ? "dollar" : "dollars"} only`;
}

const IGNORED = new Set(["and", "dollar", "dollars", "only", "usd"]);

function significant(words: string): string[] {
  return words
    .toLowerCase()
    .replace(/[^a-z\s-]/g, " ")
    .replace(/-/g, " ")
    .split(/\s+/)
    .filter((w) => w && !IGNORED.has(w));
}

/** Whether `written` says the amount `n`, however it is punctuated. */
export function wordsMatch(written: string, n: number): boolean {
  const want = significant(numberToWords(n));
  const got = significant(written);
  return want.length > 0 && want.length === got.length && want.every((w, i) => w === got[i]);
}
