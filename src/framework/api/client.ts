// ApiClient — the ONLY thing that touches fetch, status codes, or JSON envelopes
// (PRD §7.3, §12.2). Everyone else calls typed methods and receives parsed data or
// a thrown ApiError. Ported from the Godot F0 (autoload/api_client.gd): auth attach,
// ONE silent refresh on 401, backoff on NETWORK/5xx, Zod-validated bodies.
import { z } from "zod";
import { appConfig, CLIENT_VERSION } from "@/framework/config/appConfig";
import { ApiError, parseEnvelope } from "./errors";
import {
  RegistryModules,
  LevelResponse,
  ActivityPublic,
  SubmitResponse,
  BadgesResponse,
  ProfileResponse,
  FollowupPublic,
  FollowupCommit,
  JourneyFollowup,
  EvaluationReport,
  JourneyStageResult,
  ConsequenceResult,
  StateEnvelope,
  BuildingStateEnvelope,
  StateAck,
  BeaconToken,
  Me,
  Wallet,
  WalletTransactions,
  BankView,
  BankStatement,
  BankOpened,
  BankMove,
  BankClosed,
  BankCard,
  BankPrinted,
  BankChequeResult,
  BankChequeWritten,
  BankQuote,
  BankDepositOpened,
  BankDepositBroken,
  BankPayees,
  BankPayeeLookup,
  BankTransfer,
  ShopItems,
  ShopPurchase,
  OwnedItems,
  AvatarEquipped,
  BankLoanQuote,
  BankLoanOpened,
  BankLoanRepaid,
  SavesList,
  SaveWritten,
  SaveLoaded,
  SaveSessionStart,
  SaveStateResult,
  type WriteChequeForm,
  type OpenAccountForm,
  type SubmitRequest,
  type StateWriteResult,
} from "./schemas";

/** What the client asks the server to write about the transfer beat. */
/** What a stage close sends. `answers` for a typed stage, `units` for a scenario one. */
export interface JourneyStageBody {
  runId?: string;
  stageId: string;
  track?: string;
  answers?: { unitId: string; text: string }[];
  units?: { unitId: string; choice: string }[];
}

/**
 * What a consequence request sends: ids, a letter or the open marker, a
 * closed-enum world map, and — since ADR-008 — the player's own words.
 */
export interface ConsequenceBody {
  buildingId: string;
  stageId?: string;
  unitId: string;
  choice: string;
  speakerId?: string;
  worldState?: Record<string, string>;
  /** The typed answer on an open scene. See JourneyFollowupBody.answer. */
  answer?: string;
  /**
   * What the player said in the sitting that got them this job — the interview
   * for an Employee scene, the first review for a Branch Manager one.
   *
   * The client asked for consequences "layered on user answers in interview
   * process followed by the option they chose", and this is the first half of
   * that. It is sent from here rather than read server-side because the server
   * does not keep it: an attempt row stores scores, band and feedback and never
   * a word of what was written.
   *
   * Bounded and fenced on arrival like every other typed field, and capped at
   * five entries — the length of the interview.
   */
  background?: string[];
}

/**
 * What a career scene's generated question is asked for: ids, a letter or the
 * open marker, a closed-enum world map, and what the player wrote.
 */
export interface JourneyFollowupBody {
  stageId: string;
  unitId: string;
  choice: string;
  worldState?: Record<string, string>;
  /**
   * What the player said in the sitting that got them this posting. The client
   * asked for follow-ups written "through all of the context that the user made
   * in the previous conversations", and the scene's own chain is only the most
   * recent part of that. See ConsequenceBody.background.
   */
  background?: string[];
  /**
   * What the player typed on an open scene.
   *
   * ADR-007 §13 said this field could never exist — "typed answers go to the
   * grader only". ADR-008 reverses that one line, because a question written
   * from a chosen letter cannot follow up on reasoning somebody expressed in
   * their own words. The server bounds it, strips it and fences it before it
   * reaches a prompt; nothing on this path can move a mark.
   */
  answer?: string;
}

export interface FollowupParams {
  activityId: string;
  track: "SCA" | "SCB";
  buildingId: string;
  /** The seed choice and the follow-up choice, in that order. */
  path: [string, string];
  speakerId?: string;
  worldState?: Record<string, string>;
}

/** Supplies a Firebase ID token; injected so the client stays testable/decoupled. */
export interface TokenProvider {
  getIdToken(forceRefresh?: boolean): Promise<string | null>;
}

