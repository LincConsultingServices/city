// ApiClient — the ONLY thing in the app that touches fetch, status codes, or
// JSON envelopes (PRD §7.3, §12.2). Everyone else calls typed methods that
// return validated data or throw a normalized ApiError. Ported as a concept
// from the Godot F0 (autoload/api_client.gd).
//
// Auth policy (PRD §8.3, §10): on 401 INVALID_TOKEN do ONE silent Firebase
// token refresh and retry; failing that announce session_lost. NETWORK / 5xx
// back off (0.5→4s) and retry a few times. Every 2xx body is Zod-parsed.

import { z } from 'zod';
import { apiUrl, appConfig } from '@/config/appConfig';
import { events } from '@/framework/events';
import { ApiError, parseErrorEnvelope } from './errorEnvelope';
import {
  ActivitySchema,
  BadgesResponseSchema,
  LevelSchema,
  ModulesResponseSchema,
  ProfileSchema,
  ProgressListSchema,
  SubmitResponseSchema,
  type SubmitRequest,
} from './schemas';

const REQUEST_TIMEOUT = 20_000;
const MAX_RETRIES = 2;
const BASE_BACKOFF = 500;
const MAX_BACKOFF = 4_000;

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

// ── Token provider injection (breaks the client↔auth cycle) ──────────────────
export interface TokenProvider {
  getToken: () => Promise<string | null>;
  refreshToken: () => Promise<string | null>;
}

let tokenProvider: TokenProvider = {
  getToken: async () => null,
  refreshToken: async () => null,
};

export function setTokenProvider(tp: TokenProvider): void {
  tokenProvider = tp;
}

// ── Internals ────────────────────────────────────────────────────────────────
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const backoff = (attempt: number) => Math.min(BASE_BACKOFF * 2 ** (attempt - 1), MAX_BACKOFF);

function safeJson(text: string): unknown {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text; // let the envelope parser fall back to a default message
  }
}

async function httpOnce(
  method: HttpMethod,
  url: string,
  headers: Record<string, string>,
  body?: string,
): Promise<{ status: number; text: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
  try {
    const res = await fetch(url, { method, headers, body, signal: controller.signal });
    const text = await res.text();
    return { status: res.status, text };
  } catch {
    throw new ApiError('NETWORK', 'Network request failed. Check your connection.', 0);
  } finally {
    clearTimeout(timer);
  }
}

async function authedJson<T>(
  method: HttpMethod,
  path: string,
  // Input param is `any` so T binds to the PARSED (output) type even for schemas
  // with .default()/.passthrough() (whose input and output types differ).
  schema: z.ZodType<T, z.ZodTypeDef, any>,
  body?: unknown,
): Promise<T> {
  // Dev-mock mode: serve local fixtures with no network/credentials. The mock is
  // a dynamic import so it never lands in a real build (VITE_CITY_MOCK_AUTH off).
  if (appConfig.mockAuth) {
    const { mockRequest } = await import('./mock');
    return schema.parse(await mockRequest(method, path, body));
  }

  let allowRefresh = true;
  let attempt = 0;

  for (;;) {
    const token = await tokenProvider.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
    if (token) headers.Authorization = `Bearer ${token}`;

    let res: { status: number; text: string };
    try {
      res = await httpOnce(method, apiUrl(path), headers, body ? JSON.stringify(body) : undefined);
    } catch (netErr) {
      if (attempt < MAX_RETRIES) {
        attempt += 1;
        events.emit('toast_requested', { message: 'Reconnecting…', level: 'info' });
        await sleep(backoff(attempt));
        continue;
      }
      throw netErr;
    }

    if (res.status >= 200 && res.status < 300) {
      return schema.parse(safeJson(res.text));
    }

    const err = parseErrorEnvelope(res.status, safeJson(res.text));

    if (err.code === 'INVALID_TOKEN' && allowRefresh) {
      allowRefresh = false;
      const fresh = await tokenProvider.refreshToken();
      if (fresh) continue; // retry once with the fresh token
      events.emit('session_lost', { reason: 'token_expired' });
      throw err;
    }

    if (err.code === 'SERVER_ERROR' && attempt < MAX_RETRIES) {
      attempt += 1;
      events.emit('toast_requested', { message: 'Reconnecting…', level: 'info' });
      await sleep(backoff(attempt));
      continue;
    }

    throw err;
  }
}

// ── Typed backend surface (frozen in F0; most land in use at F1) ─────────────
const passthrough = z.object({}).passthrough();

export const api = {
  /** F0 bootstrap: the first authed call that exists (no /me yet, PRD §10). */
  getModules: () => authedJson('GET', '/api/v1/registry/modules', ModulesResponseSchema),
  getLevel: (comp: string, level: string) =>
    authedJson('GET', `/api/v1/registry/${comp}/${level}`, LevelSchema),
  getActivity: (id: string) => authedJson('GET', `/api/v1/registry/activity/${id}`, ActivitySchema),
  getProgress: () => authedJson('GET', '/api/v1/progress', ProgressListSchema),
  getBadges: () => authedJson('GET', '/api/v1/badges', BadgesResponseSchema),
  getProfile: () => authedJson('GET', '/api/v1/profile', ProfileSchema),

  // The activity loop (used from F1).
  startActivity: (id: string) => authedJson('POST', `/api/v1/progress/${id}/start`, passthrough),
  getState: (id: string) => authedJson('GET', `/api/v1/progress/${id}/state`, passthrough),
  putState: (id: string, blob: unknown) =>
    authedJson('PUT', `/api/v1/progress/${id}/state`, passthrough, blob),
  submit: (id: string, req: SubmitRequest) =>
    authedJson('POST', `/api/v1/progress/${id}/submit`, SubmitResponseSchema, req),
};
