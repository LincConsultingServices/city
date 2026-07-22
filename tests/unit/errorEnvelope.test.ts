import { describe, it, expect } from 'vitest';
import { parseErrorEnvelope } from '@/framework/api/errorEnvelope';

describe('parseErrorEnvelope', () => {
  it('normalizes the flat legacy envelope', () => {
    const e = parseErrorEnvelope(400, { error: 'bad thing' });
    expect(e.code).toBe('BAD_REQUEST');
    expect(e.message).toBe('bad thing');
    expect(e.status).toBe(400);
  });

  it('normalizes the structured envelope (code + message + redirectUrl)', () => {
    const e = parseErrorEnvelope(403, {
      error: { code: 'FORBIDDEN', message: 'nope', redirectUrl: '/x' },
    });
    expect(e.code).toBe('FORBIDDEN');
    expect(e.message).toBe('nope');
    expect(e.redirectUrl).toBe('/x');
  });

  it('treats ANY 401 as INVALID_TOKEN regardless of body (live UNAUTHENTICATED)', () => {
    const structured = parseErrorEnvelope(401, {
      error: { code: 'UNAUTHENTICATED', message: 'Missing or malformed token' },
    });
    expect(structured.code).toBe('INVALID_TOKEN');

    const flat = parseErrorEnvelope(401, { error: 'nope' });
    expect(flat.code).toBe('INVALID_TOKEN');
  });

  it('falls back to a default message for empty / opaque bodies', () => {
    const e = parseErrorEnvelope(500, null);
    expect(e.code).toBe('SERVER_ERROR');
    expect(e.message).toMatch(/moment/i);
  });

  it('handles a raw string body without throwing', () => {
    const e = parseErrorEnvelope(404, 'Not Found');
    expect(e.code).toBe('NOT_FOUND');
  });
});
