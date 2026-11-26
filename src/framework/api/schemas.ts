// Zod schemas for the backend wire contract (PRD §8.2, §11). Every response is
// parsed through one of these, so a shape drift is a runtime error at the boundary
// (and, via z.infer, a compile error in callers). Types are inferred from schemas
// — schemas are the single source of truth.
import { z } from "zod";

// ── Result kinds (submit payload — exactly ONE, discriminated by its key) ──────

export const ObjectiveResult = z.object({
  answers: z.array(z.object({ itemId: z.string(), choice: z.string() })),
});
export const OrderResult = z.object({ sequence: z.array(z.string()) });
// DECISION_TREE. `path` is the visited node path. The two followup fields are
// optional and carry the generated third beat: without them the submit scores on
// the authored terminal alone, which is what keeps every degraded path working.
export const TraceResult = z.object({
  path: z.array(z.string()),
  followupId: z.string().optional(),
  followupChoice: z.string().optional(),
});
export const MetricsResult = z.object({
  values: z.record(z.unknown()),
  decisionLog: z.array(z.unknown()).optional(),
});
export const SlotsResult = z.object({ picks: z.record(z.array(z.string())) });
export const TextResult = z.object({ content: z.string() });
export const TranscriptResult = z.object({
  turns: z.array(z.object({ role: z.enum(["user", "ai"]), text: z.string() })),
});

// One competency's evidence from a career journey (ADR-007 §8.2).
//
// Unit ids and the letter taken at each — never a tier and never a score, for
// the same reason TraceResult carries no tier. A two-beat CEO scene sends its
// composed path as the choice: "a.c". Typed questions are named, not scored; the
// server reads their marks from the attempt it wrote.
export const JourneyResult = z.object({
  buildingId: z.string(),
  runId: z.string(),
  units: z.array(z.object({ unitId: z.string(), choice: z.string() })),
  qa: z.array(z.object({ unitId: z.string() })).optional(),
});

// The submit "result" is an object carrying exactly one kind.
export const ResultPayload = z.union([
  z.object({ objective: ObjectiveResult }),
  z.object({ order: OrderResult }),
  z.object({ trace: TraceResult }),
  z.object({ metrics: MetricsResult }),
  z.object({ slots: SlotsResult }),
  z.object({ text: TextResult }),
  z.object({ transcript: TranscriptResult }),
  z.object({ journey: JourneyResult }),
]);
export type ResultPayload = z.infer<typeof ResultPayload>;
export type ResultKind =
  "objective" | "order" | "trace" | "metrics" | "slots" | "text" | "transcript" | "journey";

export const SubmitRequest = z.object({
  clientVersion: z.string(),
  durationSec: z.number().int().nonnegative(),
  hintsUsed: z.number().int().nonnegative(),
  result: ResultPayload,
});
export type SubmitRequest = z.infer<typeof SubmitRequest>;

// ── Badges / modules / activities ─────────────────────────────────────────────

export const Badge = z.object({
  id: z.string(),
  kind: z.string().optional(),
  competencyCode: z.string().optional(),
  level: z.string().optional(),
  tier: z.string().optional(),
  name: z.string(),
  description: z.string().optional(),
  iconAsset: z.string().optional(),
});
export type Badge = z.infer<typeof Badge>;

export const ModuleLevel = z.object({
  ageBand: z.string().optional(),
  total: z.number().int(),
  completed: z.number().int(),
});
export const Module = z.object({
  code: z.string(),
  name: z.string(),
  kidName: z.string().optional(),
  subtopics: z.array(z.string()).optional().default([]),
  levels: z.record(ModuleLevel),
  badgesEarned: z.array(Badge).optional().default([]),
});
export type Module = z.infer<typeof Module>;

export const RegistryModules = z.object({
  registryVersion: z.string(),
  modules: z.array(Module),
  metaBadges: z.array(Badge).optional().default([]),
});
export type RegistryModules = z.infer<typeof RegistryModules>;

