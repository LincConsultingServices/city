// The room's one action, tested without React and without Pixi — which is the
// whole reason it moved out of Interior.tsx. While it was a closure in the
// shell, the only way to prove "the mirror does something" was to look at the
// mirror.
import { describe, it, expect, beforeEach, vi } from "vitest";
import { FURNITURE, STATIONS, stationById, stationForProp } from "./room";
import { actHere, resetRoomState, useRoomStore } from "./roomStore";
import { useMaisonStore } from "./maisonStore";

vi.mock("@/framework/audio/audioManager", () => ({
  audio: { play: vi.fn() },
}));

const standAt = (stationId: string | null) => {
  resetRoomState();
  useRoomStore.setState({ nearStationId: stationId });
};
const said = () => useRoomStore.getState().announcement.text;

describe("MAISON roomStore — acting on what is in front of you", () => {
  beforeEach(() => {
    resetRoomState();
    useMaisonStore.getState().resetSeason();
  });

  it("opens the collection at the rail, and says what is on it", () => {
    standAt("st_rail");
    expect(actHere()).toBe(true);
    expect(useRoomStore.getState().panel).toBe("rail");
    // §18.2.4: looking at the rail reaches the live region too, not only the eye.
    expect(said().length).toBeGreaterThan(0);
  });

  it("opens the mirror in the fitting alcove", () => {
    // This is the one that was a dead prompt: the station offered "look in the
    // mirror" and nothing happened.
    standAt("st_fitting");
    expect(actHere()).toBe(true);
    expect(useRoomStore.getState().panel).toBe("mirror");
  });

  it("reads the countdown off the column without opening anything", () => {
    standAt("st_column");
    expect(actHere()).toBe(true);
    expect(useRoomStore.getState().panel).toBe(null);
    expect(said()).toMatch(/column reads/i);
  });

  it("lets a waiting beat outrank the station's own readout", () => {
    // Ines is at the rail holding this week's problem. Looking at the collection
    // is not what you do when somebody is standing there waiting (§8).
    standAt("st_rail");
    useRoomStore.setState({ beatReady: true });
    expect(actHere()).toBe(true);
    expect(useRoomStore.getState().panel).toBe("beat");
  });

  it("does nothing at all while a panel is up", () => {
    standAt("st_rail");
    useRoomStore.setState({ inputLocked: true });
    expect(actHere()).toBe(false);
    expect(useRoomStore.getState().panel).toBe(null);
  });

  it("says so out in the open, rather than swallowing the keypress", () => {
    standAt(null);
    expect(actHere()).toBe(false);
    // A key that does nothing and makes no sound is indistinguishable from a
    // broken one, so the empty case is still an answer.
    expect(said().length).toBeGreaterThan(0);
  });

  it("offers no prompt it cannot honour", () => {
    // The invariant the dead mirror broke. Every station that advertises a verb
    // must do something when you take it up.
    for (const s of STATIONS) {
      if (!s.prompt) continue;
      standAt(s.id);
      expect(actHere(), `${s.id} offers "${s.prompt}" and does nothing`).toBe(true);
    }
  });

  it("leaves the room clean for the next visit", () => {
    standAt("st_rail");
    actHere();
    resetRoomState();
    const s = useRoomStore.getState();
    expect(s.panel).toBe(null);
    expect(s.beatReady).toBe(false);
    expect(s.inputLocked).toBe(false);
  });
});

describe("MAISON roomStore — what the mouse can reach", () => {
  it("points every clickable prop at a station that exists and is placed", () => {
    const placed = new Set(FURNITURE.map((f) => f.kind));
    for (const s of STATIONS) {
      if (!s.prop) continue;
      expect(placed.has(s.prop), `${s.id} clicks a ${s.prop}, which is not in the room`).toBe(true);
      expect(stationForProp(s.prop)?.id).toBe(s.id);
    }
  });

  it("gives every station you can act on something to click", () => {
    // §18.2.5 wants parity between the key and the mouse. A station reached only
    // on foot is fine; one that offers a verb but no prop is a mouse dead end.
    const noProp = STATIONS.filter((s) => s.prompt && !s.prop).map((s) => s.id);
    // The desk phone sits on the desk, so the desk's own hotspot is what you
    // click to reach it — it has no prop of its own by design.
    expect(noProp).toEqual(["st_phone"]);
    expect(stationById("st_phone")?.cell).toBeDefined();
  });
});
