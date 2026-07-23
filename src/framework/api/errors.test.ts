import { describe, it, expect } from "vitest";
import { parseEnvelope } from "./errors";

describe("error envelope", () => {
  it("flat 401 → INVALID_TOKEN, message surfaced", () => {
    const e = parseEnvelope(401, { error: "Invalid or expired token" });
    expect(e.code).toBe("INVALID_TOKEN");
    expect(e.message).toBe("Invalid or expired token");
  });

  it("404 → NOT_FOUND", () => {
    expect(parseEnvelope(404, { error: "activity not found" }).code).toBe("NOT_FOUND");
  });

  it("500 → SERVER_ERROR", () => {
    expect(parseEnvelope(500, { error: "internal error" }).code).toBe("SERVER_ERROR");
  });

  it("structured envelope code overrides status (403 NOT_REGISTERED)", () => {
    const e = parseEnvelope(403, {
      error: { code: "NOT_REGISTERED", message: "no account", redirectUrl: "https://reg" },
    });
    expect(e.code).toBe("NOT_REGISTERED");
    expect(e.redirectUrl).toBe("https://reg");
  });

  it("LIVE 401 (structured UNAUTHENTICATED) still → INVALID_TOKEN, message preserved", () => {
    // Verified against Cloud Run in the Godot F0: the live 401 body is
    // {"error":{"code":"UNAUTHENTICATED","message":"Missing or malformed token"}}.
    const e = parseEnvelope(401, {
      error: { code: "UNAUTHENTICATED", message: "Missing or malformed token" },
    });
    expect(e.code).toBe("INVALID_TOKEN");
    expect(e.message).toBe("Missing or malformed token");
    expect(e.isAuthError()).toBe(true);
  });

  it("economy error code is surfaced (403 INSUFFICIENT_FUNDS)", () => {
    const e = parseEnvelope(403, { error: { code: "INSUFFICIENT_FUNDS", message: "too poor" } });
    expect(e.code).toBe("INSUFFICIENT_FUNDS");
  });
});