// passCriteria is server-defined and opaque to the client.
export const ActivityPublic = z.object({
  id: z.string(),
  competencyCode: z.string(),
  level: z.string(),
  subtopic: z.string().optional(),
  orderIndex: z.number().int().optional(),
  activityType: z.string(),
  title: z.string(),
  estMinutes: z.number().int().optional(),
  passCriteria: z.unknown().optional(),
});
export type ActivityPublic = z.infer<typeof ActivityPublic>;

// GET /registry/{comp}/{level} — activity list with per-activity status.
export const LevelActivity = ActivityPublic.extend({
  status: z.string().default("NOT_STARTED"),
  bestProficiency: z.number().int().nullable().optional(),
});
export type LevelActivity = z.infer<typeof LevelActivity>;

export const LevelResponse = z.object({
  competency: z.string(),
  level: z.string(),
  activities: z.array(LevelActivity),
});
export type LevelResponse = z.infer<typeof LevelResponse>;

// ── Submit response ───────────────────────────────────────────────────────────

export const SubmitResponse = z.object({
  activityId: z.string().optional(),
  proficiency: z.number().int(),
  bestProficiency: z.number().int(),
  passed: z.boolean(),
  status: z.string(),
  feedback: z.string().optional().default(""),
  graded: z.enum(["server", "ai", "fallback"]).optional(),
  badgesAwarded: z.array(Badge).optional().default([]),
  // Economy fields — additive backend work (PRD §11.3 / §21 BE-1); optional today.
  coinsEarned: z.number().int().optional(),
  coinBalance: z.number().int().optional(),
});
export type SubmitResponse = z.infer<typeof SubmitResponse>;

// ── Trophy Hall (PRD §9.4) — both endpoints are LIVE on the backend ───────────

// GET /api/v1/badges → { badges: [ ...Badge, awardedAt ] }
export const EarnedBadge = Badge.extend({ awardedAt: z.string().optional().default("") });
export type EarnedBadge = z.infer<typeof EarnedBadge>;

export const BadgesResponse = z.object({ badges: z.array(EarnedBadge) });
export type BadgesResponse = z.infer<typeof BadgesResponse>;

// GET /api/v1/profile → { competencies: [...] }. category is "" when no data yet.
export const CompetencyProfile = z.object({
  code: z.string(),
  name: z.string(),
  completed: z.number().int(),
  totalSeeded: z.number().int(),
  avgProficiency: z.number(),
  category: z.string().optional().default(""),
});
export type CompetencyProfile = z.infer<typeof CompetencyProfile>;

export const ProfileResponse = z.object({ competencies: z.array(CompetencyProfile) });
export type ProfileResponse = z.infer<typeof ProfileResponse>;

// ── The generated transfer beat (ADR-006 §7.3) ────────────────────────────────

/** One choice on screen. Opaque id, text, and nothing else — by construction. */
export const FollowupOption = z.object({ id: z.string(), text: z.string() });

/**
 * What the server will say about a generated beat.
 *
 * No tier, no consequence, no rationale, and deliberately no flag saying whether
 * this was written by a model or served from the authored bank. A client that
 * knew could tell the player, and a player who could tell would know this beat
 * is the one that behaves differently.
 */
export const FollowupPublic = z.object({
  followupId: z.string(),
  speaker: z.object({ id: z.string(), name: z.string(), role: z.string() }),
  prompt: z.string(),
  /**
   * Three options, or none.
   *
   * None is an OPEN question: the Café asks the player to write, so the
   * questions generated from their writing are written back (ADR-008 §1). Two
   * lengths and no others — a question with one or two options is a generation
   * that half-reverted to multiple choice, and shipping it would show a menu
   * with an option missing.
   */
  options: z
    .array(FollowupOption)
    .refine((o) => o.length === 0 || o.length === 3, "want three options or none"),
});
export type FollowupPublic = z.infer<typeof FollowupPublic>;

/**
 * Answering a beat. Committing a CHOICE releases its consequence (ADR-006
 * §7.3); answering an OPEN question releases nothing, because nothing was
 * withheld — there was no option, so there is no consequence being kept back
 * until one is picked. The empty response is the honest one, and the room moves
 * to the next question rather than to something to read.
 */
