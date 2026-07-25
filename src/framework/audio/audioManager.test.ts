import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// jsdom has no WebAudio; the manager must degrade to silence rather than throw,
// and must never make noise before the user opts in.
async function freshAudio() {
  vi.resetModules();
  return (await import("./audioManager")).audio;
}

beforeEach(() => {
  window.localStorage.clear();
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe("audioManager", () => {
  it("is muted by default — sound is opt-in", async () => {
    const audio = await freshAudio();
    expect(audio.isEnabled()).toBe(false);
  });

  it("persists the choice across reloads", async () => {
    const a1 = await freshAudio();
    a1.setEnabled(true);
    expect(a1.isEnabled()).toBe(true);

    const a2 = await freshAudio(); // simulates a fresh page load
    expect(a2.isEnabled()).toBe(true);
  });

  it("toggles and reports the new state", async () => {
    const audio = await freshAudio();
    expect(audio.toggle()).toBe(true);
    expect(audio.toggle()).toBe(false);
  });

  it("notifies subscribers and stops after unsubscribe", async () => {
    const audio = await freshAudio();
    const seen: boolean[] = [];
    const off = audio.subscribe((on) => seen.push(on));
    audio.setEnabled(true);
    audio.setEnabled(false);
    off();
    audio.setEnabled(true);
    expect(seen).toEqual([true, false]);
  });

  it("never throws when playing without WebAudio support", async () => {
    const audio = await freshAudio();
    expect(() => audio.play("ui_click")).not.toThrow();
    audio.setEnabled(true);
    expect(() => audio.play("ui_click")).not.toThrow();
    expect(() => audio.preload(["ui_click", "ui_error"])).not.toThrow();
  });

  it("does not fetch audio while muted", async () => {
    const audio = await freshAudio();
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    audio.play("ui_click");
    audio.preload(["ui_confirm"]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("survives storage that throws (private mode)", async () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("denied");
    });
    const audio = await freshAudio();
    expect(() => audio.setEnabled(true)).not.toThrow();
    expect(audio.isEnabled()).toBe(true);
  });
});
