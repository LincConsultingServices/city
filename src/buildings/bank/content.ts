// What the bank's boards and leaflets say. Plain words, general banking — no
// country's own systems — and, like everything in this building, explanation
// rather than advice (docs/PRD_Building_Bank.md §1).

export interface Rate {
  product: string;
  rate: string;
  note: string;
}

/** The rates board. Game rates — the board says so, and so does Rosa. */
export const RATES: readonly Rate[] = [
  {
    product: "Savings account",
    rate: "1% / month",
    note: "Paid every month on your balance, and it compounds. No fees, ever.",
  },
  {
    product: "Current account",
    rate: "No interest",
    note: "For businesses with many payments. No fees, no minimum balance.",
  },
  {
    product: "Fixed deposit · 3 months",
    rate: "1.5% / month",
    note: "Money is locked until the end. Take it out early and you get it all back, with interest at the savings rate.",
  },
  {
    product: "Fixed deposit · 6 months",
    rate: "2% / month",
    note: "Longer lock, higher rate.",
  },
  {
    product: "Fixed deposit · 12 months",
    rate: "2.5% / month",
    note: "The highest rate, the longest wait.",
  },
  {
    product: "Recurring deposit",
    rate: "2% / month",
    note: "Save $20–$200 every month for 6 or 12 months, straight from your account.",
  },
];

export interface Leaflet {
  title: string;
  body: readonly string[];
}

export const LEAFLETS: readonly Leaflet[] = [
  {
    title: "What is a bank?",
    body: [
      "A bank keeps people's money safe, keeps a record of every dollar that goes in and out, and lends money to people and businesses who need it.",
      "Cash in your pocket can be lost or stolen, and it never grows. Money in an account is protected, recorded, and can earn interest.",
    ],
  },
  {
    title: "Savings or current?",
    body: [
      "A savings account is for keeping and growing your own money, and it pays interest.",
      "A current account is built for businesses that pay and get paid many times a day. It usually pays no interest, but has no limit on transactions.",
    ],
  },
  {
    title: "How interest works",
    body: [
      "Interest is what a bank pays you for keeping your money with it, or what you pay the bank for borrowing.",
      "Simple interest is paid only on the money you put in. Compound interest is also paid on the interest you've already earned, so money left alone grows faster the longer it stays.",
      "Example: $100 at 10% a year becomes $110 after one year, and $121 after two. The extra $1 is interest earned on interest.",
    ],
  },
  {
    title: "Deposit and withdrawal slips",
    body: [
      "A deposit puts money into your account; a withdrawal takes it out. Each needs a slip with the date, your account number, your name, the amount in figures and in words, and your signature.",
      "Copy your account number from your passbook or card. One wrong digit can send money to the wrong account.",
    ],
  },
  {
    title: "Writing a cheque",
    body: [
      "A cheque tells your bank to pay someone from your account. Write the date, the name of the person being paid, the amount in words and in figures, and sign it.",
      "Write the figures right up against the $ sign and finish the words with \"only\", so nobody can add to them. If the words and figures don't match, the bank won't pay it.",
      'If there isn\'t enough money in the account to cover it, the cheque "bounces": the bank refuses to pay it. Only write a cheque when the money is already there.',
    ],
  },
  {
    title: "Staying safe",
    body: [
      "Never tell anyone your PIN or password, not even someone who says they're from the bank. A real bank will never ask for them.",
      "Cover the keypad at the ATM, check your passbook or statement regularly, and tell the bank straight away if you see something you don't recognise.",
    ],
  },
];
