// The single ApiClient instance the app uses, wired to the Firebase token provider.
// UI calls typed methods (or the useApi hooks) — never fetch directly (PRD §7.3).
import { ApiClient } from "./client";
import { tokenProvider } from "@/framework/auth/firebase";
import { events } from "@/framework/events";

export const api = new ApiClient(tokenProvider, {
  onSessionLost: (reason) => events.emit("session_lost", reason),
  onRetryToast: (message) => events.emit("toast", { message, kind: "info" }),
});

export { ApiError } from "./errors";
export * from "./schemas";
