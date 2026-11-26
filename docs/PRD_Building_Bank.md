# PRD — THE BANK · your first bank account

_The City · Building 02 · Downtown · **v1.0 (Part 1)** · 2026-11-16 · **Status: Design, ready for review** · City venue id: `bank`_
_Replaces [PRD_Building_MERIDIAN.md](PRD_Building_MERIDIAN.md) (the "run the bank" design), which is shelved. Inherits the interior pattern from [ADR-005](ADR-005_Interior_Framework.md) and the stage graph from [ADR-007](ADR-007_The_Career_Journey.md)._

---

## 1. TL;DR

The player leaves the café with a salary in their pocket and nowhere safe to keep it. They walk into **Meridian Bank** as a customer, open their first account, deposit their pay, learn to read and write cheques, and decide how to grow what they have saved.

The bank is the city's **money-skills** building. The café taught the player how to run a business. The bank teaches them how money itself works: accounts, deposits, cheques and interest.

**Three rules shape everything here:**

1. **The money is real (in the game).**
   - Depositing moves dollars out of the player's pocket into their account.
   - A fixed deposit really pays interest when it matures.
   - A bounced cheque is really refused.
   - The server works out every number, the same way the wallet works today.
2. **The bank explains; it never advises.** Characters explain how each option works and what it costs. The player chooses. No line in this building says "you should put your money in…".
3. **The bank never charges the player.** No account fees, no minimum balance, no penalties, no bounce fees. It only ever pays interest. Money leaves an account only when the player takes it out or spends it.

The game uses **dollars ($)** and **general banking ideas found in most countries**. There are no country-specific systems: no UPI, no IFSC, no routing numbers.

---

## 2. Scope

### Part 1 (this document)

| #   | Stage                                                            | Stage id       |
| --- | ---------------------------------------------------------------- | -------------- |
| 1   | Welcome desk                                                     | `bank.welcome` |
| 2   | Open an account                                                  | `bank.account` |
| 3   | First deposit (and withdrawing at the counter)                   | `bank.deposit` |
| 4   | Cheques                                                          | `bank.cheques` |
| 5   | Grow your money: savings, fixed deposit, recurring deposit       | `bank.savings` |
| 6   | Part 1 review: two short questions, graded like the café reviews | `bank.review1` |
| 7   | Part 1 complete                                                  | `bank.part1`   |

### Part 2 (later, its own document)

- ATM and PIN.
- Cards and transfers: debit vs credit card, bank transfer, automatic monthly payments.
- Loans: interest, monthly instalments, collateral, credit score, good vs bad debt.
- Fraud safety.
- Manager's review and the bank badge.

Part 2 stages slot in between `bank.savings` and the final review. Part 1 is playable on its own.

### Out of scope

- Real financial advice of any kind.
- Real interest rates. Every rate in the game is a **game rate**, and the bank says so once at the welcome desk.
- Country-specific products, laws or tax.

---

## 3. When the bank opens

- The bank venue is on Downtown already (`world/cityMap.ts`, kind `bank`).
- **Before the café journey is finished:**
  - The door is locked.
  - The sign reads _"Opening soon. Earn your first salary at the café, then come and open an account."_
  - The existing ledger view (`ui/BankPanel.tsx`) stays reachable from the HUD, so players can still see their balance.
- **The bank unlocks** when the player's café run reaches `cafe.exit` with a salary paid. The server decides this, not the client.
- **Players who walked out of the café at a gate** (no salary) can still open an account with whatever cash they hold. Nobody is locked out of the bank for losing a job.

---

## 4. The money model

### 4.1 Cash and bank balance

Today the player has one number: the wallet. Part 1 splits it in two:

|                  | What it is                                                                                        | Where it lives                       |
| ---------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------ |
| **Cash**         | Money in the player's pocket. This is the existing wallet, unchanged, so nothing needs migrating. | `users/{uid}/meta/wallet` (as today) |
| **Bank balance** | Money in their account.                                                                           | `users/{uid}/meta/bank` (new)        |

- **The HUD** shows **Cash** always, and **Bank** once an account exists.
- **The shop** takes cash only in Part 1. Card payments arrive in Part 2.
- **Salaries and rewards** still arrive as cash. Later, a salary can be paid "straight into your account" once Part 2 adds automatic payments.