const MAX_RETRIES = 2;
const BASE_BACKOFF_MS = 500;
const MAX_BACKOFF_MS = 4000;

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const backoff = (attempt: number) => Math.min(BASE_BACKOFF_MS * 2 ** (attempt - 1), MAX_BACKOFF_MS);

export interface ApiClientOptions {
  onSessionLost?: (reason: string) => void;
  onRetryToast?: (message: string) => void;
}

interface PerformOpts {
  allowRefresh?: boolean;
  /**
   * Suppress the retry toast. For paths that already have their own
   * silent-failure contract — the AI follow-up (ADR-006 §7.4: "not a spinner...
   * the player is never told") and session-state writes (ADR-006 §11: "a
   * backend outage degrades... never to a lost season", handled by the mirror
   * and the next hydrate) — a "Reconnecting…" toast on retry is itself the leak
   * those sections forbid, not a helpful status update.
   */
  silent?: boolean;
  /** Lets a caller with its own deadline (the transfer beat's 4 s race) cancel
   *  an attempt already in flight instead of leaving it to keep retrying. */
  signal?: AbortSignal;
}

export class ApiClient {
  constructor(
    private readonly tokens: TokenProvider,
    private readonly opts: ApiClientOptions = {},
  ) {}

  // ── Typed backend methods (all authed) ──────────────────────────────────────

  /** F0 bootstrap: the first authed call that exists on the live backend (no /me yet). */
  getRegistryModules() {
    return this.request("GET", "/api/v1/registry/modules", RegistryModules);
  }

  getLevel(comp: string, level: string) {
    return this.request("GET", `/api/v1/registry/${comp}/${level}`, LevelResponse);
  }

  getActivity(activityId: string) {
    return this.request("GET", `/api/v1/registry/activity/${activityId}`, ActivityPublic);
  }

  startActivity(activityId: string): Promise<unknown> {
    return this.perform("POST", `/api/v1/progress/${activityId}/start`);
  }

  getState(activityId: string): Promise<unknown> {
    return this.perform("GET", `/api/v1/progress/${activityId}/state`);
  }

  putState(activityId: string, blob: unknown): Promise<unknown> {
    return this.perform("PUT", `/api/v1/progress/${activityId}/state`, blob);
  }

  /**
   * The evaluation report: per business, then across all of them.
   *
   * Recomputed server-side on every call rather than cached, so it can never
   * disagree with the evidence it came from. Not silent — unlike the generated
   * beats, a report the player asked for and did not get should say so.
   */
  getReport() {
    return this.request("GET", "/api/v1/report", EvaluationReport);
  }

  /** Trophy Hall (PRD §9.4) — the caller's earned badges. */
  getBadges() {
    return this.request("GET", "/api/v1/badges", BadgesResponse);
  }

  /** Trophy Hall progress board — per-competency P-levels. */
  getProfile() {
    return this.request("GET", "/api/v1/profile", ProfileResponse);
  }

  submit(activityId: string, body: SubmitRequest) {
    return this.request("POST", `/api/v1/progress/${activityId}/submit`, SubmitResponse, {
      ...body,
      clientVersion: body.clientVersion || CLIENT_VERSION,
    });
  }

  // ── Bootstrap and the wallet (PRD §9) ───────────────────────────────────────

  /** The first authed call. Also performs the starter grant, server-side. */
  getMe() {
    return this.request("GET", "/api/v1/me", Me);
  }

  getWallet() {
    return this.request("GET", "/api/v1/wallet", Wallet);
  }

  /** The coin ledger, newest first. */
  getWalletTransactions(limit = 25, offset = 0) {
    return this.request(
      "GET",
      `/api/v1/wallet/transactions?limit=${limit}&offset=${offset}`,
      WalletTransactions,
    );
  }

  // ── The bank (city/docs/PRD_Building_Bank.md) ──────────────────────────────

  /** The account (or null), the latest statement, cash, and the bank's terms. */
  getBank() {
    return this.request("GET", "/api/v1/bank", BankView);
  }

  getBankStatement(limit = 50, offset = 0) {
    return this.request(
      "GET",
      `/api/v1/bank/statement?limit=${limit}&offset=${offset}`,
      BankStatement,
    );
  }

  openBankAccount(form: OpenAccountForm) {
    return this.request("POST", "/api/v1/bank/account", BankOpened, form);
  }