export const FollowupCommit = z.object({
  consequence: z.string().optional(),
  world: z.record(z.string()).optional().default({}),
});
export type FollowupCommit = z.infer<typeof FollowupCommit>;

// ── The career journey (ADR-007) ──────────────────────────────────────────────

/**
 * What a stage close returns.
 *
 * No tier and no proficiency. `band` is a non-tier label by contract — the
 * report owns the words Developing, Strong and Advanced, and spending them at a
 * gate would teach the vocabulary a stage early. The 1–5 marks are raw scores a
 * learner may see; they never become a proficiency.
 *
 * `revenue` arrives here and nowhere else. A per-decision delta would be a
 * directional readout of the tier, and a continuous one, so the smallest thing
 * that can safely be shown is the total over a stage's four decisions.
 */
export const JourneyStageResult = z.object({
  runId: z.string(),
  stageId: z.string(),
  attemptNo: z.number().int().optional(),
  bestAttemptNo: z.number().int().optional(),
  rawScore: z.number().int().optional(),
  questionScores: z
    .array(z.object({ unitId: z.string(), score: z.number().int() }))
    .optional()
    .default([]),
  band: z.string().optional().default(""),
  feedback: z.string().optional().default(""),
  graded: z.string().optional().default(""),
  revenue: z.number().int(),
  revenueDelta: z.number().int(),
  roleReached: z.string(),
  coinsBanked: z.number().int().optional().default(0),
  /** The career's pay — on the exit only, once the run is settled. */
  salary: z
    .object({
      total: z.number().int(),
      lines: z
        .array(
          z.object({
            unitId: z.string(),
            stageId: z.string(),
            base: z.number().int(),
            category: z.enum(["best", "normal", "worst"]),
            percent: z.number().int(),
            amount: z.number().int(),
          }),
        )
        .default([]),
      handedOver: z.boolean(),
      credited: z.boolean(),
      balance: z.number().int(),
    })
    .nullable()
    .optional(),
});
export type JourneyStageResult = z.infer<typeof JourneyStageResult>;

/**
 * What happened after a choice, and the world write it earns.
 *
 * Deliberately the same shape as FollowupCommit and deliberately carrying no
 * flag for whether it was written or served from the bank — a client that knew
 * could tell the player, and a player who could tell would treat those beats
 * differently.
 */
/**
 * The next generated question on a career scene, or word that the scene is done
 * asking (ADR-007 §16, extended to L1/L2).
 *
 * `done: true` is deliberately ambiguous. It is what a finished scene returns,
 * and equally what an unreachable model, a spent budget, and a draft that could
 * not clear its gates return. There is no bank behind these, so "no question" IS
 * the fallback — and a client that could tell the difference could tell the
 * player, who would then know which scenes were worth answering carefully.
 */
export const JourneyFollowup = z.object({
  done: z.boolean(),
  question: FollowupPublic.optional(),
});
export type JourneyFollowup = z.infer<typeof JourneyFollowup>;

export const ConsequenceResult = z.object({
  consequence: z.string(),
  world: z.record(z.string()).optional().default({}),
});
export type ConsequenceResult = z.infer<typeof ConsequenceResult>;

// ── The evaluation report (ADR-007 §15) ───────────────────────────────────────

/**
 * One competency's whole story, and the series the graph plots.
 *
 * `baseline` and `latest` are the two numbers the brief asked for by name —
 * where they started and where they are now — and `series` is every scored
 * moment in between, in order. All 0..1.
 *
 * `class` is the DETERMINISTIC reading: natural (arrived with it), emerging
 * (learning it here), developing (neither yet), insufficient (too little
 * evidence to say). The model's own view arrives separately in the strength
 * lists, and the two are allowed to disagree.
 */
export const CompetencyTrack = z.object({
  code: z.string(),
  name: z.string(),
  samples: z.number(),
  baseline: z.number(),
  latest: z.number(),
  mean: z.number(),
  slope: z.number(),
  series: z.array(z.number()),
  class: z.enum(["natural", "emerging", "developing", "insufficient"]),
});
export type CompetencyTrack = z.infer<typeof CompetencyTrack>;