Every move between cash and bank happens in **one Firestore transaction** with an idempotency key, the same pattern as `WalletService.Earn`/`Spend`. A double click can never move money twice.

### 4.2 Bank time

Interest needs time to pass. The city has no calendar, so the bank keeps its own:

- **1 bank month = 1 real day** (24 hours). The server setting `BANK_MONTH_HOURS` defaults to 24. Tests and local play can set it to a few minutes.
- Nothing runs on a timer. Whenever the player's account is read or changed, the server first **settles** every full bank month since it last looked: interest, recurring-deposit instalments and maturities, in date order. So a player who comes back after a week sees seven months of history, all correct.

### 4.3 Game rates

These are deliberately generous so the player can see the effect within days. The welcome desk says so plainly (§7.1).

| Product                    | Rate                                                                                | Paid                                                         | Other rules                                                                                                                                                                            |
| -------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Savings account**        | 1% per bank month                                                                   | At the end of each bank month, on the balance at that moment | No minimum balance, no fees                                                                                                                                                            |
| **Current account**        | No interest                                                                         | —                                                            | No minimum balance, no fees. Made for businesses with many payments: bigger cheque book, no limit on transactions                                                                      |
| **Fixed deposit (FD)**     | 3 months: 1.5%/month. 6 months: 2%/month. 12 months: 2.5%/month. Compounded monthly | All at once, at maturity, into the bank balance              | Minimum $100. **Breaking early** pays only the savings rate (1%) for the full months held                                                                                              |
| **Recurring deposit (RD)** | 2% per bank month, compounded                                                       | At maturity                                                  | $20–$200 a month, for 6 or 12 months. Each month's instalment is taken from the bank balance. If the balance is short, that month is **skipped** (no charge) and the payout is smaller |

All amounts are whole dollars, and interest is **rounded down**. A small balance earns nothing ($40 × 1% = $0.40, which rounds down to $0). That is a lesson in itself, and the savings desk mentions it.

### 4.4 What the server stores (new Firestore paths)

| Path                         | What                                                                                                                                                                                            |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `users/{uid}/meta/bank`      | `accountNumber`, `type` (savings/current), `openedAt`, `balance`, `settledAt` (end of the last settled bank month), `chequeLeavesLeft`, `form` (the account form as submitted)                  |
| `users/{uid}/statement/{id}` | One line per balance change: `at`, `kind` (deposit, withdrawal, interest, fd_open, fd_mature, rd_instalment, cheque_in, cheque_bounce…), `amount`, `balanceAfter`, `note`. Id = idempotency key |
| `users/{uid}/deposits/{id}`  | One fixed or recurring deposit: `kind` (fd/rd), `principal` or `monthly`, `termMonths`, `rate`, `openedAt`, `status` (active/matured/broken), `instalmentsPaid`, `missed`, `payout`             |
| `users/{uid}/cheques/{id}`   | Cheques the player has received or written: `from`, `to`, `amount`, `status` (pending/cleared/bounced/void)                                                                                     |

- **The account number** is 10 digits, generated once, and unique per player. It is fictional and has no check digit tied to any real system.
- **Firestore rules** stay deny-all for clients. Everything goes through the backend, as today.

### 4.5 Endpoints (all authenticated, under `/api/v1/bank`)

| Method | Path                    | Does                                                                                                                                 |
| ------ | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| GET    | `/bank`                 | Settles, then returns the account, deposits, the last 50 statement lines, and cash                                                   |
| GET    | `/bank/quote`           | `?amount&product&term`: what an amount becomes. The same formula the payouts use, so the calculator can't disagree with real results |
| POST   | `/bank/account`         | Opens the account from a checked form (§7.2). Fails if one exists                                                                    |
| POST   | `/bank/account/type`    | Switches savings ↔ current. Free once; after that not allowed in Part 1                                                              |
| POST   | `/bank/deposit`         | `{amount, slip, idemKey}`: cash → bank. The slip is checked (§7.3)                                                                   |
| POST   | `/bank/withdraw`        | `{amount, slip, idemKey}`: bank → cash. Fails below $0                                                                               |
| POST   | `/bank/cheques/deposit` | Deposits a cheque the player received; validates it and clears or bounces it                                                         |
| POST   | `/bank/fd`              | `{amount, termMonths, idemKey}`: bank → new FD                                                                                       |
| POST   | `/bank/fd/{id}/break`   | Breaks an FD early (§4.3)                                                                                                            |
| POST   | `/bank/rd`              | `{monthly, termMonths, idemKey}`: starts an RD                                                                                       |