  /** Issue the debit card, protected by the PIN the player chose. */
  issueBankCard(pin: string) {
    return this.request("POST", "/api/v1/bank/card", BankCard, { pin });
  }

  /** Check a PIN at the ATM. Three wrong in a row lock the card for a few minutes. */
  bankAtmPin(pin: string) {
    return this.request("POST", "/api/v1/bank/atm/pin", z.object({ ok: z.boolean() }), { pin });
  }

  /** Cash from the ATM: multiples of $10, up to $500, PIN checked by the server. */
  bankAtmWithdraw(pin: string, amount: number, idempotencyKey: string) {
    return this.request("POST", "/api/v1/bank/atm/withdraw", BankMove, {
      pin,
      amount,
      idempotencyKey,
    });
  }

  /** Print the passbook up to date: the lines that were not in the book yet. */
  printPassbook() {
    return this.request("POST", "/api/v1/bank/passbook/print", BankPrinted);
  }

  /** A new book of cheques. */
  issueChequeBook() {
    return this.request("POST", "/api/v1/bank/chequebook", BankOpened);
  }

  /** Pay a received cheque in. It clears after a while; the money arrives then. */
  depositCheque(id: string) {
    return this.request(
      "POST",
      `/api/v1/bank/cheques/${encodeURIComponent(id)}/deposit`,
      BankChequeResult,
    );
  }

  /** Present a cheque the player wrote. It may bounce: nothing moves, nothing is charged. */
  writeCheque(form: WriteChequeForm) {
    return this.request("POST", "/api/v1/bank/cheques/write", BankChequeWritten, form);
  }

  /** What a deposit would grow to, month by month, beside the same money in savings. */
  bankQuote(kind: "fd" | "rd", amount: number, term: number) {
    return this.request(
      "GET",
      `/api/v1/bank/quote?kind=${kind}&amount=${amount}&term=${term}`,
      BankQuote,
    );
  }

  /** Open a fixed deposit (amount = the sum) or a recurring one (amount = each month's instalment). */
  openDeposit(kind: "fd" | "rd", amount: number, termMonths: number, idempotencyKey: string) {
    return this.request("POST", "/api/v1/bank/deposits", BankDepositOpened, {
      kind,
      amount,
      termMonths,
      idempotencyKey,
    });
  }

  /** Take a deposit out early: everything back, with interest at the savings rate. */
  breakDeposit(id: string) {
    return this.request(
      "POST",
      `/api/v1/bank/deposits/${encodeURIComponent(id)}/break`,
      BankDepositBroken,
    );
  }

  /** The city's businesses, with their account numbers. */
  bankPayees() {
    return this.request("GET", "/api/v1/bank/payees", BankPayees);
  }

  /** Confirmation of payee: whose account a number is. 404 NO_SUCH_PAYEE if nobody's. */
  bankLookupPayee(accountNumber: string) {
    return this.request(
      "GET",
      `/api/v1/bank/payees/lookup?account=${encodeURIComponent(accountNumber)}`,
      BankPayeeLookup,
    );
  }

  /** Send money to a business, by account number. */
  bankTransfer(accountNumber: string, amount: number, reference: string, idempotencyKey: string) {
    return this.request("POST", "/api/v1/bank/transfer", BankTransfer, {
      accountNumber,
      amount,
      reference,
      idempotencyKey,
    });
  }

  /** Pay salaries into the account (on) or into your pocket (off). */
  bankSalaryToAccount(on: boolean) {
    return this.request("POST", "/api/v1/bank/salary", BankOpened, { on });
  }

  /** The shop's catalogue, marked owned / affordable / locked for this player. */
  shopItems() {
    return this.request("GET", "/api/v1/shop/items", ShopItems);
  }

  /** The shop items the player owns. */
  getInventory() {
    return this.request("GET", "/api/v1/inventory", OwnedItems);
  }

  /** What is equipped, slot → item id. */
  getAvatar() {
    return this.request("GET", "/api/v1/avatar", AvatarEquipped);
  }

  equipItem(itemId: string) {
    return this.request("PUT", "/api/v1/avatar/equip", AvatarEquipped, { itemId });
  }

  unequipSlot(slot: string) {
    return this.request("PUT", "/api/v1/avatar/unequip", AvatarEquipped, { slot });
  }

  /** Buy an item, with cash or by debit card (the card needs its PIN). */
  shopPurchase(itemId: string, method: "cash" | "card", pin?: string) {
    return this.request("POST", "/api/v1/shop/purchase", ShopPurchase, { itemId, method, pin });
  }