export const Judgement = z.object({
  competency: z.string(),
  name: z.string(),
  why: z.string(),
});
export type Judgement = z.infer<typeof Judgement>;

export const BuildingReport = z.object({
  buildingId: z.string(),
  track: z.string().optional(),
  status: z.string(),
  roleReached: z.string(),
  revenue: z.number(),
  startedAt: z.string(),
  endedAt: z.string().optional(),
  stages: z.array(
    z.object({
      stageId: z.string(),
      attemptNo: z.number(),
      rawScore: z.number(),
      band: z.string(),
      createdAt: z.string(),
    }),
  ),
  competencies: z.array(CompetencyTrack),
  naturalStrengths: z.array(Judgement),
  emergingSkills: z.array(Judgement),
  summary: z.string(),
  // "ai" or "computed". Operational honesty — never rendered to the learner,
  // because which one wrote it says nothing about them.
  judged: z.string(),
});
export type BuildingReport = z.infer<typeof BuildingReport>;

export const EvaluationReport = z.object({
  generatedAt: z.string(),
  buildings: z.array(BuildingReport),
  cumulative: z.array(CompetencyTrack),
  revenueBadge: z
    .object({ buildingId: z.string(), revenue: z.number(), label: z.string() })
    .optional(),
  /** True when nothing has been played yet — distinct from a report of zeroes. */
  empty: z.boolean(),
});
export type EvaluationReport = z.infer<typeof EvaluationReport>;

// ── Session state (ADR-006 §11) ───────────────────────────────────────────────

/** `rev` is 0 and `blob` null when nothing has been written yet — not a 404. */
export const StateEnvelope = z.object({
  rev: z.number().int(),
  blob: z.unknown().nullable(),
  updatedAt: z.string().optional().default(""),
});
export type StateEnvelope = z.infer<typeof StateEnvelope>;

export const BuildingStateEnvelope = StateEnvelope.extend({
  buildingId: z.string().optional().default(""),
  track: z.enum(["SCA", "SCB"]).optional(),
});
export type BuildingStateEnvelope = z.infer<typeof BuildingStateEnvelope>;

export const StateAck = z.object({
  rev: z.number().int(),
  updatedAt: z.string().optional().default(""),
});
export type StateAck = z.infer<typeof StateAck>;

export const BeaconToken = z.object({
  beaconToken: z.string(),
  expiresAt: z.string().optional().default(""),
});
export type BeaconToken = z.infer<typeof BeaconToken>;

/**
 * A write either lands or loses a race. A 409 is not an error to show anybody —
 * it carries the server's current document so the caller can resolve in one
 * round trip (two tabs in the same building is the case it exists for).
 */
export type StateWriteResult =
  | { ok: true; rev: number; updatedAt: string }
  | { ok: false; rev: number; blob: unknown; updatedAt: string };

// ── The wallet (PRD §9) ───────────────────────────────────────────────────────

export const Wallet = z.object({
  coins: z.number().int(),
  lifetimeCoins: z.number().int().optional(),
});
export type Wallet = z.infer<typeof Wallet>;

/**
 * One line of the coin ledger. `reason` is a machine code (ACTIVITY_COMPLETE,
 * BADGE_AWARD, SHOP_PURCHASE, STARTER_GRANT); the Bank renders it in the city's
 * own words. Nothing here is a proficiency — the ledger is the most tempting
 * place in the product to leak the answer key and it must not.
 */
export const CoinTransaction = z.object({
  id: z.string().optional().default(""),
  amount: z.number().int(),
  reason: z.string().optional().default(""),
  refType: z.string().optional().default(""),
  refId: z.string().optional().default(""),
  balanceAfter: z.number().int().optional(),
  createdAt: z.string().optional().default(""),
});
export type CoinTransaction = z.infer<typeof CoinTransaction>;

