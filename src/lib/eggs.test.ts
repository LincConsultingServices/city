import { describe, it, expect } from "vitest";
import { EGGS, EGG_COUNT, KONAMI, konamiStep, isEggIdArray } from "./eggs";

describe("egg registry", () => {
  it("counts every egg and gives each a title and hint", () => {
    expect(EGG_COUNT).toBe(6);
    for (const egg of Object.values(EGGS)) {
      expect(egg.title.length).toBeGreaterThan(0);
      expect(egg.hint.length).toBeGreaterThan(0);
    }
  });

  it("guards persisted arrays", () => {
    expect(isEggIdArray([])).toBe(true);
    expect(isEggIdArray(["konami", "wishmaker"])).toBe(true);
    expect(isEggIdArray(["konami", "nope"])).toBe(false);
    expect(isEggIdArray("konami")).toBe(false);
    expect(isEggIdArray([42])).toBe(false);
    expect(isEggIdArray(null)).toBe(false);
  });
});

describe("konamiStep", () => {
  it("matches the full sequence", () => {
    let p = 0;
    for (const key of KONAMI) p = konamiStep(p, key);
    expect(p).toBe(KONAMI.length);
  });

  it("resets on a wrong key", () => {
    let p = 0;
    p = konamiStep(p, "arrowup");
    p = konamiStep(p, "arrowup");
    p = konamiStep(p, "x");
    expect(p).toBe(0);
  });

  it("keeps the longest matching prefix on repeated ↑ (↑↑↑ stays at 2)", () => {
    let p = 0;
    p = konamiStep(p, "arrowup");
    p = konamiStep(p, "arrowup");
    p = konamiStep(p, "arrowup");
    expect(p).toBe(2);
  });

  it("falls back to a 1-length prefix when the mismatch key restarts the code", () => {
    let p = 0;
    for (const key of ["arrowup", "arrowup", "arrowdown", "arrowdown", "arrowleft"]) {
      p = konamiStep(p, key);
    }
    expect(p).toBe(5);
    p = konamiStep(p, "arrowup"); // wrong (expects arrowright), but starts the code over
    expect(p).toBe(1);
  });

  it("can complete immediately after a fallback", () => {
    let p = 0;
    p = konamiStep(p, "arrowup"); // 1
    p = konamiStep(p, "arrowup"); // 2
    p = konamiStep(p, "arrowup"); // repeated — still 2
    for (const key of KONAMI.slice(2)) p = konamiStep(p, key);
    expect(p).toBe(KONAMI.length);
  });
});
