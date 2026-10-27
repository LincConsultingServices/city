import { describe, it, expect, beforeEach } from "vitest";
import { START_STAGE, STAGES, stageById } from "./journey";
import { OPENING_WORLD } from "./world";
import {
  INVITATION,
  acceptStage,
  awaitsHost,
  briefStage,
  invitationFor,
  invite,
  needsBriefing,
  readyAtStation,
  stageAwaitsHost,
  startsAtStation,
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

  it("holds every stage somebody runs, and nothing else", () => {
    // Each host-run stage waits for you to go to that person…
    // …and so does the succession, which nobody hosts: it waits for you at the table.
    for (const id of [
      "cafe.l1",
      "cafe.review1",
      "cafe.l2",
      "cafe.review2",
      "cafe.l3",
      "cafe.succession",
    ]) {
      expect(awaitsHost(id, null), `${id} should wait`).toBe(true);
      expect(awaitsHost(id, id), `${id} should open once accepted`).toBe(false);
    }
    // …while a gate is the host's answer, already in front of you, and the
    // door is the end of it.
    for (const id of ["cafe.gate1", "cafe.gate2", "cafe.gate3", "cafe.exit"]) {
      expect(awaitsHost(id, null), `${id} should not wait`).toBe(false);
    }
  });

  it("starts the shifts at the billing counter, after Priya", () => {
    const l1 = stageById("cafe.l1")!;
    expect(stageAwaitsHost(l1)).toBe(true);
    expect(l1.hostNpc).toBe("priya");
    expect(l1.station).toBe("st_till");
  });

  it("has every waiting stage's host say something of their own", () => {
    for (const s of STAGES.filter(stageAwaitsHost)) {
      const inv = invitationFor(s.id);
      expect(inv.line, `${s.id} uses the fallback line`).not.toBe("Ready when you are.");
      expect(inv.accept.length).toBeGreaterThan(0);
    }
  });

  it("asks for the stage that is actually waiting", () => {
    invite("priya", "cafe.l1");
    expect(useRoomStore.getState().speakingToId).toBe("priya");
    expect(useRoomStore.getState().spokenLine).toBe(invitationFor("cafe.l1").brief!.line);
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

describe("a shift starts at the counter, after Priya's briefing", () => {
  it("is a shift that starts at its station; interviews and reviews start with the host", () => {
    for (const id of ["cafe.l1", "cafe.l2", "cafe.l3"]) {
      expect(startsAtStation(stageById(id))).toBe(true);
    }
    for (const id of [START_STAGE, "cafe.review1", "cafe.review2"]) {
      expect(startsAtStation(stageById(id))).toBe(false);
    }
  });

  it("gives every hosted shift a briefing of its own", () => {
    for (const s of STAGES.filter(startsAtStation).filter((x) => x.hostNpc !== null)) {
      expect(invitationFor(s.id).brief, `${s.id} has no briefing`).toBeDefined();
    }
  });

  it("does not start the shift when Priya has briefed you", () => {
    invite("priya", "cafe.l1");
    expect(needsBriefing("cafe.l1", useRoomStore.getState().briefedStageId)).toBe(true);

    briefStage("cafe.l1");
    const s = useRoomStore.getState();
    expect(s.speakingToId).toBeNull();
    expect(needsBriefing("cafe.l1", s.briefedStageId)).toBe(false);
    // Still waiting — for you, at the counter.
    expect(awaitsHost("cafe.l1", s.acceptedStageId)).toBe(true);
    expect(readyAtStation("cafe.l1", s.acceptedStageId, s.briefedStageId)).toBe(true);
  });

  it("starts when you start it, and not before the briefing", () => {
    expect(readyAtStation("cafe.l1", null, null)).toBe(false);
    briefStage("cafe.l1");
    acceptStage("cafe.l1");
    const s = useRoomStore.getState();
    expect(awaitsHost("cafe.l1", s.acceptedStageId)).toBe(false);
    expect(readyAtStation("cafe.l1", s.acceptedStageId, s.briefedStageId)).toBe(false);
  });

  it("keeps the briefing across nothing: a new visit briefs you again", () => {
    briefStage("cafe.l1");
    resetRoomState({ ...OPENING_WORLD });
    expect(needsBriefing("cafe.l1", useRoomStore.getState().briefedStageId)).toBe(true);
  });
});

describe("choosing a successor waits for you at the table", () => {
  it("needs no briefing, and is ready the moment it is current", () => {
    expect(startsAtStation(stageById("cafe.succession"))).toBe(true);
    expect(needsBriefing("cafe.succession", null)).toBe(false);
    expect(readyAtStation("cafe.succession", null, null)).toBe(true);
    expect(readyAtStation("cafe.succession", "cafe.succession", null)).toBe(false);
  });

  it("lifts the flap for a shift behind the counter, and not for the table", () => {
    briefStage("cafe.l2");
    expect(useRoomStore.getState().flapOpen).toBe(true);
    resetRoomState({ ...OPENING_WORLD });
    briefStage("cafe.l3");
    expect(useRoomStore.getState().flapOpen).toBe(false);
  });
});