export const WalletTransactions = z.object({
  transactions: z.array(CoinTransaction).optional().default([]),
});
export type WalletTransactions = z.infer<typeof WalletTransactions>;

// ── The bank (city/docs/PRD_Building_Bank.md) ────────────────────────────────

export const BankAccountType = z.enum(["savings", "current"]);
export type BankAccountType = z.infer<typeof BankAccountType>;

export const BankAccount = z.object({
  accountNumber: z.string(),
  type: BankAccountType,
  holder: z.string(),
  /** The specimen signature from the opening form; slips are checked against it. */
  signature: z.string().optional().default(""),
  balance: z.number().int(),
  openedAt: z.string(),
  /** When the passbook was last printed up to; later lines are not in the book yet. */
  printedThrough: z.string().optional(),
  monthsSettled: z.number().int().optional().default(0),
  /** The debit card, once issued: never the full number, never the PIN. */
  cardLast4: z.string().optional(),
  cardExpiry: z.string().optional(),
  /** The loan being repaid, if any. */
  activeLoan: z.string().optional(),
  /** Salaries are paid straight into the account rather than into your pocket. */
  salaryToAccount: z.boolean().optional().default(false),
  /** Cheques left in the book (0 = no book yet, or used up). */
  chequeLeaves: z.number().int().optional().default(0),
  nextCheque: z.number().int().optional(),
});
export type BankAccount = z.infer<typeof BankAccount>;

/** One passbook line. `amount` is positive for money in, negative for money out. */
export const StatementLine = z.object({
  id: z.string(),
  kind: z.string(), // open | deposit | withdrawal | interest | close
  channel: z.string().optional().default("bank"),
  amount: z.number().int(),
  balanceAfter: z.number().int(),
  note: z.string().optional().default(""),
  at: z.string(),
  month: z.number().int().optional(),
});
export type StatementLine = z.infer<typeof StatementLine>;

/** An account type's terms. The bank never charges anything, so interest is all there is. */
export const BankProduct = z.object({
  interestBp: z.number().int(),
});
export type BankProduct = z.infer<typeof BankProduct>;

/** A cheque, received or written. */
export const Cheque = z.object({
  id: z.string(),
  direction: z.enum(["in", "out"]),
  number: z.string(),
  from: z.string(),
  to: z.string(),
  amount: z.number().int(),
  words: z.string().optional().default(""),
  date: z.string(),
  crossed: z.boolean().optional().default(false),
  memo: z.string().optional(),
  status: z.string(), // held | clearing | cleared | cashed | bounced
  clearsAt: z.string().optional(),
  createdAt: z.string(),
});
export type Cheque = z.infer<typeof Cheque>;

/** A fixed ("fd") or recurring ("rd") deposit. */
export const TermDeposit = z.object({
  id: z.string(),
  kind: z.enum(["fd", "rd"]),
  principal: z.number().int().optional().default(0),
  monthly: z.number().int().optional().default(0),
  termMonths: z.number().int(),
  rateBp: z.number().int(),
  openedAt: z.string(),
  maturesAt: z.string(),
  monthsDone: z.number().int().optional().default(0),
  paid: z.number().int(),
  instalments: z.number().int().optional().default(0),
  skipped: z.number().int().optional().default(0),
  value: z.number().int(),
  savingsValue: z.number().int(),
  status: z.enum(["active", "matured", "broken"]),
  payout: z.number().int().optional(),
  closedAt: z.string().optional(),
});
export type TermDeposit = z.infer<typeof TermDeposit>;

export const QuoteMonth = z.object({
  month: z.number().int(),
  paid: z.number().int(),
  deposit: z.number().int(),
  savings: z.number().int(),
});
export type QuoteMonth = z.infer<typeof QuoteMonth>;
export const BankQuote = z.object({ months: z.array(QuoteMonth) });

