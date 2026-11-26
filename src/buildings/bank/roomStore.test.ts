import { describe, it, expect, beforeEach } from "vitest";
import { calledTo, finishTicket, resetRoomState, takeTicket, tickQueue, ticketLabel, useRoomStore } from "./roomStore";

describe("the ticket queue", () => {
  beforeEach(() => resetRoomState());

  const tickUntilCalled = () => {
    for (let i = 0; i < 10 && useRoomStore.getState().queue.calledTo === null; i++) tickQueue();
  };

  it("calls a cash ticket to window 1, and labels it A", () => {
    takeTicket("cash");
    const { ticket } = useRoomStore.getState().queue;
    expect(ticketLabel(ticket!, "cash")).toMatch(/^A-0\d\d$/);
    expect(calledTo(1)).toBe(false);
    tickUntilCalled();
    expect(calledTo(1)).toBe(true);
    expect(calledTo(2)).toBe(false);
    expect(useRoomStore.getState().note.text).toMatch(/window 1/);
  });

  it("calls a cheques-and-passbooks ticket to window 2, and labels it B", () => {
    takeTicket("desk");
    tickUntilCalled();
    expect(calledTo(2)).toBe(true);
    expect(ticketLabel(useRoomStore.getState().queue.ticket!, "desk")).toMatch(/^B-/);
  });

  it("moves quickly: you are two behind", () => {
    takeTicket("cash");
    tickQueue();
    expect(calledTo(1)).toBe(false);
    tickQueue();
    expect(calledTo(1)).toBe(true);
  });

  it("is done with once you are served", () => {
    takeTicket("cash");
    tickUntilCalled();
    finishTicket();
    const q = useRoomStore.getState().queue;
    expect(q.ticket).toBeNull();
    expect(q.calledTo).toBeNull();
    // The screen keeps its number: the hall carries on.
    expect(q.serving).toBeGreaterThan(0);
  });
});
