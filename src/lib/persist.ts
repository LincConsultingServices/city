// Best-effort localStorage JSON persistence. Every call is wrapped in try/catch:
// private-mode/quota/SecurityError must never crash the app — a failed save just
// means the value doesn't survive a reload. Keys are namespaced "city.*".

export function loadJson<T>(key: string, guard: (v: unknown) => v is T): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return null;
    const parsed: unknown = JSON.parse(raw);
    return guard(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveJson(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable — persistence is best-effort */
  }
}