export const Loan = z.object({
  id: z.string(),
  purpose: z.string().optional().default(""),
  principal: z.number().int(),
  termMonths: z.number().int(),
  rateBp: z.number().int(),
  instalment: z.number().int(),
  outstanding: z.number().int(),
  openedAt: z.string(),
  monthsDone: z.number().int().optional().default(0),
  paid: z.number().int().optional().default(0),
  interestPaid: z.number().int().optional().default(0),
  onTime: z.number().int().optional().default(0),
  missed: z.number().int().optional().default(0),
  status: z.enum(["active", "repaid"]),
  closedAt: z.string().optional(),
});
export type Loan = z.infer<typeof Loan>;

export const CreditBand = z.object({
  name: z.string(),
  min: z.number().int(),
  limit: z.number().int(),
  rateBp: z.number().int(),
});

/** The credit score, the reasons for it, and what it means at the loans desk. */
export const Credit = z.object({
  score: z.number().int(),
  band: CreditBand,
  factors: z.array(z.object({ label: z.string(), points: z.number().int() })),
  eligible: z.boolean(),
  reason: z.string().optional(),
  limit: z.number().int(),
  rateBp: z.number().int(),
});
export type Credit = z.infer<typeof Credit>;

export const LoanMonth = z.object({
  month: z.number().int(),
  interest: z.number().int(),
  payment: z.number().int(),
  outstanding: z.number().int(),
  missed: z.boolean().optional().default(false),
});
export const LoanQuote = z.object({
  principal: z.number().int(),
  termMonths: z.number().int(),
  rateBp: z.number().int(),
  instalment: z.number().int(),
  totalRepaid: z.number().int(),
  totalInterest: z.number().int(),
  schedule: z.array(LoanMonth),
});
export type LoanQuote = z.infer<typeof LoanQuote>;

export const BankView = z.object({
  account: BankAccount.nullable(),
  statement: z.array(StatementLine).optional().default([]),
  cheques: z.array(Cheque).optional().default([]),
  deposits: z.array(TermDeposit).optional().default([]),
  loans: z.array(Loan).optional().default([]),
  credit: Credit.optional(),
  cash: z.number().int(),
  rules: z.object({
    monthHours: z.number(),
    products: z.record(z.string(), BankProduct),
    nextMonthAt: z.string().optional(),
  }),
});
export type BankView = z.infer<typeof BankView>;

export const BankStatement = z.object({ statement: z.array(StatementLine).optional().default([]) });

export const BankOpened = z.object({ account: BankAccount });

export const BankMove = z.object({
  line: StatementLine,
  balance: z.number().int(),
  cash: z.number().int(),
  repeat: z.boolean().optional().default(false),
});
export type BankMove = z.infer<typeof BankMove>;

export const BankCard = z.object({ card: z.object({ last4: z.string(), expiry: z.string() }) });

export const BankPrinted = z.object({
  lines: z.array(StatementLine).optional().default([]),
  balance: z.number().int(),
});
export type BankPrinted = z.infer<typeof BankPrinted>;

export const BankChequeResult = z.object({ cheque: Cheque });

export const BankChequeWritten = z.object({
  cheque: Cheque,
  bounced: z.boolean(),
  balance: z.number().int(),
  cash: z.number().int(),
});
export type BankChequeWritten = z.infer<typeof BankChequeWritten>;

export interface WriteChequeForm {
  /** "self" (cashed at the counter) or a business's id from the directory. */
  payee: string;
  amount: number;
  words: string;
  date: string;
  signature: string;
  crossed: boolean;
  idempotencyKey: string;
}

export const BankDepositOpened = z.object({ deposit: TermDeposit });
export const BankDepositBroken = z.object({
  deposit: TermDeposit,
  payout: z.number().int(),
  balance: z.number().int(),
});

/** A business in the city that can be paid by transfer or by cheque. */
export const Payee = z.object({
  id: z.string(),
  name: z.string(),
  accountNumber: z.string(),
  kind: z.string(),
  about: z.string().optional().default(""),
});
export type Payee = z.infer<typeof Payee>;
export const BankPayees = z.object({ payees: z.array(Payee) });
export const BankPayeeLookup = z.object({ payee: Payee });

