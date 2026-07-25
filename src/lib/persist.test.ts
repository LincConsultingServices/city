import { describe, it, expect, afterEach, vi } from "vitest";
import { loadJson, saveJson } from "./persist";

const isStringArray = (v: unknown): v is string[] =>
  Array.isArray(v) && v.every((x) => typeof x === "string");

afterEach(() => {
  window.localStorage.clear();
  vi.restoreAllMocks();
});

describe("persist", () => {
  it("round-trips a value", () => {
    saveJson("city.test", ["a", "b"]);
    expect(loadJson("city.test", isStringArray)).toEqual(["a", "b"]);
  });

  it("returns null for a missing key", () => {
    expect(loadJson("city.missing", isStringArray)).toBeNull();
  });

  it("returns null for corrupt JSON", () => {
    window.localStorage.setItem("city.bad", "{not json");
    expect(loadJson("city.bad", isStringArray)).toBeNull();
  });

  it("returns null when the guard rejects the shape", () => {
    window.localStorage.setItem("city.wrong", JSON.stringify({ a: 1 }));
    expect(loadJson("city.wrong", isStringArray)).toBeNull();
  });

  it("survives a throwing storage (private mode)", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("denied");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("denied");
    });
    expect(loadJson("city.test", isStringArray)).toBeNull();
    expect(() => saveJson("city.test", ["x"])).not.toThrow();
  });
});