Journey progress (which stage the player is on, attempts and the review) reuses the existing journey endpoints with `buildingId: "bank"`. No new progress system is needed.

---

## 5. The room

A 2.5D isometric interior in the café's idiom: one source of layout truth, hosts standing beside their station, no dead-end stations. One level.

```
 ┌──────────────────────────────────────────────────────────┐
 │  [Manager's cabin]        [Loan desk]      [ATM alcove]   │  ← Part 2: roped off,
 │   (closed)                 (closed)         (closed)      │    "Opening soon" cards
 │                                                          │
 │  [Savings & deposits]   [Teller 1]  [Teller 2]           │
 │   Farah                   Mei        (cheques) Mei        │
 │                                                          │
 │  [Account desk]          waiting seats ▢▢▢▢               │
 │   Daniel                                                 │
 │                                                          │
 │  [Welcome desk] Rosa      [ticket machine]               │
 │              ═══ DOORS ═══                               │
 └──────────────────────────────────────────────────────────┘
```

- **The queue-ticket display** above the tellers shows the player's ticket number when it's their turn. This replaces "talk to X next" prompts with something every bank has.
- **Leaflet stands** by each desk. Clicking one opens that station's short explainer, so a player can re-read any lesson later without replaying.
- **The passbook** sits in the player's inventory once the account exists. Opening it shows the statement (§7.6) and a **"What I've learned"** page, which gains an entry for every lesson finished.

---

## 6. The cast

All new. Names are deliberately from many places, because the city is nowhere in particular.

| Who                                 | Station               | Voice                                                                                                                         |
| ----------------------------------- | --------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| **Rosa Calder**, welcome desk       | Doors, ticket machine | Bright and quick, and she knows every desk. Gets you to the right place, never lectures                                       |
| **Daniel Osei**, accounts officer   | Account desk          | Patient and precise. Reads forms carefully and explains _why_ each box exists                                                 |
| **Mei Lin**, teller                 | Tellers 1 & 2         | Fast, friendly, counts out loud. Catches mistakes and says so kindly, once                                                    |
| **Farah Siddiqui**, savings officer | Savings & deposits    | Calm and fond of a good example. Shows the numbers both ways and lets you choose. **Never** says which option is best for you |
| **Marcus Ofori**, the café regular  | Appears in stage 4    | Familiar from the café. Pays the player back with a cheque                                                                    |

---

## 7. The stages

Each stage works the same way:

1. **Do it:** fill a form, count notes, write a cheque or make a choice.
2. **See what happens:** the money moves; a mistake is caught and explained.
3. **Quick check:** 2–3 multiple-choice questions, each with a one-line explanation after answering.

**Feedback rules (different from the café, on purpose):**

- **Form mistakes are shown right away.** Filling a slip correctly is a skill, not a judgement call, and hiding a wrong account number would teach nothing. The player fixes it and moves on. Mistakes are recorded but never cost money, except where noted.
- **Quick-check answers are shown** with their explanation.
- **Choices** (savings vs current, FD vs RD vs keep it) are **not graded right or wrong**. There is no single right answer. Each choice simply plays out with real money.

**Level A vs Level B** (the city-wide track, `framework/city/track.ts`):

|                       | Level A                                  | Level B                                   |
| --------------------- | ---------------------------------------- | ----------------------------------------- |
| Forms                 | Fewer fields; helper text under each box | All fields; helper text on request        |
| Maths                 | The slip adds up the notes for you       | You add them; the teller checks           |
| Cheque errors to spot | 3, one error each                        | 4, one cheque with two errors             |
| Savings calculator    | Shows the result                         | Asks you to estimate first, then shows it |

