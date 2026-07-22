// ErrorEnvelope — pure normalization of backend error bodies into an ApiError.
// Ported as a concept from the Godot F0 (core/error_envelope.gd). Zero runtime
// dependencies so it is trivially unit-testable (PRD §18).
//
// Collapses the backend's two envelope shapes into one:
//   • flat legacy:   {"error": "message"}
//   • structured:    {"error": {"code","message","redirectUrl"?}}  (live Cloud Run)
// so callers are written once. Auth is STATUS-DRIVEN: ANY 401 → INVALID_TOKEN,
// whatever label the body carries, so the single silent-refresh path fires
// uniformly (the live backend sends {"error":{"code":"UNAUTHENTICATED",...}}).

export type ApiErrorCode =
  | 'INVALID_TOKEN'
  | 'BAD_REQUEST'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'SERVER_ERROR'
  | 'HTTP_ERROR'
  | 'NETWORK';

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly redirectUrl: string;

  constructor(code: string, message: string, status: number, redirectUrl = '') {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.redirectUrl = redirectUrl;
  }
}

export function codeForStatus(status: number): ApiErrorCode {
  switch (status) {
    case 400:
      return 'BAD_REQUEST';
    case 401:
      return 'INVALID_TOKEN';
    case 403:
      return 'FORBIDDEN';
    case 404:
      return 'NOT_FOUND';
    default:
      return status >= 500 ? 'SERVER_ERROR' : 'HTTP_ERROR';
  }
}

export function defaultMessageFor(status: number): string {
  switch (status) {
    case 401:
      return 'Your session expired.';
    case 403:
      return "You don't have access to that.";
    case 404:
      return 'Not found.';
    default:
      return status >= 500
        ? "The city's services are having a moment. Retrying…"
        : `Something went wrong (${status}).`;
  }
}

/**
 * Normalize an error response into an ApiError.
 * @param status HTTP status code.
 * @param body   Parsed JSON body (object), a raw string, or null.
 */
export function parseErrorEnvelope(status: number, body: unknown): ApiError {
  let code: string = codeForStatus(status);
  let message = defaultMessageFor(status);
  let redirect = '';

  if (body && typeof body === 'object' && 'error' in body) {
    const errField = (body as { error: unknown }).error;
    if (typeof errField === 'string') {
      message = errField; // flat envelope
    } else if (errField && typeof errField === 'object') {
      const e = errField as { code?: unknown; message?: unknown; redirectUrl?: unknown };
      if (typeof e.code === 'string') code = e.code;
      if (typeof e.message === 'string') message = e.message;
      if (typeof e.redirectUrl === 'string') redirect = e.redirectUrl;
    }
  }

  // Status-driven auth: any 401 means "authenticate again", whatever the body
  // labeled it (live sends UNAUTHENTICATED; older builds a flat string).
  if (status === 401) code = 'INVALID_TOKEN';

  return new ApiError(code, message, status, redirect);
}