export const BankTransfer = z.object({
  line: StatementLine,
  payee: Payee,
  balance: z.number().int(),
  repeat: z.boolean().optional().default(false),
});
export type BankTransfer = z.infer<typeof BankTransfer>;

// ── The shop's till ──────────────────────────────────────────────────────────

export const ShopItemView = z.object({
  id: z.string(),
  category: z.string(),
  name: z.string(),
  description: z.string().optional().default(""),
  priceCoins: z.number().int(),
  rarity: z.string().optional().default(""),
  owned: z.boolean(),
  affordable: z.boolean(),
  locked: z.boolean(),
});
export type ShopItemView = z.infer<typeof ShopItemView>;
export const ShopItems = z.object({ items: z.array(ShopItemView) });

/** A shop item the player owns. */
export const OwnedItem = z.object({
  id: z.string(),
  category: z.string(),
  slot: z.string().optional().default(""),
  name: z.string(),
  description: z.string().optional().default(""),
  priceCoins: z.number().int(),
  rarity: z.string().optional().default(""),
  source: z.string().optional().default(""),
  acquiredAt: z.string().optional().default(""),
});
export type OwnedItem = z.infer<typeof OwnedItem>;
export const OwnedItems = z.object({ items: z.array(OwnedItem) });
export const AvatarEquipped = z.object({
  equipped: z.record(z.string(), z.string()).nullable().optional(),
});

export const ShopPurchase = z.object({
  newBalance: z.number().int(),
  alreadyOwned: z.boolean(),
  paidBy: z.string().optional().default("cash"),
  bankBalance: z.number().int().optional(),
});
export type ShopPurchase = z.infer<typeof ShopPurchase>;

export const BankLoanQuote = z.object({ quote: LoanQuote });
export const BankLoanOpened = z.object({ loan: Loan });
export const BankLoanRepaid = z.object({
  loan: Loan,
  paid: z.number().int(),
  balance: z.number().int(),
});

// ── Save games ───────────────────────────────────────────────────────────────

/** One save slot. An empty slot has no name and no savedAt. */
export const SaveSlot = z.object({
  slot: z.string(), // "auto", "1" … "6"
  name: z.string().optional().default(""),
  story: z.string().optional().default(""),
  savedAt: z.string().optional(),
  cash: z.number().int().optional().default(0),
  bank: z.number().int().optional(),
  badges: z.number().int().optional().default(0),
});
export type SaveSlot = z.infer<typeof SaveSlot>;

export const SaveState = z.object({
  autosave: z.boolean(),
  dirty: z.boolean().optional().default(false),
  anchored: z.boolean().optional().default(false),
  anchorName: z.string().optional(),
  anchorAt: z.string().optional(),
});
export type SaveState = z.infer<typeof SaveState>;

export const SavesList = z.object({ slots: z.array(SaveSlot), state: SaveState });
export const SaveWritten = z.object({ slot: SaveSlot.nullable() });
export const SaveLoaded = z.object({ slot: SaveSlot, extra: z.string().optional().default("") });
export const SaveSessionStart = z.object({
  reverted: z.boolean(),
  state: SaveState,
  extra: z.string().optional().default(""),
});
export const SaveStateResult = z.object({ state: SaveState });

export const BankClosed = z.object({ returned: z.number().int(), cash: z.number().int() });

export interface OpenAccountForm {
  type: BankAccountType;
  holder: string;
  signature: string;
  address?: string;
  phone?: string;
  idDocument?: string;
  nominee?: string;
}

// ── Bootstrap (GET /me) ───────────────────────────────────────────────────────

// The first authed call: identity, wallet, avatar. It also performs the starter
// grant, which is why the HUD can show a real balance from the first second.
export const Me = z.object({
  user: z
    .object({
      id: z.string().optional().default(""),
      displayName: z.string().optional().default(""),
      email: z.string().optional().default(""),
      role: z.string().optional().default("player"),
    })
    .optional(),
  wallet: Wallet.optional(),
  avatar: z.record(z.string()).optional().default({}),
  badgesEarned: z.number().int().optional().default(0),
});
export type Me = z.infer<typeof Me>;