  /** What a loan would cost this player, at their own rate, paid on time. */
  loanQuote(amount: number, term: number) {
    return this.request(
      "GET",
      `/api/v1/bank/loans/quote?amount=${amount}&term=${term}`,
      BankLoanQuote,
    );
  }

  /** Borrow: the money lands in the account; instalments come out each bank month. */
  openLoan(amount: number, termMonths: number, purpose: string, idempotencyKey: string) {
    return this.request("POST", "/api/v1/bank/loans", BankLoanOpened, {
      amount,
      termMonths,
      purpose,
      idempotencyKey,
    });
  }

  /** Pay some of the loan early (amount > 0) or all of it (0). No penalty. */
  repayLoan(amount: number, idempotencyKey: string) {
    return this.request("POST", "/api/v1/bank/loans/repay", BankLoanRepaid, {
      amount,
      idempotencyKey,
    });
  }

  // ── Save games ─────────────────────────────────────────────────────────────

  /** First call when the game opens: with autosave off, an unsaved last session is lost. */
  startGameSession() {
    return this.request("POST", "/api/v1/game/session", SaveSessionStart);
  }

  /** The six slots, the autosave slot, and the autosave setting. */
  listSaves() {
    return this.request("GET", "/api/v1/saves", SavesList);
  }

  /** Save the whole game into a slot ("1"–"6", or "auto"), overwriting it. */
  saveGame(slot: string, name: string, story: string, extra: string) {
    return this.request("PUT", `/api/v1/saves/${encodeURIComponent(slot)}`, SaveWritten, {
      name,
      story,
      extra,
    });
  }

  renameSave(slot: string, name: string) {
    return this.request("PATCH", `/api/v1/saves/${encodeURIComponent(slot)}`, SaveWritten, {
      name,
    });
  }

  deleteSave(slot: string) {
    return this.perform("DELETE", `/api/v1/saves/${encodeURIComponent(slot)}`);
  }

  /** Put the whole game back as it was in a slot. */
  loadGame(slot: string) {
    return this.request("POST", `/api/v1/saves/${encodeURIComponent(slot)}/load`, SaveLoaded);
  }

  /** A brand-new game: money, badges, bank, progress all cleared. Saves are kept. */
  restartGameOnServer() {
    return this.perform("POST", "/api/v1/game/restart");
  }

  setAutosave(on: boolean, story: string, extra: string) {
    return this.request("POST", "/api/v1/saves/autosave", SaveStateResult, { on, story, extra });
  }

  /** Close the account; the whole balance comes back as cash. Safe with no account. */
  closeBankAccount() {
    return this.request("DELETE", "/api/v1/bank/account", BankClosed);
  }

  /**
   * Cash into the account. `idempotencyKey` identifies this one deposit: send
   * the same key again (a retry, a double click) and nothing moves twice.
   */
  bankDeposit(amount: number, idempotencyKey: string, channel: "counter" | "atm" = "counter") {
    return this.request("POST", "/api/v1/bank/deposit", BankMove, {
      amount,
      idempotencyKey,
      channel,
    });
  }

  bankWithdraw(amount: number, idempotencyKey: string, channel: "counter" | "atm" = "counter") {
    return this.request("POST", "/api/v1/bank/withdraw", BankMove, {
      amount,
      idempotencyKey,
      channel,
    });
  }

  // ── The generated transfer beat (ADR-006 §7.3) ──────────────────────────────

  /**
   * Ask for the third beat. Fired the instant the second one commits, so it
   * generates while that consequence is still being read.
   *
   * The server never 5xxs this: no key, model error, deadline, gate failure and
   * rate limit all resolve to an authored beat. A failure here is therefore a
   * network or auth failure, and the caller falls through to its local bank.
   */
  aiFollowup(params: FollowupParams, signal?: AbortSignal) {
    // Silent, and cancellable: ADR-006 §7.4 forbids a spinner or any other tell
    // during this wait, and the caller (transfer.ts) races it against its own
    // 4 s deadline, so a losing attempt needs to actually stop rather than keep
    // retrying in the background after the bank has already answered.
    return this.request("POST", "/api/v1/ai/followup", FollowupPublic, params, {
      silent: true,
      signal,
    });
  }

