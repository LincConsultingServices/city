import { describe, it, expect, vi, beforeEach } from "vitest";

let blob: unknown = null;
vi.mock("@/framework/session/sync", () => ({
  readSession: (id: string) => (id === "cafe" ? blob : null),
}));

const { cafeFinished, currentObjective, isObjectiveVenue } = await import("./firstMission");
const { useBankStore } = await import("@/framework/bank/bankStore");

const account = {
  accountNumber: "4012345678",
  type: "savings" as const,
  holder: "Asha Rao",
  signature: "A. Rao",
  balance: 0,
  openedAt: "2026-11-17T10:00:00Z",
  monthsSettled: 0,
  chequeLeaves: 0,
  salaryToAccount: false,
};
const line = (kind: string) => ({
  id: kind,
  kind,
  channel: "counter",
  amount: 0,
  balanceAfter: 0,
  note: "",
  at: "",
});

describe("the city's one objective", () => {
  beforeEach(() => {
    blob = null;
    useBankStore.setState({ loaded: false, account: null, statement: [] });
  });

  it("sends a new player to the Café", () => {
    expect(currentObjective()?.venueId).toBe("cafe");
    expect(currentObjective()?.label).toBe("First thing");
  });

  it("goes quiet once the interview has started", () => {
    blob = { stageId: "cafe.interview", index: 1, role: "candidate" };
    expect(currentObjective()).toBeNull();
    blob = { stageId: "cafe.l2", index: 0, role: "branch_manager" };
    expect(currentObjective()).toBeNull();
  });

  it("points at the bank once the Café career is finished", () => {
    blob = { stageId: "cafe.exit", index: 0, role: "ceo" };
    expect(cafeFinished()).toBe(true);
    expect(currentObjective()?.venueId).toBe("bank");
    expect(currentObjective()?.line).toMatch(/open an account/i);
    expect(isObjectiveVenue("bank")).toBe(true);
  });

  it("does not count walking out at a gate as finishing", () => {
    blob = { stageId: "cafe.exit", index: 0, role: "employee" };
    expect(cafeFinished()).toBe(false);
    expect(currentObjective()).toBeNull();
  });

  it("moves on with the bank: open an account, then deposit, then nothing", () => {
    blob = { stageId: "cafe.exit", index: 0, role: "ceo" };

    useBankStore.setState({ loaded: true, account: null, statement: [] });
    expect(currentObjective()?.line).toMatch(/open an account/i);

    useBankStore.setState({ account, statement: [line("open")] });
    expect(currentObjective()?.line).toMatch(/deposit your cash at window 1/i);
    expect(currentObjective()?.venueId).toBe("bank");

    useBankStore.setState({ statement: [line("deposit"), line("open")] });
    expect(currentObjective()).toBeNull();
  });
});
