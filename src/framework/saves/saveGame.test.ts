import { describe, it, expect, vi, beforeEach } from "vitest";

let cafe: unknown = null;
vi.mock("@/framework/session/sync", () => ({
  readSession: (id: string) => (id === "cafe" ? cafe : null),
  sessionOwner: () => "u1",
}));
vi.mock("@/framework/api", () => ({ api: {} }));

const { storyLabel } = await import("./saveGame");
const { useBankStore } = await import("@/framework/bank/bankStore");

describe("what a save slot says about the story", () => {
  beforeEach(() => {
    cafe = null;
    localStorage.clear();
    useBankStore.setState({ account: null });
  });

  it("starts at the start", () => {
    expect(storyLabel()).toBe("The start of the game");
  });

  it("names the café stage and the role", () => {
    cafe = { stageId: "cafe.l1", role: "employee" };
    expect(storyLabel()).toMatch(/^Café · .+ · The Counter$/);
  });

  it("moves on to the bank once the café is finished", () => {
    cafe = { stageId: "cafe.exit", role: "ceo" };
    expect(storyLabel()).toBe("Café finished · on to the bank");
    useBankStore.setState({ account: { balance: 0 } as never });
    expect(storyLabel()).toBe("Meridian Bank · account open");
  });

  it("knows a player who walked out at a gate", () => {
    cafe = { stageId: "cafe.exit", role: "employee" };
    expect(storyLabel()).toBe("Left the café");
  });

  it("adds MAISON when a season is under way", () => {
    localStorage.setItem("city.maison.v1", JSON.stringify({ decided: [{}, {}] }));
    expect(storyLabel()).toBe("MAISON · 2 beats");
  });
});