### 7.1 Stage 1: Welcome desk (`bank.welcome`)

**Goal:** the player knows what a bank is for and where everything is.

**Flow:**

1. The player walks in and Rosa greets them.
2. **Do it:** the player takes a ticket from the machine (one click).
3. Rosa gives a 30-second tour; the camera pans to each desk as she names it.
4. The quick check follows.

**Lines (Rosa):**

- _"Welcome to Meridian! First time? Then you'll want Daniel at the account desk. Grab a ticket and I'll show you round while you wait."_
- _"Daniel opens accounts. Mei at the windows takes money in and pays it out, and handles cheques. Farah helps your savings grow. The desks at the back open later."_
- _"Why bother with a bank? Cash in your pocket can be lost or stolen, and it never grows. Money in an account is kept safe, it's recorded, and it can earn interest."_
- _"One thing before you go: the interest rates in this city are game rates, much faster than a real bank's, so you can see how it works in days instead of years. The ideas are real; the numbers are for play."_

**Quick check:**

| Question                                                          | Options (✓ correct)                                                                                                  | Explanation shown                                                             |
| ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Which is a reason to keep money in a bank instead of your pocket? | ✓ It's kept safe and recorded · It doubles every week · You never need to count it again                             | A bank keeps your money safe and keeps a record of every change.              |
| What does "interest" mean on a savings account?                   | ✓ Money the bank pays you for keeping your money there · Money you pay to open an account · The bank's opening hours | Interest is the bank paying you for using your money while it sits with them. |

### 7.2 Stage 2: Open an account (`bank.account`)

**Goal:** the player opens an account and understands each part of it.

**Flow:**

1. Ticket called. Daniel hands over the account form.
2. **Do it:** the player fills the form.
3. Daniel checks it and returns any mistakes.
4. The player chooses an account type.
5. The account opens. The player receives the passbook, an account number and a cheque book.
6. The quick check follows.

**The form:**

