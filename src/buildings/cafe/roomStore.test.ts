import { describe, it, expect, beforeEach } from "vitest";
import { START_STAGE } from "./journey";
import { OPENING_WORLD } from "./world";
import {
  INVITATION,
  acceptStage,
  awaitsHost,
  invite,
  resetRoomState,
  stopSpeaking,
  useRoomStore,
} from "./roomStore";

beforeEach(() => resetRoomState({ ...OPENING_WORLD }));

describe("the interview waits for you", () => {
  it("holds the interview until it has been accepted on this visit", () => {
    expect(awaitsHost(START_STAGE, null)).toBe(true);
    expect(awaitsHost(START_STAGE, START_STAGE)).toBe(false);
  });

  it("does not hold any other stage", () => {
    expect(awaitsHost("cafe.l1", null)).toBe(false);
    expect(awaitsHost("cafe.gate1", null)).toBe(false);
  });

  it("asks rather than chats, and saying not yet leaves it waiting", () => {
    invite("owen");
    expect(useRoomStore.getState().speakingToId).toBe("owen");
    expect(useRoomStore.getState().spokenLine).toBe(INVITATION);

    stopSpeaking();
    const s = useRoomStore.getState();
    expect(s.speakingToId).toBeNull();
    expect(awaitsHost(START_STAGE, s.acceptedStageId)).toBe(true);
  });

  it("opens the interview on yes and hands the room back", () => {
    invite("owen");
    acceptStage(START_STAGE);
    const s = useRoomStore.getState();
    expect(s.speakingToId).toBeNull();
    expect(s.inputLocked).toBe(false);
    expect(awaitsHost(START_STAGE, s.acceptedStageId)).toBe(false);
  });

  it("waits again on the next visit", () => {
    acceptStage(START_STAGE);
    resetRoomState({ ...OPENING_WORLD });
    expect(awaitsHost(START_STAGE, useRoomStore.getState().acceptedStageId)).toBe(true);
  });
});
