// ApiClient — the ONLY thing that touches fetch, status codes, or JSON envelopes
// (PRD §7.3, §12.2). Everyone else calls typed methods and receives parsed data or
// a thrown ApiError. Ported from the Godot F0 (autoload/api_client.gd): auth attach,
// ONE silent refresh on 401, backoff on NETWORK/5xx, Zod-validated bodies.
import type { z } from "zod";
import { appConfig, CLIENT_VERSION } from "@/framework/config/appConfig";
import { ApiError, parseEnvelope } from "./errors";
import {
  RegistryModules,
  LevelResponse,
  ActivityPublic,
  SubmitResponse,
  BadgesResponse,
  ProfileResponse,
  type SubmitRequest,
} from "./schemas";

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

  // ── Schema-validated request ────────────────────────────────────────────────

  private async request<S extends z.ZodTypeAny>(
    method: string,
    path: string,
    schema: S,
    body?: unknown,
  ): Promise<z.output<S>> {
    const raw = await this.perform(method, path, body);
    const parsed = schema.safeParse(raw);
    if (parsed.success) return parsed.data;
    throw new ApiError("BAD_RESPONSE", "Unexpected response from the server.");
  }

  // ── Core request with auth + retry/refresh policy (returns raw JSON body) ────

  private async perform(
    method: string,
    path: string,
    body?: unknown,
    allowRefresh = true,
  ): Promise<unknown> {
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
        });
      } catch {
        if (attempt < MAX_RETRIES) {
          attempt += 1;
          this.opts.onRetryToast?.("Reconnecting…");
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
        if (fresh) return this.perform(method, path, body, false);
        this.opts.onSessionLost?.("token_expired");
        throw err;
      }

      // Transient server errors back off and retry (submits are idempotent).
      if (err.code === "SERVER_ERROR" && attempt < MAX_RETRIES) {
        attempt += 1;
        this.opts.onRetryToast?.("Reconnecting…");
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
