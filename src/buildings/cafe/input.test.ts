import { describe, it, expect } from "vitest";
import { INTERACT_KEYS, wantsCancel, wantsInteract } from "./input";

describe("what the room listens to", () => {
  it("acts on E, e and Enter", () => {
    for (const key of INTERACT_KEYS) {
      expect(wantsInteract({ key }, false), `${key} should act`).toBe(true);
    }
  });

  it("ignores every other key", () => {
    for (const key of ["w", "a", "s", "d", "q", " ", "f", "Tab", "ArrowUp"]) {
      expect(wantsInteract({ key }, false), `${key} should not act`).toBe(false);
    }
  });

  it("ignores E while a panel is up", () => {
    expect(wantsInteract({ key: "e" }, true)).toBe(false);
  });
});

/**
 * The guard that was missing. A gate is the one action in the room that opens no
 * panel and therefore sets no lock, so nothing downstream would have stopped an
 * auto-repeat: holding E beside the counter flap lifted and lowered it several
 * times a second for as long as the key was down.
 */
describe("a held key", () => {
  it("does not act on the repeats", () => {
    expect(wantsInteract({ key: "e", repeat: false }, false)).toBe(true);
    expect(wantsInteract({ key: "e", repeat: true }, false)).toBe(false);
    expect(wantsInteract({ key: "Enter", repeat: true }, false)).toBe(false);
  });

  it("does not unwind the room one layer per repeat", () => {
    // Otherwise holding Escape closes the dialogue, then the panel, then walks
    // you out of the building, inside a second and without a second decision.
    expect(wantsCancel({ key: "Escape", repeat: false })).toBe(true);
    expect(wantsCancel({ key: "Escape", repeat: true })).toBe(false);
  });

  it("cancels regardless of the lock, because the lock is why you pressed it", () => {
    expect(wantsCancel({ key: "Escape" })).toBe(true);
  });
});