  /**
   * Commit a choice and receive its consequence.
   *
   * The consequences are not shipped with the options on purpose — three
   * consequences in the payload are three hints at which option is which.
   */
  commitFollowup(followupId: string, optionId: string) {
    return this.request(
      "POST",
      `/api/v1/ai/followup/${followupId}/commit`,
      FollowupCommit,
      { optionId },
      { silent: true },
    );
  }

  /**
   * Answer an open question — one that shipped with no options because the
   * player was asked to write.
   *
   * Same endpoint as the commit above, because it settles the same row and has
   * to be the same kind of idempotent: a repeat after a dropped connection is
   * the first answer standing, not a second answer. It returns nothing to read.
   */
  answerFollowup(followupId: string, answer: string) {
    return this.request(
      "POST",
      `/api/v1/ai/followup/${followupId}/commit`,
      FollowupCommit,
      { answer },
      { silent: true },
    );
  }

  // ── The career journey (ADR-007) ────────────────────────────────────────────

  /**
   * Close one journey stage: grade a typed sitting, append the attempt, and
   * reveal the revenue that stage moved.
   *
   * Not silent. Unlike a generated beat, a stage close is a commitment the
   * player made — losing one loses an interview they sat — so a failure here
   * should surface and be retried rather than degrade quietly.
   */
  journeyStage(buildingId: string, body: JourneyStageBody) {
    return this.request(
      "POST",
      `/api/v1/city/buildings/${buildingId}/journey/stage`,
      JourneyStageResult,
      body,
    );
  }

  /**
   * Ask what happened after an L1 or L2 choice.
   *
   * Silent and cancellable, exactly like `aiFollowup`: the caller races it
   * against its own deadline and falls through to the authored line, and there
   * must be no spinner or other tell that this beat is the generated one.
   *
   * This body CAN now carry free text, on `answer`, and that is a deliberate
   * reversal rather than a slip. ADR-007 §13 kept the typed interview and the
   * generator apart by giving this struct no field an answer could travel in;
   * ADR-008 retires that, because an open scene's consequence has to follow from
   * what the player actually wrote. What replaces the absence is enforcement:
   * the server bounds and fences the text before it reaches a prompt, every
   * generated line still clears the output gates, and grading stays a separate
   * call so nothing here can move a mark.
   */
  aiConsequence(body: ConsequenceBody, signal?: AbortSignal) {
    return this.request("POST", "/api/v1/ai/consequence", ConsequenceResult, body, {
      silent: true,
      signal,
    });
  }

  /**
   * Ask for the next generated question on a career scene.
   *
   * Silent and cancellable like `aiFollowup`, for the same reason: the room has
   * already put the authored consequence on screen, so a question that misses
   * its deadline costs nothing but itself. A `done` response — for ANY reason —
   * simply moves the player on.
   */
  journeyFollowup(buildingId: string, body: JourneyFollowupBody, signal?: AbortSignal) {
    return this.request(
      "POST",
      `/api/v1/city/buildings/${buildingId}/journey/followup`,
      JourneyFollowup,
      body,
      { silent: true, signal },
    );
  }

  // ── Session state (ADR-006 §11) ─────────────────────────────────────────────

  /** City-wide: the track, FTUE flags, where they were standing. */
  getCityState() {
    return this.request("GET", "/api/v1/city/state", StateEnvelope, undefined, { silent: true });
  }

  putCityState(rev: number, blob: unknown) {
    return this.writeState("/api/v1/city/state", { rev, blob });
  }

  /** The season: mission, objective, world, the pending transfer question. */
  getBuildingState(buildingId: string) {
    return this.request(
      "GET",
      `/api/v1/city/buildings/${buildingId}/state`,
      BuildingStateEnvelope,
      undefined,
      { silent: true },
    );
  }

  putBuildingState(buildingId: string, rev: number, blob: unknown, track?: "SCA" | "SCB") {
    return this.writeState(`/api/v1/city/buildings/${buildingId}/state`, { rev, blob, track });
  }

  /**
   * Mint the short-lived token the exit flush uses.
   *
   * `sendBeacon` cannot attach an Authorization header, so the beacon route
   * authorises on a write-only, single-building token in the body instead.
   */
  getBeaconToken(buildingId: string) {
    return this.request(
      "GET",
      `/api/v1/city/beacon-token?buildingId=${encodeURIComponent(buildingId)}`,
      BeaconToken,
      undefined,
      { silent: true },
    );
  }

