import { describe, it, expect, beforeEach, vi } from "vitest";

const put = vi.fn();
vi.mock("@/framework/api", () => ({
  api: {
    putBuildingState: (...a: unknown[]) => put(...a),
    getBuildingState: vi.fn().mockRejectedValue(new Error("offline")),
    getBeaconToken: vi.fn().mockRejectedValue(new Error("offline")),
  },
}));

import { readSession, resetSessionSync, writeSessionNow } from "@/framework/session/sync";
import { STORAGE_KEY as MAISON_KEY } from "@/buildings/fashion_brand/maisonStore";
import {
  deleteManualSave,
  loadManualSave,
  readManualSave,
  restartGame,
  writeManualSave,
} from "./manualSave";

const ok = (rev: number) => ({ ok: true, rev, updatedAt: new Date().toISOString() });
const season = (n: number) => ({
  track: "A",
  decided: Array.from({ length: n }, (_, i) => ({ id: `b${i}`, path: [] })),
});

beforeEach(() => {
  localStorage.clear();
  resetSessionSync();
  put.mockReset();
  let rev = 0;
  put.mockImplementation(async () => ok(++rev));
});

describe("the manual save", () => {
  it("is empty until the player saves", () => {
    expect(readManualSave()).toBeNull();
  });

  it("keeps every building's progress and the MAISON season", () => {
    writeSessionNow("cafe", { stageId: "cafe.l1", role: "employee" });
    localStorage.setItem(MAISON_KEY, JSON.stringify(season(3)));

    const save = writeManualSave(new Date("2026-10-18T10:00:00Z"));
    expect(save.sessions.cafe).toEqual({ stageId: "cafe.l1", role: "employee" });
    expect(save.maison).toEqual(season(3));
    expect(readManualSave()).toEqual(save);
  });

  it("replaces the earlier save when saved again", () => {
    writeSessionNow("cafe", { stageId: "cafe.interview" });
    writeManualSave();
    writeSessionNow("cafe", { stageId: "cafe.l1" });
    writeManualSave();
    expect(readManualSave()!.sessions.cafe).toEqual({ stageId: "cafe.l1" });
  });

  it("deletes without touching the game", () => {
    writeSessionNow("cafe", { stageId: "cafe.l1" });
    writeManualSave();
    deleteManualSave();
    expect(readManualSave()).toBeNull();
    expect(readSession("cafe")).toEqual({ stageId: "cafe.l1" });
  });
});

describe("loading it", () => {
  it("puts every building back where the save left it, and tells the account", async () => {
    writeSessionNow("cafe", { stageId: "cafe.interview" });
    localStorage.setItem(MAISON_KEY, JSON.stringify(season(1)));
    const save = writeManualSave();

    // Play on past the save.
    writeSessionNow("cafe", { stageId: "cafe.l2" });
    localStorage.setItem(MAISON_KEY, JSON.stringify(season(5)));
    put.mockClear();

    expect(await loadManualSave(save)).toBe(true);
    expect(readSession("cafe")).toEqual({ stageId: "cafe.interview" });
    expect(JSON.parse(localStorage.getItem(MAISON_KEY)!)).toEqual(season(1));
    expect(put).toHaveBeenCalledWith(
      "cafe",
      expect.any(Number),
      { stageId: "cafe.interview" },
      undefined,
    );
  });

  it("resets a building that was started only after the save", async () => {
    const save = writeManualSave(); // nothing started yet
    writeSessionNow("cafe", { stageId: "cafe.l1" });
    localStorage.setItem(MAISON_KEY, JSON.stringify(season(2)));

    await loadManualSave(save);
    expect(readSession("cafe")).toBeNull();
    expect(localStorage.getItem(MAISON_KEY)).toBeNull();
  });

  it("still loads on this device when the account cannot be reached", async () => {
    writeSessionNow("cafe", { stageId: "cafe.interview" });
    const save = writeManualSave();
    writeSessionNow("cafe", { stageId: "cafe.l1" });
    put.mockRejectedValue(new Error("offline"));

    expect(await loadManualSave(save)).toBe(false);
    expect(readSession("cafe")).toEqual({ stageId: "cafe.interview" });
  });
});

describe("restarting", () => {
  it("clears every building and the MAISON season, and keeps the manual save", async () => {
    writeSessionNow("cafe", { stageId: "cafe.l2" });
    localStorage.setItem(MAISON_KEY, JSON.stringify(season(4)));
    const save = writeManualSave();

    expect(await restartGame()).toBe(true);
    expect(readSession("cafe")).toBeNull();
    expect(localStorage.getItem(MAISON_KEY)).toBeNull();
    expect(readManualSave()).toEqual(save);
  });

  it("never touches the level choice or the audio settings", async () => {
    localStorage.setItem("city.track", JSON.stringify("SCA"));
    localStorage.setItem("city.audio.v1", JSON.stringify({ enabled: true }));
    writeSessionNow("cafe", { stageId: "cafe.l1" });

    await restartGame();
    expect(localStorage.getItem("city.track")).toBe(JSON.stringify("SCA"));
    expect(localStorage.getItem("city.audio.v1")).toBe(JSON.stringify({ enabled: true }));
  });
});