| Field        | How it's filled                                                                                           | Checked by the server                   | Lesson when wrong                                                                                                                                        |
| ------------ | --------------------------------------------------------------------------------------------------------- | --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Full name    | Pre-filled from the character; editable                                                                   | Must match the name on the chosen ID    | "The name on your account has to match your ID exactly, or the bank can't be sure it's you."                                                             |
| Address      | Pick from city addresses (Market Street, Harbour Row…)                                                    | Must match the address on the chosen ID | Same idea                                                                                                                                                |
| Phone number | Typed; the format is shown                                                                                | 10 digits                               | "The bank uses this to reach you. It'll never ask for your password on it."                                                                              |
| ID document  | Pick one of **three ID cards** in the player's pocket: one valid, **one expired**, and one a library card | Must be the valid one                   | "Banks must check who you are before opening an account. That's called an **identity check**. An expired ID, or a card that isn't an ID, can't be used." |
| Photo        | Taken automatically from the character's portrait                                                         | —                                       | —                                                                                                                                                        |
| Signature    | Typed in a handwriting font, or drawn                                                                     | Not empty                               | "Your signature is how the bank checks cheques and slips are really from you. Sign the same way every time."                                             |
| Nominee      | Name + relationship (free text)                                                                           | Not empty (Level B); optional (Level A) | "A nominee is who receives the money if something happens to you. It's optional in many places, but sensible."                                           |
| Account type | Savings or Current (cards with Daniel's explanation)                                                      | —                                       | Not graded (§7)                                                                                                                                          |

**Daniel on account types:**

- **Savings:** _"For keeping and growing your own money. It pays interest, 1% a month here, and it compounds."_
- **Current:** _"For businesses that pay and get paid all day. No interest, a bigger cheque book, no limit on transactions."_

Whatever is chosen plays out:

- A player who picks current earns no interest, and sees that on their statement next to what savings would have paid.
- The type can be switched free **once**.

**On opening, Daniel says:**

- _"Here's your passbook: every dollar in and out is recorded in it. Your account number is on the first page. You'll need it for every slip, so keep it handy."_
- _"And a cheque book: ten cheques. Mei will show you how they work."_

**Quick check:**

| Question                                                           | Options                                                                                               | Explanation                                                                              |
| ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Why did the bank ask for your ID?                                  | ✓ To check you are who you say you are · To decide your interest rate · To choose your account number | The identity check stops anyone opening an account in someone else's name.               |
| Which account suits keeping your own savings and earning interest? | ✓ Savings · Current · Neither                                                                         | Savings accounts pay interest; current accounts are made for frequent business payments. |
| Which account pays you interest every month?                       | ✓ Savings · Current · Neither                                                                         | Savings pays interest, and the interest itself earns interest the next month.            |

### 7.3 Stage 3: First deposit (`bank.deposit`)

**Goal:** the player deposits money correctly and can take it out again.

**Flow:**

1. Ticket called; Mei's window.
2. Mei asks how much the player wants to deposit. The player chooses: any amount from $1 up to their cash.
3. **Do it:** the player fills the deposit slip.
4. Mei checks it.
5. The money moves from cash to bank, and a passbook entry animates in.
6. **Do it, part two:** the player withdraws a small amount with a withdrawal slip (minimum $10). Taking money out is half of having an account. They may then deposit it back, or keep it as cash for the shop.
7. The quick check follows.

**Deposit slip:**

| Field                                                                | Checked                                                                               | Lesson when wrong                                                                                               |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Date                                                                 | Today's game date (shown on the wall clock)                                           | "Slips are dated so the record is right."                                                                       |
| Account number                                                       | Must match the passbook. **The most common mistake**, so the slip doesn't pre-fill it | "One wrong digit and your money goes to someone else's account, or nowhere. Always copy it from your passbook." |
| Name                                                                 | Matches the account                                                                   | —                                                                                                               |
| **Notes table:** $100 × ☐, $50 × ☐, $20 × ☐, $10 × ☐, $5 × ☐, $1 × ☐ | Adds up to the amount (Level A: auto-total; Level B: the player writes the total)     | "The teller counts your notes against the slip. If the numbers don't match, the deposit can't go through."      |
| Amount in words                                                      | Matches the figures (e.g. "Four hundred and twenty dollars only")                     | "Words are harder to change than numbers. That's why slips and cheques ask for both."                           |
| Signature                                                            | Matches the account's                                                                 | —                                                                                                               |

The **withdrawal slip** is the same minus the notes table.

**Mei's lines:**

- _"Deposit means putting money in; withdrawal means taking it out. Both need a slip, and both show up in your passbook."_
- Taking a lot out: _"Of course. Just remember: what's in your pocket doesn't earn interest."_

**Quick check:**

| Question                                                                                      | Options                                                                                            | Explanation                                                                             |
| --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Where should you copy your account number from?                                               | ✓ Your passbook or bank card · From memory · From the last slip someone left on the counter        | Copy it from something the bank gave you. A wrong digit sends money to the wrong place. |
| Why do slips ask for the amount in words and in figures?                                      | ✓ So the amount is harder to change or misread · Because the bank likes paperwork · For decoration | Writing it both ways protects you from mistakes and tampering.                          |
| Your passbook shows a deposit of $420 and "balance after: $520". What was the balance before? | ✓ $100 · $420 · $940                                                                               | Balance after = balance before + deposit. $520 − $420 = $100.                           |

### 7.4 Stage 4: Cheques (`bank.cheques`)

**Goal:** the player can write a cheque, spot a bad one, and knows what bouncing means.

**Flow:**

1. **Receive.** Marcus from the café walks in: _"I still owe you for the pastries you covered back in your café days. Here, a cheque for $150. Don't spend it all on espresso."_
   - **Do it:** the player deposits Marcus's cheque at Mei's window (deposit slip, cheque version: no notes table, a cheque-number box instead).
   - Mei: _"Cheques take a little while to **clear**: the bank checks the money is really in Marcus's account before it lands in yours."_ A short time skip ("two days later…") follows.
   - It clears: **+$150** to the bank balance. Real money.
2. **Write.** Mei: _"Now you write one. I'll mark it **VOID**, it's just for practice, and it shows you every box."_ The player writes a cheque to "Harbour Row Hardware" for an amount Mei names (Level A: $45; Level B: $1,208, to test the words).
3. **Spot the errors.** Mei slides over three (Level B: four) cheques that came in today. For each one, the player marks what's wrong or accepts it. One is correct, to stop players flagging everything.
4. **Bounce.** Daniel waves the player over: one of the cheques had no money behind it. A short explanation follows. This isn't the player's own money; it shows how it works.
5. The quick check follows.

**The cheque:**

```
┌────────────────────────────────────────────────────────────┐
│ MERIDIAN BANK                            Date: __/__/____  │
│ Pay: _______________________________________  or bearer    │
│ Dollars: ___________________________________________ only  │
│                                               $ [________] │
│ A/c no. ##########                                         │
│                                       __________________   │
│ Cheque no. 000001                     Signature            │
└────────────────────────────────────────────────────────────┘
```

| Box                                        | Rule                                                                                                                                                 | Lesson                                                                                                       |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Date                                       | Today. Not in the future (a **post-dated** cheque can't be paid yet), not too old (most banks refuse cheques older than about six months: **stale**) | —                                                                                                            |
| Pay                                        | Who gets the money; the name exactly                                                                                                                 | —                                                                                                            |
| "or bearer"                                | Crossing it out means only the named person can cash it                                                                                              | "Cross out 'or bearer' so only the named person can cash it. If it's lost, a stranger can't use it."         |
| Two lines across the corner (**crossing**) | Optional; the player can draw it                                                                                                                     | "A crossed cheque can only be paid into a bank account, never handed over as cash. Safer for large amounts." |
| Dollars (words)                            | Matches the box; ends in "only"                                                                                                                      | "'Only' stops anyone squeezing extra words on the end."                                                      |
| $ box                                      | Figures, written right up against the $                                                                                                              | "No gap after the $, so nobody can add a digit in front."                                                    |
| Signature                                  | Same as on the account                                                                                                                               | —                                                                                                            |

**Error cheques** (one error each unless noted):

| Cheque      | What's wrong                                                         |
| ----------- | -------------------------------------------------------------------- |
| A           | Words say "Two hundred dollars", figures say $250: **mismatch**      |
| B           | Not signed                                                           |
| C           | Dated eight months ago: **stale**                                    |
| D           | Correct: accept it                                                   |
| E (Level B) | Post-dated next month **and** "or bearer" left in for a large amount |

**Bounced cheque (Daniel):**
_"When someone writes a cheque without enough money in their account to cover it, it **bounces**: the bank refuses to pay it, and the person who was meant to be paid isn't. Write a cheque only when the money is already there."_

- **Real consequence, later:** if the player's own cheque bounces, the payment simply doesn't happen. The bank never charges a fee.

**Quick check:**

| Question                                                           | Options                                                                                 | Explanation                                                         |
| ------------------------------------------------------------------ | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| The words say "fifty dollars", the figures say $500. What happens? | ✓ The bank won't pay it as written · The bank pays $500 · The bank pays $550            | Words and figures must match, or the cheque is refused.             |
| Why cross out "or bearer"?                                         | ✓ So only the named person can cash it · To make it clear faster · It's just decoration | Without "or bearer", whoever holds a lost cheque can't cash it.     |
| A cheque "bounces". What does that mean?                           | ✓ There wasn't enough money to pay it · It was paid twice · It was lost in the post     | A bounced cheque is refused for lack of funds, so nobody gets paid. |

### 7.5 Stage 5: Grow your money (`bank.savings`)

**Goal:** the player understands interest, compound interest, and the trade-off between earning more and keeping money available. They decide what to do with their own money.

**Flow:**

1. Ticket called; Farah's desk.
2. Farah explains **simple vs compound interest** with a quick visual: two stacks of coins over 12 months; the compound stack grows slightly faster each month.
3. **The calculator** (Level B: estimate first, then reveal):
   - Enter any amount; see what it becomes over 3, 6 or 12 bank months in savings, an FD and an RD, side by side, with a growth chart.
   - Every number comes from the server's own formula (`GET /bank/quote`), so the calculator and real payouts can never disagree.
4. **Do it: the real choice.** With their own bank balance, the player can:
   - **Open a fixed deposit:** choose amount ($100 minimum) and term (3/6/12).
   - **Start a recurring deposit:** choose monthly amount ($20–$200) and term (6/12).
   - **Do both.**
   - **Keep it all in savings.** This is a valid choice.

   Farah lays out each option's trade-off, then asks _"What would you like to do?"_ She never recommends.

5. The quick check follows.

**Farah's lines:**

- _"Simple interest is paid only on what you put in. **Compound** interest is paid on what you put in **and** on the interest you've already earned. That's why money left alone grows faster the longer it stays."_
- _"A **fixed deposit** locks money away for a set time at a higher rate. Take it out early and you lose most of the extra. You only get the savings rate."_
- _"A **recurring deposit** is a habit: the same amount every month, taken from your account automatically. If your balance is short one month, that month is skipped and the payout is a little smaller."_
- _"Whatever you lock away, you can't spend at the shop until it's back. Some people keep a bit aside for emergencies first. How much is up to you."_
- Small balances: _"On $40, 1% is 40 cents, and the bank rounds down. Interest needs something to work on."_

**Quick check:**

| Question                                                           | Options                                                                                  | Explanation                                                                |
| ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| $100 earns 10% compound interest a year. After two years you have… | ✓ $121 · $120 · $110                                                                     | Year 1: $110. Year 2: 10% of $110 = $11, so $121. Interest earns interest. |
| What do you usually give up for a fixed deposit's higher rate?     | ✓ Being able to use the money until it matures · Your account number · Nothing           | The higher rate is the reward for locking money away.                      |
| A recurring deposit is best described as…                          | ✓ Saving a fixed amount every month · One big deposit locked away · A loan from the bank | An RD builds a saving habit, month by month.                               |

**What happens afterwards (no stage needed):**

- As real days pass, the passbook fills with interest lines, RD instalments and, at the end, the maturity payout.
- A toast appears when something matures: _"Your fixed deposit matured: $1,000 became $1,160."_
- **Breaking an FD early** is available at Farah's desk any time. She shows the exact amount the player would get versus waiting, before they confirm.

### 7.6 The passbook (always available once the account is open)

- **Statement:** date, what it was, money in, money out, balance after. Interest lines in gold.
- **Deposits:** each FD/RD with progress ("Month 4 of 6"), expected payout, and a Break button for FDs.
- **What I've learned:** one entry per lesson (Identity check, Deposit slip, Amount in words, Clearing, Crossed cheque, Bounced cheque, Compound interest, Fixed deposit, Recurring deposit…). Each opens the explainer card from its leaflet stand.

### 7.7 Stage 6: Part 1 review (`bank.review1`)

Reuses the café's typed-answer stage (`StageQA`): AI-graded against a rubric, with a fallback line when the grader is unreachable. Daniel asks two questions:

1. _"A friend wants to keep their savings in a current account because 'it's all the same'. What would you explain to them?"_
   - **Evaluates:** savings vs current; interest.
2. _"You've got $1,000 and you might need $300 of it next month. How would you think about where to put it?"_
   - **Evaluates:** liquidity vs return; FD lock-in; keeping money available.
   - Graded on **reasoning**, not on a "correct" product.

Bands use friendly labels ("Getting there", "Solid", "Sharp"), never Developing/Strong/Advanced, matching the café rule. **No money depends on the review.**

### 7.8 Stage 7: Part 1 complete (`bank.part1`)

Daniel: _"That's the basics. Your account's open, your money's working, and you know a good cheque from a bad one. The back desks open soon: cards, loans and how to stay safe from scams."_

- **Badge:** **First Account**, added to the existing badge content.
- **Summary card:**
  - Bank balance.
  - Deposits running.
  - Interest earned so far.
  - Lessons learned (count).

---

## 8. Competencies

The bank's lessons are mostly literacy, but they still feed the city's competency record, through the review (§7.7) and the quick checks:

| Competency                            | Where                                            |
| ------------------------------------- | ------------------------------------------------ |
| **C4 Financial Discipline** (primary) | Every stage: compound interest, FD/RD, review Q2 |
| **C1 Problem Sensing**                | Spotting cheque errors; the account-number check |
| **C3 Courage to Commit**              | The savings choice, recorded but not graded (§7) |

---

## 9. What gets built

### Backend (`academy-backend`)

1. `internal/store/paths.go`: `Bank`, `StatementColl`, `Statement`, `DepositsColl`, `Deposit`, `ChequesColl`, `Cheque`.
2. `internal/models/bank.go`: `BankAccount`, `StatementLine`, `TermDeposit`, `Cheque`.
3. `internal/bank/`: pure functions with no database, so they're easy to test:
   - `settle(account, deposits, now)`: interest, RD instalments and maturities, month by month.
   - `quote(amount, product, term)`: one formula, shared by the calculator and payouts.
   - Form, slip and cheque checks, returning a list of field errors with lesson ids.
4. `internal/services/bank_service.go`: each endpoint in one transaction; settles first; idempotency keys as in `WalletService`.
5. `internal/handlers/bank_handler.go` plus routes in `cmd/server/main.go` (`GET /bank/quote` included).
6. `internal/registry/content/journeys/bank.json`: the stage graph above. A new stage kind, **`task`**, for form and choice stages, completed by the bank endpoints rather than by grading.
7. Unlock check: the café run reached `cafe.exit` with salary credited. Exposed in `/me` as `bankUnlocked`.
8. Badge `first_account` in `badges.json`.

### Frontend (`city`)

1. `src/buildings/bank/`: interior (room, cast, stations, scene), following `buildings/cafe` and `buildings/fashion_brand`.
2. Form pieces in `src/buildings/bank/forms/`: `AccountForm`, `Slip` (deposit/withdraw/cheque modes), `Cheque` (write + inspect modes), `SavingsCalculator`, `QuickCheck`.
3. `Passbook` (statement, deposits, what I've learned): replaces the money part of today's `ui/BankPanel.tsx`.
4. HUD: Cash + Bank. The shop says "Cash" on its balance.
5. Locked-door state on the city venue until `bankUnlocked`.
6. API client and schemas for the new endpoints.

### Tests

- **`internal/bank`:** table tests for:
  - interest on round and tiny balances;
  - no balance ever going down without the player taking money out;
  - FD maturity on each term;
  - early break;
  - RD missed instalment;
  - a week-long gap settled correctly;
  - settlement is idempotent (settling twice changes nothing).
- **Service tests** on the memory store:
  - a double-submitted deposit moves money once;
  - deposit > cash fails;
  - withdraw > balance fails;
  - concurrent deposit and withdrawal don't lose updates.
- **Frontend:**
  - form checks show the right lesson;
  - the slip notes table adds up;
  - the cheque inspector accepts the clean cheque and rejects each error type;
  - the passbook renders interest lines;
  - the bank door is locked before the café is finished.

---

## 10. Acceptance criteria (Part 1)

1. A player who has finished the café can enter the bank. One who hasn't sees the locked door and the sign.
2. Opening an account needs a valid form. Each wrong field shows its lesson. The account is created once only.
3. Depositing moves exactly the slip's amount from cash to bank. A retried request does not move it twice.
4. Marcus's $150 cheque clears into the bank balance exactly once per player.
5. Bank time settles correctly after any gap, and settling twice changes nothing.
6. FD and RD payouts match the calculator's quote for the same inputs.
7. No line in the building tells the player what they personally should do with their money (review every NPC line against §1 rule 2).
8. Leaving mid-stage and coming back resumes at the same stage, as the café does.
9. Restarting the game (Options → Restart) closes the account and clears statements, deposits and cheques, along with everything else.

---

## 11. Open decisions

| #   | Question                                                                                                                                                               | Default if nobody says otherwise                                           |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| 1   | Is 1 bank month = 1 real day right? Faster (an hour) feels rewarding but turns the FD into a slot machine; slower is more realistic but players may never see a payout | **1 day**                                                                  |
| 2   | Should salaries from later buildings be paid straight into the account once it's open?                                                                                 | **No in Part 1**: still cash. Part 2's automatic payments make it optional |
| 3   | Can the shop take payment from the bank balance?                                                                                                                       | **No in Part 1**: cash only. Debit card in Part 2                          |
| 4   | Allow closing the account?                                                                                                                                             | **No** in Part 1                                                           |