  /**
   * A state write either lands or loses a race.
   *
   * A 409 is not an error anybody should see: it carries the server's current
   * document so the caller can resolve in one round trip, which is what makes
   * two tabs in the same building survivable. It is returned, not thrown.
   */
  private async writeState(path: string, body: unknown): Promise<StateWriteResult> {
    // Silent: a session write's failure story is already the mirror-and-next-
    // hydrate one (ADR-006 §11), not a toast.
    const { status, body: raw } = await this.performAllowing([409], "PUT", path, body, {
      silent: true,
    });
    if (status === 409) {
      const conflict = raw as { rev?: number; blob?: unknown; updatedAt?: string } | null;
      return {
        ok: false,
        rev: conflict?.rev ?? 0,
        blob: conflict?.blob ?? null,
        updatedAt: conflict?.updatedAt ?? "",
      };
    }
    const ack = StateAck.safeParse(raw);
    if (!ack.success) throw new ApiError("BAD_RESPONSE", "Unexpected response from the server.");
    return { ok: true, rev: ack.data.rev, updatedAt: ack.data.updatedAt };
  }

  // ── Schema-validated request ────────────────────────────────────────────────

  private async request<S extends z.ZodTypeAny>(
    method: string,
    path: string,
    schema: S,
    body?: unknown,
    opts?: Pick<PerformOpts, "silent" | "signal">,
  ): Promise<z.output<S>> {
    const raw = await this.perform(method, path, body, opts);
    const parsed = schema.safeParse(raw);
    if (parsed.success) return parsed.data;
    throw new ApiError("BAD_RESPONSE", "Unexpected response from the server.");
  }

  /**
   * `perform`, but treating some non-2xx statuses as answers rather than errors.
   *
   * Exists for the one case where a status carries a payload the caller needs:
   * a 409 from the state endpoints returns the server's current document, and
   * throwing it away would cost a second round trip to get it back.
   */
  private async performAllowing(
    allowed: number[],
    method: string,
    path: string,
    body?: unknown,
    opts?: Pick<PerformOpts, "silent" | "signal">,
  ): Promise<{ status: number; body: unknown }> {
    try {
      return { status: 200, body: await this.perform(method, path, body, opts) };
    } catch (e) {
      if (e instanceof ApiError && allowed.includes(e.httpStatus)) {
        return { status: e.httpStatus, body: e.body };
      }
      throw e;
    }
  }

  // ── Core request with auth + retry/refresh policy (returns raw JSON body) ────

  private async perform(
    method: string,
    path: string,
    body?: unknown,
    opts: PerformOpts = {},
  ): Promise<unknown> {
    const { allowRefresh = true, silent = false, signal } = opts;
    const url = appConfig.apiBaseUrl + path;
    let attempt = 0;

    for (;;) {
      let res: Response;
      try {
        const token = await this.tokens.getIdToken();
        res = await fetch(url, {
          method,
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: body === undefined ? undefined : JSON.stringify(body),
          signal,
        });
      } catch (e) {
        // An intentional cancellation (the transfer beat's deadline losing the
        // race) is not a connectivity failure — retrying it would spend the
        // budget re-fetching something nobody is waiting on any more.
        if (e instanceof DOMException && e.name === "AbortError") throw e;
        if (attempt < MAX_RETRIES) {
          attempt += 1;
          if (!silent) this.opts.onRetryToast?.("Reconnecting…");
          await sleep(backoff(attempt));
          continue;
        }
        throw new ApiError("NETWORK", "Network request failed. Check your connection.");
      }

      const parsedBody = await this.readJson(res);
      if (res.ok) return parsedBody;

      const err = parseEnvelope(res.status, parsedBody);

      // 401 → one silent Firebase refresh, then retry once.
      if (err.code === "INVALID_TOKEN" && allowRefresh) {
        const fresh = await this.tokens.getIdToken(true).catch(() => null);
        if (fresh) return this.perform(method, path, body, { ...opts, allowRefresh: false });
        this.opts.onSessionLost?.("token_expired");
        throw err;
      }

      // Transient server errors back off and retry (submits are idempotent).
      if (err.code === "SERVER_ERROR" && attempt < MAX_RETRIES) {
        attempt += 1;
        if (!silent) this.opts.onRetryToast?.("Reconnecting…");
        await sleep(backoff(attempt));
        continue;
      }

      throw err;
    }
  }

  private async readJson(res: Response): Promise<unknown> {
    const text = await res.text();
    if (!text) return null;
    try {
      return JSON.parse(text);
    } catch {
      return { error: text };
    }
  }
}
